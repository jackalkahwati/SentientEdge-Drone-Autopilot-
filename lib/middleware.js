const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const { verifyAccessToken, hasPermission } = require('./auth.js');
const { auditLog, AuditAction } = require('./audit.js');
const { verifyAPIKey } = require('./api-key-management.js');

/**
 * Authentication middleware - verifies JWT token
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Access denied. No valid token provided.',
      code: 'NO_TOKEN' 
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const payload = verifyAccessToken(token);

  if (!payload) {
    return res.status(401).json({ 
      error: 'Access denied. Invalid or expired token.',
      code: 'INVALID_TOKEN' 
    });
  }

  req.user = payload;
  
  // Add correlation ID for request tracking
  req.correlationId = req.headers['x-correlation-id'] || 
                     `${payload.userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  next();
}

/**
 * Authorization middleware factory - checks user permissions
 */
function authorize(permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required.',
        code: 'NO_AUTH' 
      });
    }

    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
    const userPermissions = req.user.permissions || [];
    
    // Check if user has at least one of the required permissions
    const hasRequiredPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission) || req.user?.role === 'admin'
    );

    if (!hasRequiredPermission) {
      // Log unauthorized access attempt
      auditLog({
        action: AuditAction.ACCESS_DENIED,
        userId: req.user.userId,
        resource: req.path,
        details: { 
          requiredPermissions,
          userPermissions,
          method: req.method 
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        correlationId: req.correlationId,
      });

      return res.status(403).json({ 
        error: 'Insufficient permissions for this action.',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: requiredPermissions
      });
    }

    next();
  };
}

/**
 * Role-based authorization middleware
 */
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required.',
        code: 'NO_AUTH' 
      });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      auditLog({
        action: AuditAction.ACCESS_DENIED,
        userId: req.user.userId,
        resource: req.path,
        details: { 
          requiredRoles: allowedRoles,
          userRole: req.user.role,
          method: req.method 
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        correlationId: req.correlationId,
      });

      return res.status(403).json({ 
        error: 'Insufficient role for this action.',
        code: 'INSUFFICIENT_ROLE',
        required: allowedRoles
      });
    }

    next();
  };
}

/**
 * API Key authentication middleware for drone/system integrations
 */
function authenticateAPIKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'API key required.',
      code: 'NO_API_KEY' 
    });
  }

  const keyData = verifyAPIKey(apiKey, req.ip);
  
  if (!keyData) {
    auditLog({
      action: AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT,
      userId: 'api_key_auth',
      resource: req.path,
      details: { 
        reason: 'Invalid API key',
        keyPreview: apiKey.substring(0, 8) + '****',
        method: req.method 
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: false,
    });

    return res.status(401).json({ 
      error: 'Invalid or expired API key.',
      code: 'INVALID_API_KEY' 
    });
  }

  // Set API key context for request
  req.apiKey = keyData;
  req.correlationId = req.headers['x-correlation-id'] || 
                     `api_${keyData.keyId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Audit successful API key usage
  auditLog({
    action: AuditAction.API_KEY_USED,
    userId: `api_key_${keyData.keyId}`,
    resource: req.path,
    details: { 
      keyName: keyData.name,
      keyType: keyData.type,
      droneId: keyData.droneId,
      method: req.method 
    },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    correlationId: req.correlationId,
  });

  next();
}

/**
 * Check API key permissions
 */
function requireAPIPermission(permissions) {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({ 
        error: 'API authentication required.',
        code: 'NO_API_AUTH' 
      });
    }

    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
    const apiPermissions = req.apiKey.permissions || [];
    
    // Check if API key has wildcard permission
    if (apiPermissions.includes('*')) {
      return next();
    }

    // Check if API key has at least one of the required permissions
    const hasRequiredPermission = requiredPermissions.some(permission => 
      apiPermissions.includes(permission)
    );

    if (!hasRequiredPermission) {
      auditLog({
        action: AuditAction.ACCESS_DENIED,
        userId: `api_key_${req.apiKey.keyId}`,
        resource: req.path,
        details: { 
          requiredPermissions,
          apiPermissions,
          keyName: req.apiKey.name,
          method: req.method 
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        correlationId: req.correlationId,
      });

      return res.status(403).json({ 
        error: 'Insufficient API permissions for this action.',
        code: 'INSUFFICIENT_API_PERMISSIONS',
        required: requiredPermissions
      });
    }

    next();
  };
}

/**
 * Flexible authentication middleware that accepts both JWT and API keys
 */
function authenticateFlexible(req, res, next) {
  // Check for JWT token first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticate(req, res, next);
  }

  // Check for API key
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  if (apiKey) {
    return authenticateAPIKey(req, res, next);
  }

  // No authentication provided
  return res.status(401).json({ 
    error: 'Authentication required. Provide either Bearer token or API key.',
    code: 'NO_AUTH' 
  });
}

/**
 * Rate limiting middleware
 */
const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiting for sensitive endpoints
 */
const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many requests to sensitive endpoint, please try again later.',
    code: 'STRICT_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Security headers middleware
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow for mapbox and other external resources
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * CORS configuration for secure cross-origin requests
 */
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
    
    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
  exposedHeaders: ['X-Correlation-ID'],
};

/**
 * Input validation middleware factory
 */
function validateInput(validations) {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    next();
  };
}

/**
 * Common validation schemas
 */
const validationSchemas = {
  login: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  
  register: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 12 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must be at least 12 characters with uppercase, lowercase, number, and special character'),
    body('username').isLength({ min: 3, max: 30 }).isAlphanumeric().withMessage('Username must be 3-30 alphanumeric characters'),
    body('firstName').optional().isLength({ max: 50 }).withMessage('First name must be less than 50 characters'),
    body('lastName').optional().isLength({ max: 50 }).withMessage('Last name must be less than 50 characters'),
  ],

  mission: [
    body('name').isLength({ min: 3, max: 100 }).withMessage('Mission name must be 3-100 characters'),
    body('description').isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
    body('location').isLength({ min: 2, max: 100 }).withMessage('Location must be 2-100 characters'),
    body('threatLevel').isInt({ min: 0, max: 4 }).withMessage('Threat level must be 0-4'),
    body('coordinates').optional().isArray({ min: 2, max: 2 }).withMessage('Coordinates must be [lng, lat] array'),
  ],

  droneStatus: [
    body('status').isIn(['active', 'idle', 'maintenance', 'offline']).withMessage('Invalid drone status'),
  ],
};

/**
 * Error handling middleware
 */
function errorHandler(error, req, res, next) {
  // Log error for monitoring
  console.error('API Error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.userId,
    correlationId: req.correlationId,
    timestamp: new Date().toISOString(),
  });

  // Audit log for security-related errors
  if (error.status === 401 || error.status === 403) {
    auditLog({
      action: AuditAction.SECURITY_ERROR,
      userId: req.user?.userId || 'anonymous',
      resource: req.path,
      details: { 
        error: error.message,
        status: error.status,
        method: req.method 
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      correlationId: req.correlationId,
    });
  }

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    error: isDevelopment ? error.message : 'Internal server error',
    code: error.code || 'INTERNAL_ERROR',
    correlationId: req.correlationId,
    ...(isDevelopment && { stack: error.stack })
  });
}

/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.userId,
      correlationId: req.correlationId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
    };

    // Log security-relevant requests
    if (req.path.includes('/auth') || res.statusCode >= 400) {
      console.log('Security Log:', logData);
    }

    // Audit log for sensitive operations
    if (req.method !== 'GET' && req.user) {
      auditLog({
        action: AuditAction.API_REQUEST,
        userId: req.user.userId,
        resource: req.path,
        details: {
          method: req.method,
          status: res.statusCode,
          duration
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        correlationId: req.correlationId,
      });
    }
  });

  next();
}

module.exports = {
  authenticate,
  authenticateAPIKey,
  authenticateFlexible,
  authorize,
  requireRole,
  requireAPIPermission,
  rateLimiter,
  strictRateLimiter,
  securityHeaders,
  corsOptions,
  validateInput,
  validationSchemas,
  errorHandler,
  requestLogger,
};