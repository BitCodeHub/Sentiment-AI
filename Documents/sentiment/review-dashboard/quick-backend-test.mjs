import https from 'https';

const BACKEND_URL = 'https://sentiment-review-backend.onrender.com';

function testEndpoint(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`${url} - Status: ${res.statusCode}`);
        if (res.statusCode !== 404 && data) {
          console.log(`Response preview: ${data.substring(0, 100)}...`);
        }
        resolve();
      });
    }).on('error', (err) => {
      console.log(`${url} - Error: ${err.message}`);
      resolve();
    });
  });
}

async function runTests() {
  console.log('Testing Backend Endpoints...\n');
  
  const endpoints = [
    `${BACKEND_URL}/`,
    `${BACKEND_URL}/health`,
    `${BACKEND_URL}/api/health`,
    `${BACKEND_URL}/api/competitors/info?appName=Tesla`,
    `${BACKEND_URL}/api/apple-reviews/hybrid`,
    `${BACKEND_URL}/api/apple-reviews`
  ];
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }
  
  console.log('\nIf all endpoints return 404, the backend needs to be redeployed with the latest code.');
}

runTests();