import React from 'react';

function EnvTest() {
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  return (
    <div style={{ padding: '20px', background: '#f0f0f0', margin: '20px' }}>
      <h3>Environment Variables Test</h3>
      <p><strong>Mode:</strong> {import.meta.env.MODE}</p>
      <p><strong>Base URL:</strong> {import.meta.env.BASE_URL}</p>
      <p><strong>Prod:</strong> {import.meta.env.PROD ? 'true' : 'false'}</p>
      <p><strong>Dev:</strong> {import.meta.env.DEV ? 'true' : 'false'}</p>
      <p><strong>VITE_GEMINI_API_KEY:</strong> {geminiKey ? `${geminiKey.substring(0, 10)}... (${geminiKey.length} chars)` : 'NOT SET'}</p>
      <p><strong>VITE_OPENAI_API_KEY:</strong> {openaiKey ? `${openaiKey.substring(0, 10)}... (${openaiKey.length} chars)` : 'NOT SET'}</p>
      <p><strong>All VITE_ vars:</strong> {Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')).join(', ')}</p>
    </div>
  );
}

export default EnvTest;