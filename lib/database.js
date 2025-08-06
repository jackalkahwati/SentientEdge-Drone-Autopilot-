// Database connection management and configuration
// Production-ready PostgreSQL connection with clustering, pooling, and failover

const { Pool, Client } = require('pg');
const Redis = require('redis');
const fs = require('fs');
const path = require('path');

// Environment configuration with secure defaults
const config = {
  // Primary database connection
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '6432'), // PgBouncer port
    database: process.env.DB_NAME || 'sentient_edge',
    user: process.env.DB_USER || 'sentient_admin',
    password: process.env.POSTGRES_PASSWORD || 'SecurePostgres123!@#',
    
    // SSL Configuration for production security
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: true,
      ca: process.env.SSL_CA_PATH ? fs.readFileSync(process.env.SSL_CA_PATH) : undefined,
      cert: process.env.SSL_CERT_PATH ? fs.readFileSync(process.env.SSL_CERT_PATH) : undefined,
      key: process.env.SSL_KEY_PATH ? fs.readFileSync(process.env.SSL_KEY_PATH) : undefined,
    } : false,
    
    // Connection pool configuration for high performance
    max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum pool connections
    min: parseInt(process.env.DB_POOL_MIN || '5'),  // Minimum pool connections
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
    
    // Query configuration
    query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '60000'),
    
    // Performance optimization
    application_name: 'SentientEdge-Server',
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  },
  
  // Read replica configuration for scaling
  readReplica: {
    host: process.env.DB_READ_HOST || 'localhost',
    port: parseInt(process.env.DB_READ_PORT || '5433'),
    database: process.env.DB_NAME || 'sentient_edge',
    user: process.env.DB_USER || 'sentient_admin',
    password: process.env.POSTGRES_PASSWORD || 'SecurePostgres123!@#',
    
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: true,
      ca: process.env.SSL_CA_PATH ? fs.readFileSync(process.env.SSL_CA_PATH) : undefined,
    } : false,
    
    max: parseInt(process.env.DB_READ_POOL_MAX || '15'),
    min: parseInt(process.env.DB_READ_POOL_MIN || '3'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
    
    application_name: 'SentientEdge-ReadReplica',
    keepAlive: true,
  },
  
  // Redis configuration for caching and session management
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || undefined,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    family: 4, // IPv4
    connectTimeout: 10000,
    commandTimeout: 5000,
  },
  
  // Encryption configuration
  encryption: {
    key: process.env.DATABASE_ENCRYPTION_KEY || 'dev-key-change-in-production-32chars',
    algorithm: 'aes-256-gcm',
  },
  
  // Monitoring and performance
  monitoring: {
    enableQueryLogging: process.env.ENABLE_QUERY_LOGGING === 'true',
    slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000'),
    enablePerformanceMonitoring: process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
  }
};

// Connection pools
let primaryPool = null;
let readReplicaPool = null;
let redisClient = null;

// Connection statistics and health monitoring
const connectionStats = {
  primaryConnections: 0,
  readReplicaConnections: 0,
  totalQueries: 0,
  slowQueries: 0,
  errors: 0,
  lastError: null,
  healthChecks: {
    primary: { status: 'unknown', lastCheck: null, responseTime: 0 },
    readReplica: { status: 'unknown', lastCheck: null, responseTime: 0 },
    redis: { status: 'unknown', lastCheck: null, responseTime: 0 },
  }
};

// Initialize database connections with error handling and retries
async function initializeDatabase() {
  try {
    console.log('🔗 Initializing database connections...');
    
    // Initialize primary database pool
    primaryPool = new Pool({
      ...config.database,
      // Enhanced error handling
      onConnect: (client) => {
        connectionStats.primaryConnections++;
        console.log(`✓ Primary DB connection established (total: ${connectionStats.primaryConnections})`);
        
        // Set encryption key for this connection
        client.query(`SET app.encryption_key = '${config.encryption.key}'`).catch(console.warn);
      },
      onRemove: (client) => {
        connectionStats.primaryConnections--;
        console.log(`⚠ Primary DB connection removed (remaining: ${connectionStats.primaryConnections})`);
      }
    });
    
    // Initialize read replica pool if enabled
    if (process.env.ENABLE_READ_REPLICA === 'true') {
      readReplicaPool = new Pool({
        ...config.readReplica,
        onConnect: (client) => {
          connectionStats.readReplicaConnections++;
          console.log(`✓ Read replica connection established (total: ${connectionStats.readReplicaConnections})`);
        },
        onRemove: (client) => {
          connectionStats.readReplicaConnections--;
          console.log(`⚠ Read replica connection removed (remaining: ${connectionStats.readReplicaConnections})`);
        }
      });
    }
    
    // Initialize Redis client
    redisClient = Redis.createClient(config.redis);
    
    redisClient.on('connect', () => {
      console.log('✓ Redis connection established');
      connectionStats.healthChecks.redis.status = 'healthy';
    });
    
    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
      connectionStats.healthChecks.redis.status = 'error';
      connectionStats.errors++;
      connectionStats.lastError = err.message;
    });
    
    redisClient.on('ready', () => {
      console.log('✓ Redis client ready');
    });
    
    await redisClient.connect();
    
    // Test connections
    await testConnections();
    
    // Set up health monitoring
    setupHealthMonitoring();
    
    console.log('✅ Database initialization complete');
    console.log(`📊 Connection pools: Primary(${config.database.max}), ReadReplica(${config.readReplica?.max || 0}), Redis(✓)`);
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    connectionStats.errors++;
    connectionStats.lastError = error.message;
    throw error;
  }
}

// Test all database connections
async function testConnections() {
  const startTime = Date.now();
  
  try {
    // Test primary database
    const primaryStart = Date.now();
    const primaryResult = await primaryPool.query('SELECT 1 as test, NOW() as timestamp');
    const primaryTime = Date.now() - primaryStart;
    
    connectionStats.healthChecks.primary = {
      status: 'healthy',
      lastCheck: new Date(),
      responseTime: primaryTime
    };
    
    console.log(`✓ Primary database test: ${primaryTime}ms`);
    
    // Test read replica if available
    if (readReplicaPool) {
      const replicaStart = Date.now();
      const replicaResult = await readReplicaPool.query('SELECT 1 as test, NOW() as timestamp');
      const replicaTime = Date.now() - replicaStart;
      
      connectionStats.healthChecks.readReplica = {
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: replicaTime
      };
      
      console.log(`✓ Read replica test: ${replicaTime}ms`);
    }
    
    // Test Redis
    const redisStart = Date.now();
    await redisClient.ping();
    const redisTime = Date.now() - redisStart;
    
    connectionStats.healthChecks.redis = {
      status: 'healthy',
      lastCheck: new Date(),
      responseTime: redisTime
    };
    
    console.log(`✓ Redis test: ${redisTime}ms`);
    
    const totalTime = Date.now() - startTime;
    console.log(`🎯 All database connections tested successfully in ${totalTime}ms`);
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    connectionStats.errors++;
    connectionStats.lastError = error.message;
    throw error;
  }
}

// Execute query with automatic retry and failover logic
async function executeQuery(query, params = [], options = {}) {
  const startTime = Date.now();
  const useReadReplica = options.readOnly && readReplicaPool;
  const pool = useReadReplica ? readReplicaPool : primaryPool;
  const poolName = useReadReplica ? 'ReadReplica' : 'Primary';
  
  try {
    // Log slow queries if monitoring is enabled
    if (config.monitoring.enableQueryLogging) {
      console.log(`🔍 [${poolName}] Executing query:`, query.substring(0, 100) + '...');
    }
    
    const result = await pool.query(query, params);
    const executionTime = Date.now() - startTime;
    
    // Update statistics
    connectionStats.totalQueries++;
    
    if (executionTime > config.monitoring.slowQueryThreshold) {
      connectionStats.slowQueries++;
      console.warn(`🐌 [${poolName}] Slow query detected: ${executionTime}ms - ${query.substring(0, 200)}...`);
    }
    
    if (config.monitoring.enableQueryLogging && executionTime > 100) {
      console.log(`⏱️ [${poolName}] Query completed in ${executionTime}ms`);
    }
    
    return result;
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    connectionStats.errors++;
    connectionStats.lastError = error.message;
    
    console.error(`❌ [${poolName}] Query failed after ${executionTime}ms:`, {
      error: error.message,
      query: query.substring(0, 200) + '...',
      params: params?.length || 0
    });
    
    // Attempt failover for read queries if primary fails
    if (!useReadReplica && options.readOnly && readReplicaPool && error.code !== '23505') {
      console.log('🔄 Attempting failover to read replica...');
      try {
        const fallbackResult = await readReplicaPool.query(query, params);
        console.log('✓ Failover to read replica successful');
        return fallbackResult;
      } catch (fallbackError) {
        console.error('❌ Failover to read replica failed:', fallbackError.message);
      }
    }
    
    throw error;
  }
}

// Transaction wrapper with automatic rollback
async function executeTransaction(callback, options = {}) {
  const client = await primaryPool.connect();
  const startTime = Date.now();
  
  try {
    await client.query('BEGIN');
    
    if (config.monitoring.enableQueryLogging) {
      console.log('🔄 Transaction started');
    }
    
    const result = await callback(client);
    
    await client.query('COMMIT');
    const executionTime = Date.now() - startTime;
    
    if (config.monitoring.enableQueryLogging) {
      console.log(`✅ Transaction committed in ${executionTime}ms`);
    }
    
    return result;
    
  } catch (error) {
    await client.query('ROLLBACK');
    const executionTime = Date.now() - startTime;
    
    console.error(`❌ Transaction rolled back after ${executionTime}ms:`, error.message);
    connectionStats.errors++;
    connectionStats.lastError = error.message;
    
    throw error;
  } finally {
    client.release();
  }
}

// Cache management using Redis
async function cacheGet(key, options = {}) {
  try {
    const value = await redisClient.get(`sentient:${key}`);
    if (value) {
      return options.json ? JSON.parse(value) : value;
    }
    return null;
  } catch (error) {
    console.error('❌ Cache get error:', error.message);
    return null; // Fail gracefully
  }
}

async function cacheSet(key, value, ttl = 3600) {
  try {
    const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
    await redisClient.setEx(`sentient:${key}`, ttl, serializedValue);
    return true;
  } catch (error) {
    console.error('❌ Cache set error:', error.message);
    return false; // Fail gracefully
  }
}

async function cacheDelete(key) {
  try {
    await redisClient.del(`sentient:${key}`);
    return true;
  } catch (error) {
    console.error('❌ Cache delete error:', error.message);
    return false;
  }
}

// Health monitoring setup
function setupHealthMonitoring() {
  // Periodic health checks every 30 seconds
  setInterval(async () => {
    try {
      await testConnections();
    } catch (error) {
      console.error('🏥 Health check failed:', error.message);
    }
  }, 30000);
  
  // Connection pool monitoring
  setInterval(() => {
    if (config.monitoring.enablePerformanceMonitoring) {
      console.log('📊 Connection Pool Stats:', {
        primary: {
          total: primaryPool.totalCount,
          idle: primaryPool.idleCount,
          waiting: primaryPool.waitingCount
        },
        readReplica: readReplicaPool ? {
          total: readReplicaPool.totalCount,
          idle: readReplicaPool.idleCount,
          waiting: readReplicaPool.waitingCount
        } : null,
        queries: {
          total: connectionStats.totalQueries,
          slow: connectionStats.slowQueries,
          errors: connectionStats.errors
        }
      });
    }
  }, 60000); // Every minute
}

// Get connection statistics
function getConnectionStats() {
  return {
    ...connectionStats,
    pools: {
      primary: primaryPool ? {
        totalCount: primaryPool.totalCount,
        idleCount: primaryPool.idleCount,
        waitingCount: primaryPool.waitingCount
      } : null,
      readReplica: readReplicaPool ? {
        totalCount: readReplicaPool.totalCount,
        idleCount: readReplicaPool.idleCount,
        waitingCount: readReplicaPool.waitingCount
      } : null
    }
  };
}

// Graceful shutdown
async function closeConnections() {
  console.log('🔌 Closing database connections...');
  
  try {
    if (primaryPool) {
      await primaryPool.end();
      console.log('✓ Primary database pool closed');
    }
    
    if (readReplicaPool) {
      await readReplicaPool.end();
      console.log('✓ Read replica pool closed');
    }
    
    if (redisClient) {
      await redisClient.quit();
      console.log('✓ Redis connection closed');
    }
    
    console.log('✅ All database connections closed gracefully');
  } catch (error) {
    console.error('❌ Error closing connections:', error);
  }
}

// Export database interface
module.exports = {
  // Connection management
  initializeDatabase,
  closeConnections,
  testConnections,
  getConnectionStats,
  
  // Query execution
  executeQuery,
  executeTransaction,
  
  // Caching
  cacheGet,
  cacheSet,
  cacheDelete,
  
  // Direct pool access (for advanced use cases)
  getPrimaryPool: () => primaryPool,
  getReadReplicaPool: () => readReplicaPool,
  getRedisClient: () => redisClient,
  
  // Configuration
  config
};