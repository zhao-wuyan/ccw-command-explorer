// Vercel Serverless Function - LLM API Proxy
// Handles CORS and forwards requests to LLM APIs

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { baseUrl, apiKey, modelId, messages, temperature = 0.3 } = req.body;

  if (!baseUrl || !apiKey || !modelId || !messages) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Ensure baseUrl ends with /v1
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

    if (!response.ok) {
      const error = await response.text();
      console.error('LLM API error:', response.status, error);
      return res.status(response.status).json({ error: `LLM API error: ${response.status}` });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: error.message });
  }
}
