import { createServer } from 'http';

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Test server is working!\n');
});

server.listen(5174, '127.0.0.1', () => {
  console.log('Test server running on http://127.0.0.1:5174');
});

// Keep the process running
process.stdin.resume();