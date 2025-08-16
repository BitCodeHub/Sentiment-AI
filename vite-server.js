import { createServer } from 'vite';

async function startViteServer() {
  try {
    const server = await createServer({
      server: {
        host: '127.0.0.1',
        port: 5173,
        strictPort: false
      },
      configFile: false,
      root: process.cwd()
    });
    
    await server.listen();
    
    server.printUrls();
    console.log('Vite server started successfully');
  } catch (error) {
    console.error('Failed to start Vite server:', error);
  }
}

startViteServer();