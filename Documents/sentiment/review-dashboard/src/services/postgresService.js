// PostgreSQL database service for Render.com
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pg from 'pg';

const { Pool } = pg;

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Database service methods
export const postgresDB = {
  // User authentication
  async signUp(email, password, name) {
    try {
      // Check if user exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      
      if (existingUser.rows.length > 0) {
        return { user: null, error: 'User already exists' };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create user
      const result = await pool.query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, role, created_at',
        [email, passwordHash, name]
      );
      
      const user = result.rows[0];
      return { user, error: null };
    } catch (error) {
      console.error('SignUp error:', error);
      return { user: null, error: error.message };
    }
  },

  async signIn(email, password) {
    try {
      // Get user
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      
      if (result.rows.length === 0) {
        return { user: null, session: null, error: 'Invalid credentials' };
      }
      
      const user = result.rows[0];
      
      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return { user: null, session: null, error: 'Invalid credentials' };
      }
      
      // Create session
      const token = uuidv4();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      await pool.query(
        'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, expiresAt]
      );
      
      // Return user without password
      const { password_hash, ...userWithoutPassword } = user;
      
      return { 
        user: userWithoutPassword, 
        session: token,
        error: null 
      };
    } catch (error) {
      console.error('SignIn error:', error);
      return { user: null, session: null, error: error.message };
    }
  },

  async signOut(sessionToken) {
    try {
      await pool.query(
        'DELETE FROM sessions WHERE token = $1',
        [sessionToken]
      );
      return { error: null };
    } catch (error) {
      console.error('SignOut error:', error);
      return { error: error.message };
    }
  },

  async getSession(sessionToken) {
    try {
      if (!sessionToken) {
        return { user: null, error: 'No session token' };
      }
      
      // Get session with user data
      const result = await pool.query(
        `SELECT u.id, u.email, u.name, u.role, u.created_at, s.expires_at
         FROM sessions s 
         JOIN users u ON s.user_id = u.id 
         WHERE s.token = $1 AND s.expires_at > NOW()`,
        [sessionToken]
      );
      
      if (result.rows.length === 0) {
        return { user: null, error: 'Invalid or expired session' };
      }
      
      return { user: result.rows[0], error: null };
    } catch (error) {
      console.error('GetSession error:', error);
      return { user: null, error: error.message };
    }
  },

  async signInAsGuest() {
    try {
      const guestEmail = `guest_${Date.now()}@example.com`;
      const guestPassword = uuidv4();
      const guestName = `Guest User`;
      
      // Create guest user
      const { user, error } = await this.signUp(guestEmail, guestPassword, guestName);
      if (error) {
        return { user: null, session: null, error };
      }
      
      // Sign in the guest
      return this.signIn(guestEmail, guestPassword);
    } catch (error) {
      console.error('Guest signin error:', error);
      return { user: null, session: null, error: error.message };
    }
  },

  // Assignment methods
  async createAssignment(reviewId, assignedToEmail, assignedByEmail, notes = '') {
    try {
      const result = await pool.query(
        `INSERT INTO assignments (review_id, assigned_to_email, assigned_by_email, notes) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [reviewId, assignedToEmail, assignedByEmail, notes]
      );
      
      return { assignment: result.rows[0], error: null };
    } catch (error) {
      console.error('CreateAssignment error:', error);
      return { assignment: null, error: error.message };
    }
  },

  async getAssignments(userEmail = null) {
    try {
      let query = 'SELECT * FROM assignments';
      let params = [];
      
      if (userEmail) {
        query += ' WHERE assigned_to_email = $1 OR assigned_by_email = $1';
        params = [userEmail];
      }
      
      query += ' ORDER BY created_at DESC';
      
      const result = await pool.query(query, params);
      return { assignments: result.rows, error: null };
    } catch (error) {
      console.error('GetAssignments error:', error);
      return { assignments: [], error: error.message };
    }
  },

  async updateAssignmentStatus(assignmentId, status) {
    try {
      const result = await pool.query(
        'UPDATE assignments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, assignmentId]
      );
      
      if (result.rows.length === 0) {
        return { assignment: null, error: 'Assignment not found' };
      }
      
      return { assignment: result.rows[0], error: null };
    } catch (error) {
      console.error('UpdateAssignmentStatus error:', error);
      return { assignment: null, error: error.message };
    }
  },

  async getTeamMembers() {
    try {
      const result = await pool.query(
        'SELECT id, email, name, role FROM users WHERE role != $1 ORDER BY name',
        ['guest']
      );
      
      return { users: result.rows, error: null };
    } catch (error) {
      console.error('GetTeamMembers error:', error);
      return { users: [], error: error.message };
    }
  },

  // Health check
  async checkConnection() {
    try {
      await pool.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database connection error:', error);
      return false;
    }
  }
};

// Initialize database tables
export async function initializeDatabase() {
  try {
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
        assigned_to_email VARCHAR(255) NOT NULL,
        assigned_by_email VARCHAR(255) NOT NULL,
        notes TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}