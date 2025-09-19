// Simplified production server for Render deployment
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://sentiment-review-dashboard.onrender.com',
  credentials: true
}));
app.use(express.json());

// Health check endpoint - MUST be first
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Load other routes after basic setup
try {
  const routes = require('./server-production.js');
  console.log('Production routes loaded successfully');
} catch (error) {
  console.error('Warning: Could not load full production routes:', error.message);
  // Continue running with basic endpoints
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});