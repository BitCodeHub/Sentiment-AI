import express from 'express';
const app = express();

app.get('/', (req, res) => {
  res.send('Server is working!');
});

const port = 4000;
app.listen(port, '127.0.0.1', () => {
  console.log(`Test server running at http://127.0.0.1:${port}`);
}).on('error', (err) => {
  console.error('Server error:', err);
});