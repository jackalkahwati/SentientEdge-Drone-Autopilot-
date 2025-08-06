// Database Backup and Disaster Recovery Manager
// Automated backup system with encryption, compression, and recovery capabilities

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { promisify } = require('util');
const { executeQuery } = require('./database');

const execAsync = promisify(exec);

class BackupManager {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || path.join(__dirname, '../database/backups');
    this.encryptionKey = process.env.BACKUP_ENCRYPTION_PASSPHRASE || 'change-this-secure-passphrase';
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '30');
    this.dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '5432',
      database: process.env.DB_NAME || 'sentient_edge',
      username: process.env.DB_USER || 'sentient_admin',
      password: process.env.POSTGRES_PASSWORD || 'SecurePostgres123!@#'
    };
    
    // Backup types and schedules
    this.backupTypes = {
      full: { frequency: 'daily', retention: 30 },
      incremental: { frequency: 'hourly', retention: 7 },
      transaction_log: { frequency: 'continuous', retention: 3 }
    };
  }

  // Initialize backup system
  async initialize() {
    try {
      console.log('🔄 Initializing backup system...');
      
      // Create backup directory structure
      await this.ensureDirectories();
      
      // Validate PostgreSQL tools
      await this.validatePostgreSQLTools();
      
      // Test backup connectivity
      await this.testConnection();
      
      console.log('✅ Backup system initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Backup system initialization failed:', error);
      throw error;
    }
  }

  // Create full database backup
  async createFullBackup(options = {}) {
    try {
      const {
        compress = true,
        encrypt = true,
        includeData = true,
        excludeTables = ['telemetry.drone_telemetry'], // Exclude large tables by default
        customName = null
      } = options;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = customName || `full_backup_${timestamp}`;
      const backupPath = path.join(this.backupDir, 'full', `${backupName}.sql`);
      
      console.log(`🔄 Creating full backup: ${backupName}`);
      const startTime = Date.now();

      // Ensure backup directory exists
      await fs.mkdir(path.dirname(backupPath), { recursive: true });

      // Build pg_dump command
      const dumpArgs = [
        '--host', this.dbConfig.host,
        '--port', this.dbConfig.port,
        '--username', this.dbConfig.username,
        '--dbname', this.dbConfig.database,
        '--verbose',
        '--format=custom',
        '--no-password',
        '--create',
        '--clean'
      ];

      if (!includeData) {
        dumpArgs.push('--schema-only');
      }

      // Exclude specified tables
      excludeTables.forEach(table => {
        dumpArgs.push('--exclude-table', table);
      });

      // Set environment variables for authentication
      const env = {
        ...process.env,
        PGPASSWORD: this.dbConfig.password,
        PGHOST: this.dbConfig.host,
        PGPORT: this.dbConfig.port,
        PGUSER: this.dbConfig.username,
        PGDATABASE: this.dbConfig.database
      };

      // Execute pg_dump
      const dumpProcess = spawn('pg_dump', dumpArgs, { env });
      
      // Create processing pipeline
      let outputStream = dumpProcess.stdout;

      // Compression
      let compressedPath = backupPath;
      if (compress) {
        compressedPath = `${backupPath}.gz`;
        const gzipStream = zlib.createGzip({ level: 9 });
        outputStream = outputStream.pipe(gzipStream);
      }

      // Encryption
      let finalPath = compressedPath;
      if (encrypt) {
        finalPath = `${compressedPath}.enc`;
        const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
        outputStream = outputStream.pipe(cipher);
      }

      // Write to file
      const writeStream = require('fs').createWriteStream(finalPath);
      outputStream.pipe(writeStream);

      // Wait for completion
      await new Promise((resolve, reject) => {
        dumpProcess.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`pg_dump exited with code ${code}`));
          }
        });
        
        dumpProcess.stderr.on('data', (data) => {
          console.log(`pg_dump: ${data}`);
        });
      });

      const executionTime = Date.now() - startTime;
      const fileStats = await fs.stat(finalPath);
      
      // Record backup metadata
      const backupMetadata = {
        name: backupName,
        type: 'full',
        path: finalPath,
        size: fileStats.size,
        compressed: compress,
        encrypted: encrypt,
        includeData,
        excludedTables: excludeTables,
        executionTime,
        timestamp: new Date(),
        checksum: await this.calculateFileChecksum(finalPath)
      };

      await this.recordBackup(backupMetadata);

      console.log(`✅ Full backup completed: ${backupName}`);
      console.log(`📁 Size: ${this.formatBytes(fileStats.size)}`);
      console.log(`⏱️ Time: ${executionTime}ms`);

      return backupMetadata;
    } catch (error) {
      console.error('❌ Full backup failed:', error);
      throw error;
    }
  }

  // Create incremental backup (based on WAL files)
  async createIncrementalBackup(options = {}) {
    try {
      const { customName = null } = options;
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = customName || `incremental_backup_${timestamp}`;
      const backupPath = path.join(this.backupDir, 'incremental', backupName);
      
      console.log(`🔄 Creating incremental backup: ${backupName}`);
      const startTime = Date.now();

      // Ensure backup directory exists
      await fs.mkdir(backupPath, { recursive: true });

      // Use pg_basebackup for incremental backup
      const baseBackupArgs = [
        '--host', this.dbConfig.host,
        '--port', this.dbConfig.port,
        '--username', this.dbConfig.username,
        '--pgdata', backupPath,
        '--format=tar',
        '--gzip',
        '--progress',
        '--verbose',
        '--write-recovery-conf'
      ];

      const env = {
        ...process.env,
        PGPASSWORD: this.dbConfig.password
      };

      const { stdout, stderr } = await execAsync(`pg_basebackup ${baseBackupArgs.join(' ')}`, { env });
      
      const executionTime = Date.now() - startTime;
      const dirStats = await this.getDirectorySize(backupPath);

      // Record backup metadata
      const backupMetadata = {
        name: backupName,
        type: 'incremental',
        path: backupPath,
        size: dirStats.size,
        compressed: true,
        encrypted: false,
        executionTime,
        timestamp: new Date(),
        checksum: await this.calculateDirectoryChecksum(backupPath)
      };

      await this.recordBackup(backupMetadata);

      console.log(`✅ Incremental backup completed: ${backupName}`);
      console.log(`📁 Size: ${this.formatBytes(dirStats.size)}`);
      console.log(`⏱️ Time: ${executionTime}ms`);

      return backupMetadata;
    } catch (error) {
      console.error('❌ Incremental backup failed:', error);
      throw error;
    }
  }

  // Restore from backup
  async restoreFromBackup(backupName, options = {}) {
    try {
      const {
        targetDatabase = this.dbConfig.database,
        dropExisting = false,
        restoreData = true,
        restoreSchema = true
      } = options;

      console.log(`🔄 Restoring from backup: ${backupName}`);
      
      // Find backup metadata
      const backup = await this.getBackupMetadata(backupName);
      if (!backup) {
        throw new Error(`Backup ${backupName} not found`);
      }

      // Verify backup integrity
      await this.verifyBackupIntegrity(backup);

      const startTime = Date.now();
      let restorePath = backup.path;

      // Decrypt if needed
      if (backup.encrypted) {
        restorePath = await this.decryptBackup(backup.path);
      }

      // Decompress if needed
      if (backup.compressed && backup.path.endsWith('.gz')) {
        restorePath = await this.decompressBackup(restorePath);
      }

      // Build pg_restore command
      const restoreArgs = [
        '--host', this.dbConfig.host,
        '--port', this.dbConfig.port,
        '--username', this.dbConfig.username,
        '--dbname', targetDatabase,
        '--verbose'
      ];

      if (dropExisting) {
        restoreArgs.push('--clean');
      }

      if (!restoreData) {
        restoreArgs.push('--schema-only');
      }

      if (!restoreSchema) {
        restoreArgs.push('--data-only');
      }

      restoreArgs.push(restorePath);

      const env = {
        ...process.env,
        PGPASSWORD: this.dbConfig.password
      };

      const { stdout, stderr } = await execAsync(`pg_restore ${restoreArgs.join(' ')}`, { env });
      
      const executionTime = Date.now() - startTime;

      console.log(`✅ Restore completed: ${backupName}`);
      console.log(`⏱️ Time: ${executionTime}ms`);

      // Clean up temporary files
      if (restorePath !== backup.path) {
        await fs.unlink(restorePath);
      }

      return { success: true, executionTime };
    } catch (error) {
      console.error('❌ Restore failed:', error);
      throw error;
    }
  }

  // List available backups
  async listBackups(options = {}) {
    try {
      const { type = null, limit = 50, sortBy = 'timestamp', order = 'desc' } = options;
      
      let query = `
        SELECT * FROM backup_metadata 
        WHERE 1=1
      `;
      const params = [];

      if (type) {
        query += ' AND type = $' + (params.length + 1);
        params.push(type);
      }

      query += ` ORDER BY ${sortBy} ${order.toUpperCase()}`;
      
      if (limit) {
        query += ' LIMIT $' + (params.length + 1);
        params.push(limit);
      }

      const result = await executeQuery(query, params, { readOnly: true });
      return result.rows;
    } catch (error) {
      console.error('Error listing backups:', error);
      throw error;
    }
  }

  // Clean up old backups based on retention policy
  async cleanupOldBackups() {
    try {
      console.log('🔄 Starting backup cleanup...');
      
      const cutoffDate = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);
      
      // Get old backup records
      const query = `
        SELECT * FROM backup_metadata 
        WHERE timestamp < $1
        ORDER BY timestamp ASC
      `;
      
      const result = await executeQuery(query, [cutoffDate], { readOnly: true });
      const oldBackups = result.rows;

      let deletedCount = 0;
      let freedSpace = 0;

      for (const backup of oldBackups) {
        try {
          // Delete backup file/directory
          const stats = await fs.stat(backup.path);
          
          if (stats.isDirectory()) {
            await fs.rm(backup.path, { recursive: true, force: true });
          } else {
            await fs.unlink(backup.path);
          }

          // Remove from metadata
          await executeQuery(
            'DELETE FROM backup_metadata WHERE id = $1',
            [backup.id]
          );

          deletedCount++;
          freedSpace += backup.size;
          
          console.log(`🗑️ Deleted old backup: ${backup.name}`);
        } catch (error) {
          console.error(`⚠️ Failed to delete backup ${backup.name}:`, error.message);
        }
      }

      console.log(`✅ Cleanup completed: ${deletedCount} backups deleted, ${this.formatBytes(freedSpace)} freed`);
      
      return { deletedCount, freedSpace };
    } catch (error) {
      console.error('❌ Backup cleanup failed:', error);
      throw error;
    }
  }

  // Verify backup integrity
  async verifyBackupIntegrity(backup) {
    try {
      const currentChecksum = await this.calculateFileChecksum(backup.path);
      
      if (currentChecksum !== backup.checksum) {
        throw new Error(`Backup integrity check failed for ${backup.name}: checksum mismatch`);
      }

      return true;
    } catch (error) {
      console.error(`❌ Integrity verification failed for ${backup.name}:`, error);
      throw error;
    }
  }

  // Test database connectivity
  async testConnection() {
    try {
      const env = {
        ...process.env,
        PGPASSWORD: this.dbConfig.password,
        PGHOST: this.dbConfig.host,
        PGPORT: this.dbConfig.port,
        PGUSER: this.dbConfig.username,
        PGDATABASE: this.dbConfig.database
      };

      const { stdout } = await execAsync('psql -c "SELECT 1;" -t', { env });
      
      if (stdout.trim() === '1') {
        console.log('✅ Database connection test successful');
        return true;
      } else {
        throw new Error('Connection test failed');
      }
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      throw error;
    }
  }

  // Schedule automated backups
  scheduleBackups() {
    const cron = require('node-cron');
    
    // Daily full backup at 2 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        console.log('🕐 Starting scheduled full backup...');
        await this.createFullBackup();
        await this.cleanupOldBackups();
      } catch (error) {
        console.error('❌ Scheduled full backup failed:', error);
      }
    });

    // Hourly incremental backup
    cron.schedule('0 * * * *', async () => {
      try {
        console.log('🕐 Starting scheduled incremental backup...');
        await this.createIncrementalBackup();
      } catch (error) {
        console.error('❌ Scheduled incremental backup failed:', error);
      }
    });

    console.log('⏰ Backup schedules configured');
  }

  // Helper methods
  async ensureDirectories() {
    const dirs = ['full', 'incremental', 'transaction_log', 'temp'];
    
    for (const dir of dirs) {
      const dirPath = path.join(this.backupDir, dir);
      await fs.mkdir(dirPath, { recursive: true });
    }

    // Create backup metadata table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS backup_metadata (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        type VARCHAR(50) NOT NULL,
        path TEXT NOT NULL,
        size BIGINT,
        compressed BOOLEAN DEFAULT false,
        encrypted BOOLEAN DEFAULT false,
        checksum TEXT,
        execution_time_ms INTEGER,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        metadata JSONB
      );
      
      CREATE INDEX IF NOT EXISTS idx_backup_metadata_type_timestamp 
      ON backup_metadata(type, timestamp DESC);
    `;

    await executeQuery(createTableQuery);
  }

  async validatePostgreSQLTools() {
    const tools = ['pg_dump', 'pg_restore', 'pg_basebackup', 'psql'];
    
    for (const tool of tools) {
      try {
        await execAsync(`which ${tool}`);
      } catch (error) {
        throw new Error(`PostgreSQL tool '${tool}' not found in PATH`);
      }
    }
  }

  async recordBackup(metadata) {
    const query = `
      INSERT INTO backup_metadata 
      (name, type, path, size, compressed, encrypted, checksum, execution_time_ms, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;

    const params = [
      metadata.name,
      metadata.type,
      metadata.path,
      metadata.size,
      metadata.compressed,
      metadata.encrypted,
      metadata.checksum,
      metadata.executionTime,
      JSON.stringify(metadata)
    ];

    const result = await executeQuery(query, params);
    return result.rows[0].id;
  }

  async getBackupMetadata(name) {
    const query = 'SELECT * FROM backup_metadata WHERE name = $1';
    const result = await executeQuery(query, [name], { readOnly: true });
    return result.rows[0] || null;
  }

  async calculateFileChecksum(filePath) {
    const hash = crypto.createHash('sha256');
    const stream = require('fs').createReadStream(filePath);
    
    return new Promise((resolve, reject) => {
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  async calculateDirectoryChecksum(dirPath) {
    // Simple implementation - hash all file paths and sizes
    const files = await this.getAllFiles(dirPath);
    const hash = crypto.createHash('sha256');
    
    for (const file of files.sort()) {
      const stats = await fs.stat(file);
      hash.update(`${file}:${stats.size}`);
    }
    
    return hash.digest('hex');
  }

  async getAllFiles(dirPath) {
    const files = [];
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        files.push(...await this.getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  async getDirectorySize(dirPath) {
    const files = await this.getAllFiles(dirPath);
    let totalSize = 0;
    
    for (const file of files) {
      const stats = await fs.stat(file);
      totalSize += stats.size;
    }
    
    return { size: totalSize, fileCount: files.length };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async decryptBackup(encryptedPath) {
    const decryptedPath = encryptedPath + '.decrypted';
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    
    const input = require('fs').createReadStream(encryptedPath);
    const output = require('fs').createWriteStream(decryptedPath);
    
    await new Promise((resolve, reject) => {
      input.pipe(decipher).pipe(output);
      output.on('finish', resolve);
      output.on('error', reject);
    });
    
    return decryptedPath;
  }

  async decompressBackup(compressedPath) {
    const decompressedPath = compressedPath.replace('.gz', '');
    const gunzip = zlib.createGunzip();
    
    const input = require('fs').createReadStream(compressedPath);
    const output = require('fs').createWriteStream(decompressedPath);
    
    await new Promise((resolve, reject) => {
      input.pipe(gunzip).pipe(output);
      output.on('finish', resolve);
      output.on('error', reject);
    });
    
    return decompressedPath;
  }
}

module.exports = new BackupManager();