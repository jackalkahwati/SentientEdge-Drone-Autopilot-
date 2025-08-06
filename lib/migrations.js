// Database Migration System
// Version-controlled database schema management with rollback capabilities

const fs = require('fs').promises;
const path = require('path');
const { executeQuery, executeTransaction } = require('./database');

class MigrationManager {
  constructor() {
    this.migrationDir = path.join(__dirname, '../database/migrations');
    this.initDir = path.join(__dirname, '../database/init');
    this.migrationTable = 'public.schema_migrations';
  }

  // Initialize migration tracking table
  async initializeMigrationTable() {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS ${this.migrationTable} (
          id SERIAL PRIMARY KEY,
          version VARCHAR(50) NOT NULL UNIQUE,
          name VARCHAR(200) NOT NULL,
          applied_at TIMESTAMPTZ DEFAULT NOW(),
          applied_by VARCHAR(100),
          checksum TEXT,
          execution_time_ms INTEGER,
          rollback_sql TEXT
        );
        
        CREATE INDEX IF NOT EXISTS idx_schema_migrations_version 
        ON ${this.migrationTable}(version);
        
        CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at 
        ON ${this.migrationTable}(applied_at);
      `;

      await executeQuery(query);
      console.log('✅ Migration tracking table initialized');
    } catch (error) {
      console.error('❌ Error initializing migration table:', error);
      throw error;
    }
  }

  // Get current database version
  async getCurrentVersion() {
    try {
      const query = `
        SELECT version FROM ${this.migrationTable} 
        ORDER BY applied_at DESC 
        LIMIT 1
      `;
      
      const result = await executeQuery(query, [], { readOnly: true });
      return result.rows.length > 0 ? result.rows[0].version : null;
    } catch (error) {
      // If table doesn't exist, return null (fresh install)
      if (error.code === '42P01') {
        return null;
      }
      throw error;
    }
  }

  // Get all applied migrations
  async getAppliedMigrations() {
    try {
      const query = `
        SELECT * FROM ${this.migrationTable} 
        ORDER BY applied_at ASC
      `;
      
      const result = await executeQuery(query, [], { readOnly: true });
      return result.rows;
    } catch (error) {
      if (error.code === '42P01') {
        return []; // No migrations table = no migrations applied
      }
      throw error;
    }
  }

  // Get pending migrations
  async getPendingMigrations() {
    try {
      const allMigrations = await this.getAllMigrationFiles();
      const appliedMigrations = await this.getAppliedMigrations();
      const appliedVersions = new Set(appliedMigrations.map(m => m.version));

      return allMigrations.filter(migration => !appliedVersions.has(migration.version));
    } catch (error) {
      console.error('Error getting pending migrations:', error);
      throw error;
    }
  }

  // Get all migration files from directory
  async getAllMigrationFiles() {
    try {
      // Create migrations directory if it doesn't exist
      try {
        await fs.access(this.migrationDir);
      } catch {
        await fs.mkdir(this.migrationDir, { recursive: true });
        console.log(`📁 Created migrations directory: ${this.migrationDir}`);
      }

      const files = await fs.readdir(this.migrationDir);
      const migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort(); // Alphabetical sort ensures proper ordering

      const migrations = [];
      for (const file of migrationFiles) {
        const filePath = path.join(this.migrationDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        
        // Extract migration metadata from filename and content
        const version = this.extractVersionFromFilename(file);
        const name = this.extractNameFromFilename(file);
        
        migrations.push({
          version,
          name,
          filename: file,
          filepath: filePath,
          content,
          checksum: this.generateChecksum(content)
        });
      }

      return migrations;
    } catch (error) {
      console.error('Error reading migration files:', error);
      throw error;
    }
  }

  // Run initial database setup
  async runInitialSetup() {
    try {
      console.log('🔄 Running initial database setup...');
      
      // Get all init files
      const initFiles = await fs.readdir(this.initDir);
      const sqlFiles = initFiles
        .filter(file => file.endsWith('.sql'))
        .sort(); // Run in alphabetical order

      for (const file of sqlFiles) {
        const filePath = path.join(this.initDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        
        console.log(`📄 Executing ${file}...`);
        const startTime = Date.now();
        
        await executeQuery(content);
        
        const executionTime = Date.now() - startTime;
        console.log(`✅ ${file} completed in ${executionTime}ms`);
      }

      // Mark initial setup as complete by creating a special migration record
      await this.recordMigration({
        version: '000_initial_setup',
        name: 'Initial Database Setup',
        checksum: 'initial',
        executionTime: 0
      });

      console.log('✅ Initial database setup completed');
    } catch (error) {
      console.error('❌ Initial database setup failed:', error);
      throw error;
    }
  }

  // Apply a single migration
  async applyMigration(migration, options = {}) {
    try {
      const { dryRun = false, appliedBy = 'system' } = options;
      
      console.log(`🔄 ${dryRun ? '[DRY RUN] ' : ''}Applying migration ${migration.version}: ${migration.name}`);
      
      if (dryRun) {
        console.log('📄 Migration SQL:');
        console.log(migration.content);
        return;
      }

      return await executeTransaction(async (client) => {
        const startTime = Date.now();
        
        // Execute the migration
        await client.query(migration.content);
        
        const executionTime = Date.now() - startTime;
        
        // Record the migration
        await this.recordMigration({
          version: migration.version,
          name: migration.name,
          appliedBy,
          checksum: migration.checksum,
          executionTime
        }, client);

        console.log(`✅ Migration ${migration.version} applied successfully in ${executionTime}ms`);
        
        return { version: migration.version, executionTime };
      });
    } catch (error) {
      console.error(`❌ Migration ${migration.version} failed:`, error);
      throw error;
    }
  }

  // Apply all pending migrations
  async migrate(options = {}) {
    try {
      const { dryRun = false, target = null } = options;
      
      // Initialize migration table if needed
      if (!dryRun) {
        await this.initializeMigrationTable();
      }

      // Check if this is a fresh installation
      const currentVersion = await this.getCurrentVersion();
      if (!currentVersion && !dryRun) {
        await this.runInitialSetup();
      }

      // Get pending migrations
      const pendingMigrations = await this.getPendingMigrations();
      
      if (pendingMigrations.length === 0) {
        console.log('✅ Database is up to date');
        return { applied: 0, migrations: [] };
      }

      // Filter migrations if target specified
      let migrationsToApply = pendingMigrations;
      if (target) {
        const targetIndex = pendingMigrations.findIndex(m => m.version === target);
        if (targetIndex === -1) {
          throw new Error(`Target migration ${target} not found`);
        }
        migrationsToApply = pendingMigrations.slice(0, targetIndex + 1);
      }

      console.log(`📋 Found ${migrationsToApply.length} pending migration(s):`);
      migrationsToApply.forEach(m => {
        console.log(`  - ${m.version}: ${m.name}`);
      });

      if (dryRun) {
        console.log('🔍 DRY RUN - No changes will be applied');
      }

      const appliedMigrations = [];
      
      // Apply migrations sequentially
      for (const migration of migrationsToApply) {
        const result = await this.applyMigration(migration, options);
        if (!dryRun) {
          appliedMigrations.push(result);
        }
      }

      if (!dryRun) {
        console.log(`✅ Applied ${appliedMigrations.length} migration(s) successfully`);
      }

      return {
        applied: appliedMigrations.length,
        migrations: appliedMigrations
      };
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  // Rollback to a specific version
  async rollback(targetVersion, options = {}) {
    try {
      const { dryRun = false } = options;
      
      console.log(`🔄 ${dryRun ? '[DRY RUN] ' : ''}Rolling back to version ${targetVersion}`);
      
      const appliedMigrations = await this.getAppliedMigrations();
      const currentVersion = await this.getCurrentVersion();
      
      if (!currentVersion) {
        throw new Error('No migrations to rollback');
      }

      // Find migrations to rollback (newer than target)
      const migrationsToRollback = appliedMigrations
        .filter(m => m.version > targetVersion)
        .sort((a, b) => b.applied_at - a.applied_at); // Reverse order for rollback

      if (migrationsToRollback.length === 0) {
        console.log(`✅ Already at or before version ${targetVersion}`);
        return { rolledBack: 0, migrations: [] };
      }

      console.log(`📋 Rolling back ${migrationsToRollback.length} migration(s):`);
      migrationsToRollback.forEach(m => {
        console.log(`  - ${m.version}: ${m.name}`);
      });

      if (dryRun) {
        console.log('🔍 DRY RUN - No changes will be applied');
        return { rolledBack: migrationsToRollback.length, migrations: migrationsToRollback };
      }

      const rolledBackMigrations = [];

      return await executeTransaction(async (client) => {
        for (const migration of migrationsToRollback) {
          if (migration.rollback_sql) {
            console.log(`🔄 Rolling back ${migration.version}: ${migration.name}`);
            await client.query(migration.rollback_sql);
          } else {
            console.warn(`⚠️ No rollback SQL for ${migration.version}, skipping`);
          }

          // Remove migration record
          await client.query(
            `DELETE FROM ${this.migrationTable} WHERE version = $1`,
            [migration.version]
          );

          rolledBackMigrations.push(migration);
          console.log(`✅ Rolled back ${migration.version}`);
        }

        console.log(`✅ Rolled back ${rolledBackMigrations.length} migration(s) successfully`);
        
        return {
          rolledBack: rolledBackMigrations.length,
          migrations: rolledBackMigrations
        };
      });
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }

  // Generate a new migration file
  async generateMigration(name, options = {}) {
    try {
      const { type = 'general' } = options;
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);
      const version = `${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}`;
      const filename = `${version}.sql`;
      const filepath = path.join(this.migrationDir, filename);

      // Create migration template based on type
      let template = `-- Migration: ${name}
-- Version: ${version}
-- Created: ${new Date().toISOString()}
-- Type: ${type}

-- Forward migration
BEGIN;

-- TODO: Add your migration SQL here

COMMIT;

-- Rollback SQL (optional, for manual rollbacks)
-- BEGIN;
-- TODO: Add rollback SQL here
-- COMMIT;
`;

      if (type === 'table') {
        template = `-- Migration: ${name}
-- Version: ${version}
-- Created: ${new Date().toISOString()}
-- Type: Create Table

-- Forward migration
BEGIN;

-- CREATE TABLE example_table (
--   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--   name VARCHAR(100) NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- CREATE INDEX IF NOT EXISTS idx_example_table_name ON example_table(name);

COMMIT;

-- Rollback SQL
-- BEGIN;
-- DROP TABLE IF EXISTS example_table;
-- COMMIT;
`;
      } else if (type === 'index') {
        template = `-- Migration: ${name}
-- Version: ${version}
-- Created: ${new Date().toISOString()}
-- Type: Add Index

-- Forward migration
BEGIN;

-- CREATE INDEX IF NOT EXISTS idx_table_column ON schema.table(column);

COMMIT;

-- Rollback SQL
-- BEGIN;
-- DROP INDEX IF EXISTS idx_table_column;
-- COMMIT;
`;
      }

      await fs.writeFile(filepath, template, 'utf8');
      
      console.log(`✅ Generated migration file: ${filename}`);
      console.log(`📄 Path: ${filepath}`);
      
      return {
        version,
        name,
        filename,
        filepath
      };
    } catch (error) {
      console.error('❌ Error generating migration:', error);
      throw error;
    }
  }

  // Get migration status
  async getStatus() {
    try {
      const currentVersion = await this.getCurrentVersion();
      const appliedMigrations = await this.getAppliedMigrations();
      const pendingMigrations = await this.getPendingMigrations();
      
      return {
        currentVersion,
        appliedCount: appliedMigrations.length,
        pendingCount: pendingMigrations.length,
        appliedMigrations: appliedMigrations.map(m => ({
          version: m.version,
          name: m.name,
          appliedAt: m.applied_at,
          executionTime: m.execution_time_ms
        })),
        pendingMigrations: pendingMigrations.map(m => ({
          version: m.version,
          name: m.name,
          filename: m.filename
        }))
      };
    } catch (error) {
      console.error('Error getting migration status:', error);
      throw error;
    }
  }

  // Validate migration integrity
  async validateIntegrity() {
    try {
      const appliedMigrations = await this.getAppliedMigrations();
      const migrationFiles = await this.getAllMigrationFiles();
      const issues = [];

      // Check for applied migrations without files
      for (const applied of appliedMigrations) {
        const file = migrationFiles.find(f => f.version === applied.version);
        if (!file) {
          issues.push({
            type: 'missing_file',
            version: applied.version,
            message: `Applied migration ${applied.version} has no corresponding file`
          });
        } else if (file.checksum !== applied.checksum) {
          issues.push({
            type: 'checksum_mismatch',
            version: applied.version,
            message: `Migration ${applied.version} file has been modified after application`
          });
        }
      }

      return {
        valid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('Error validating migration integrity:', error);
      throw error;
    }
  }

  // Helper methods
  extractVersionFromFilename(filename) {
    const match = filename.match(/^(\d{14}_[^.]+)/);
    return match ? match[1] : filename.replace('.sql', '');
  }

  extractNameFromFilename(filename) {
    const version = this.extractVersionFromFilename(filename);
    return version.substring(15).replace(/_/g, ' ');
  }

  generateChecksum(content) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  async recordMigration(migrationData, client = null) {
    const query = `
      INSERT INTO ${this.migrationTable} 
      (version, name, applied_by, checksum, execution_time_ms, rollback_sql)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    
    const params = [
      migrationData.version,
      migrationData.name,
      migrationData.appliedBy || 'system',
      migrationData.checksum,
      migrationData.executionTime,
      migrationData.rollbackSql || null
    ];

    if (client) {
      await client.query(query, params);
    } else {
      await executeQuery(query, params);
    }
  }
}

// Export migration manager instance
module.exports = new MigrationManager();