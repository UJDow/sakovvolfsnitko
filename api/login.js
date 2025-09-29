// /api/login.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Проксируем запрос на Cloudflare Worker
  const apiRes = await fetch('https://deepseek-api-key.lexsnitko.workers.dev/login', {
    method: 'POST',
    headers: {
      'Content-Type': req.headers['content-type'] || 'application/json',
    },
    body: JSON.stringify(req.body),
  });

  const data = await apiRes.json();
  res.status(apiRes.status).json(data);
}
