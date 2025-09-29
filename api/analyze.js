// /api/analyze.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Собираем тело запроса (для Next.js 13+ body уже распарсен, для старых версий — может быть строкой)
  let body = req.body;
  if (typeof body !== 'string') {
    body = JSON.stringify(body);
  }

  // Проксируем запрос на твой Cloudflare Worker
  const apiRes = await fetch('https://deepseek-api-key.lexsnitko.workers.dev/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': req.headers['content-type'] || 'application/json',
      'Authorization': req.headers['authorization'] || '',
    },
    body,
  });

  const data = await apiRes.json();
  res.status(apiRes.status).json(data);
}
