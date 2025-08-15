const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Test server is working!\n');
});

server.listen(5174, () => {
  console.log('Test server running on http://localhost:5174');
});

// Keep the process running
process.stdin.resume();