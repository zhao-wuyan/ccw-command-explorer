/**
 * Simple API server for development
 * Handles CORS and proxies to LLM APIs
 */

import http from 'http';

const PORT = 3001;

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/api/proxy' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { baseUrl, apiKey, modelId, messages, temperature = 0.3 } = JSON.parse(body);

        if (!baseUrl || !apiKey || !modelId || !messages) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Missing required fields' }));
          return;
        }

        // Build URL
        let url = baseUrl.trim();
        if (url.endsWith('/')) url = url.slice(0, -1);
        if (!url.endsWith('/v1')) url = url + '/v1';
        url = url + '/chat/completions';

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelId,
            messages,
            temperature,
            max_tokens: 2000,
          }),
        });

        const data = await response.json();
        res.writeHead(response.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));

      } catch (error) {
        console.error('API error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`API proxy server running on http://localhost:${PORT}`);
});
