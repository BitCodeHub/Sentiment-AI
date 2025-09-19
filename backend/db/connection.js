const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test the connection
pool.on('connect', () => {
  console.log('[Database] Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('[Database] Unexpected error on idle client', err);
});

// Health check function
async function checkConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('[Database] Health check passed:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('[Database] Health check failed:', error.message);
    return false;
  }
}

// Initialize database schema
async function initializeDatabase() {
  try {
    console.log('[Database] Initializing database schema...');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'member',
        is_guest BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create assignments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        review_id VARCHAR(255) NOT NULL,
        assigned_to UUID NOT NULL REFERENCES users(id),
        assigned_by UUID NOT NULL REFERENCES users(id),
        notes TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_assignments_assigned_to ON assignments(assigned_to)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_assignments_review_id ON assignments(review_id)');
    
    // Create update trigger function
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    
    // Create triggers
    await pool.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at 
      BEFORE UPDATE ON users 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    
    await pool.query(`
      DROP TRIGGER IF EXISTS update_assignments_updated_at ON assignments;
      CREATE TRIGGER update_assignments_updated_at 
      BEFORE UPDATE ON assignments 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    
    console.log('[Database] Schema initialized successfully');
  } catch (error) {
    console.error('[Database] Failed to initialize schema:', error);
    throw error;
  }
}

module.exports = {
  pool,
  checkConnection,
  initializeDatabase
};