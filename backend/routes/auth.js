const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/connection');

const router = express.Router();

// JWT Secret - should be in env vars
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Generate JWT token
function generateToken(userId) {
  return jwt.sign(
    { userId, iat: Date.now() },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Sign Up endpoint
router.post('/signup', async (req, res) => {
  console.log('[Auth] Signup request received:', { email: req.body.email, name: req.body.name });
  
  try {
    const { email, password, name } = req.body;
    
    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Email, password, and name are required'
      });
    }
    
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      console.log('[Auth] User already exists:', email);
      return res.status(400).json({
        error: 'User already exists',
        details: 'An account with this email already exists'
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, name, role, created_at`,
      [email, passwordHash, name, 'member']
    );
    
    const newUser = result.rows[0];
    console.log('[Auth] User created successfully:', newUser.id);
    
    // Generate token
    const token = generateToken(newUser.id);
    
    // Create session
    await pool.query(
      `INSERT INTO sessions (user_id, token, expires_at) 
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [newUser.id, token]
    );
    
    res.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      },
      session: { access_token: token }
    });
  } catch (error) {
    console.error('[Auth] Signup error:', error);
    res.status(500).json({
      error: 'Failed to create account',
      details: error.message
    });
  }
});

// Sign In endpoint
router.post('/signin', async (req, res) => {
  console.log('[Auth] Signin request received:', { email: req.body.email });
  
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Email and password are required'
      });
    }
    
    // Find user
    const result = await pool.query(
      'SELECT id, email, password_hash, name, role FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      console.log('[Auth] User not found:', email);
      return res.status(401).json({
        error: 'Invalid credentials',
        details: 'Invalid email or password'
      });
    }
    
    const user = result.rows[0];
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      console.log('[Auth] Invalid password for user:', email);
      return res.status(401).json({
        error: 'Invalid credentials',
        details: 'Invalid email or password'
      });
    }
    
    // Generate token
    const token = generateToken(user.id);
    
    // Create session (delete old sessions first)
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [user.id]);
    await pool.query(
      `INSERT INTO sessions (user_id, token, expires_at) 
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, token]
    );
    
    console.log('[Auth] User signed in successfully:', user.id);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      session: { access_token: token }
    });
  } catch (error) {
    console.error('[Auth] Signin error:', error);
    res.status(500).json({
      error: 'Failed to sign in',
      details: error.message
    });
  }
});

// Guest Sign In endpoint - DISABLED
router.post('/signin-guest', async (req, res) => {
  console.log('[Auth] Guest signin request received - DENIED');
  
  // Guest login is disabled - users must create an account
  res.status(403).json({
    error: 'Guest access is disabled',
    details: 'Please create an account or sign in with existing credentials'
  });
});

// Sign Out endpoint
router.post('/signout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
      console.log('[Auth] User signed out successfully');
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('[Auth] Signout error:', error);
    res.status(500).json({
      error: 'Failed to sign out',
      details: error.message
    });
  }
});

// Get Session endpoint
router.get('/session', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.json({ user: null });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Find session
    const sessionResult = await pool.query(
      `SELECT s.*, u.id as user_id, u.email, u.name, u.role, u.is_guest 
       FROM sessions s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );
    
    if (sessionResult.rows.length === 0) {
      return res.json({ user: null });
    }
    
    const session = sessionResult.rows[0];
    
    res.json({
      user: {
        id: session.user_id,
        email: session.email,
        name: session.name,
        role: session.role,
        isGuest: session.is_guest
      }
    });
  } catch (error) {
    console.error('[Auth] Session check error:', error);
    res.json({ user: null });
  }
});

// Get all users (for team member list)
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role FROM users WHERE is_guest = false ORDER BY name'
    );
    
    res.json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    console.error('[Auth] Failed to fetch users:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      details: error.message
    });
  }
});

// Middleware to verify JWT token
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Verify token is valid and not expired
    const sessionResult = await pool.query(
      `SELECT s.*, u.id as user_id, u.email, u.name, u.role 
       FROM sessions s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );
    
    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    req.user = {
      id: sessionResult.rows[0].user_id,
      email: sessionResult.rows[0].email,
      name: sessionResult.rows[0].name,
      role: sessionResult.rows[0].role
    };
    
    next();
  } catch (error) {
    console.error('[Auth] Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { router, verifyToken };