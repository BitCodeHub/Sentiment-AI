import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle all routes by serving index.html (for React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).send('Server Error');
});

// Start server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`
  ✅ Server is running!
  
  Open your browser and go to:
  👉 http://127.0.0.1:${PORT}
  👉 http://localhost:${PORT}
  
  Press Ctrl+C to stop the server.
  `);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please try a different port.`);
  } else {
    console.error('Failed to start server:', err);
  }
  process.exit(1);
});