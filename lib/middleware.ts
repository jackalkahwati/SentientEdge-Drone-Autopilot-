import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, validationResult, ValidationChain } from 'express-validator';
import { verifyAccessToken, hasPermission, TokenPayload } from './auth';
import { auditLog, AuditAction } from './audit';

// Extend Express Request type to include user data
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      correlationId?: string;
    }
  }
}

/**
 * Authentication middleware - verifies JWT token
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
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
  req.correlationId = req.headers['x-correlation-id'] as string || 
                     `${payload.userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  next();
}

/**
 * Authorization middleware factory - checks user permissions
 */
export function authorize(permissions: string | string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
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
export function requireRole(roles: string | string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
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
 * Rate limiting middleware
 */
export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Custom key generator for authenticated users
  keyGenerator: (req: Request) => {
    return req.user?.userId || req.ip;
  },
});

/**
 * Strict rate limiting for sensitive endpoints
 */
export const strictRateLimiter = rateLimit({
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
export const securityHeaders = helmet({
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
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
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
export function validateInput(validations: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
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
export const validationSchemas = {
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
export function errorHandler(error: any, req: Request, res: Response, next: NextFunction) {
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
export function requestLogger(req: Request, res: Response, next: NextFunction) {
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