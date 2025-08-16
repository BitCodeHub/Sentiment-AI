const http = require('http');

const server = http.createServer((req, res) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Server is working!\n');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

const port = 9999;
server.listen(port, '127.0.0.1', () => {
  console.log(`HTTP server running at http://127.0.0.1:${port}/`);
  console.log('Try accessing it with: curl http://127.0.0.1:9999/');
});