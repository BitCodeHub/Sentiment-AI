const net = require('net');

// Test binding to different addresses
const tests = [
  { host: 'localhost', port: 9999 },
  { host: '127.0.0.1', port: 9998 },
  { host: '0.0.0.0', port: 9997 }
];

tests.forEach(({ host, port }) => {
  const server = net.createServer();
  
  server.on('error', (err) => {
    console.error(`❌ Failed to bind to ${host}:${port} - ${err.message}`);
  });
  
  server.on('listening', () => {
    console.log(`✅ Successfully bound to ${host}:${port}`);
    server.close();
  });
  
  try {
    server.listen(port, host);
  } catch (err) {
    console.error(`❌ Exception binding to ${host}:${port} - ${err.message}`);
  }
});