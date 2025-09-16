const allowedOrigins = [
  'https://sakovvolfsnitko.vercel.app',
  'https://sakovvolfsnitko-hup7bbfl1-alexandr-snitkos-projects.vercel.app',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

function buildCorsHeaders(origin) {
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  };
}

// Хелпер для CORS
function cors(res, origin) {
  const corsHeaders = buildCorsHeaders(origin);
  for (const [k, v] of Object.entries(corsHeaders)) {
    res.headers.set(k, v);
  }
  return res;
}

// Функция для хеширования паролей
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(x => x.toString(16).padStart(2, '0')).join('');
}

// Генерация случайного токена
function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Генерация случайного userId
function randomId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    const origin = request.headers.get('Origin') || '';

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: buildCorsHeaders(origin) });
    }

    // Регистрация пользователя
    if (pathname === "/register" && request.method === "POST") {
      const { username, password } = await request.json();
      if (!username || username.length < 3) {
        return cors(new Response(JSON.stringify({ error: "Username too short" }), { status: 400, headers: { 'Content-Type': 'application/json' } }), origin);
      }
      if (!password || password.length < 6) {
        return cors(new Response(JSON.stringify({ error: "Password too short" }), { status: 400, headers: { 'Content-Type': 'application/json' } }), origin);
      }
      const userKey = `user:${username}`;
      const existing = await env.USERS_KV.get(userKey);
      if (existing) {
        return cors(new Response(JSON.stringify({ error: "User already exists" }), { status: 409, headers: { 'Content-Type': 'application/json' } }), origin);
      }
      const passwordHash = await sha256(password);
      const userId = randomId();
      const token = randomToken();
      await env.USERS_KV.put(userKey, JSON.stringify({ passwordHash, userId, token }));
      return cors(new Response(JSON.stringify({ ok: true, userId, token }), { status: 200, headers: { 'Content-Type': 'application/json' } }), origin);
    }

    // Логин пользователя
    if (pathname === "/login" && request.method === "POST") {
      const { username, password } = await request.json();
      if (!username || username.length < 3) {
        return cors(new Response(JSON.stringify({ error: "Username too short" }), { status: 400, headers: { 'Content-Type': 'application/json' } }), origin);
      }
      if (!password || password.length < 6) {
        return cors(new Response(JSON.stringify({ error: "Password too short" }), { status: 400, headers: { 'Content-Type': 'application/json' } }), origin);
      }
      const userKey = `user:${username}`;
      const userRaw = await env.USERS_KV.get(userKey);
      if (!userRaw) {
        return cors(new Response(JSON.stringify({ error: "User not found" }), { status: 401, headers: { 'Content-Type': 'application/json' } }), origin);
      }
      const user = JSON.parse(userRaw);
      const passwordHash = await sha256(password);
      if (user.passwordHash !== passwordHash) {
        return cors(new Response(JSON.stringify({ error: "Wrong password" }), { status: 401, headers: { 'Content-Type': 'application/json' } }), origin);
      }
      // Генерируем новый токен при каждом логине
      const token = randomToken();
      user.token = token;
      await env.USERS_KV.put(userKey, JSON.stringify(user));
      return cors(new Response(JSON.stringify({ ok: true, userId: user.userId, token }), { status: 200, headers: { 'Content-Type': 'application/json' } }), origin);
    }

    // Авторизация
    async function auth(request) {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
      const token = authHeader.slice(7);
      // Ищем пользователя по токену
      const list = await env.USERS_KV.list({ prefix: "user:" });
      for (const key of list.keys) {
        const userRaw = await env.USERS_KV.get(key.name);
        if (userRaw) {
          const user = JSON.parse(userRaw);
          if (user.token === token) return { ...user, username: key.name.slice(5) };
        }
      }
      return null;
    }

    // Получить все сны пользователя
    if (pathname === "/dreams" && request.method === "GET") {
      const user = await auth(request);
      if (!user) return cors(new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } }), origin);
      const dreamsList = await env.DREAMS_KV.list({ prefix: `dream:${user.userId}:` });
      const dreams = [];
      for (const key of dreamsList.keys) {
        const dreamRaw = await env.DREAMS_KV.get(key.name);
        if (dreamRaw) {
          const dream = JSON.parse(dreamRaw);
          dreams.push({ id: key.name.split(":")[2], ...dream });
        }
      }
      return cors(new Response(JSON.stringify({ dreams }), { status: 200, headers: { 'Content-Type': 'application/json' } }), origin);
    }

    // Добавить новый сон
    if (pathname === "/dreams" && request.method === "POST") {
      const user = await auth(request);
      if (!user) return cors(new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } }), origin);
      const { text, blocks } = await request.json();
      if (!text || text.length < 5) {
        return cors(new Response(JSON.stringify({ error: "Dream text too short" }), { status: 400, headers: { 'Content-Type': 'application/json' } }), origin);
      }
      const dreamId = randomId();
      await env.DREAMS_KV.put(`dream:${user.userId}:${dreamId}`, JSON.stringify({ text, blocks }));
      return cors(new Response(JSON.stringify({ ok: true, id: dreamId }), { status: 200, headers: { 'Content-Type': 'application/json' } }), origin);
    }

    // Удалить сон
    if (pathname.startsWith("/dreams/") && request.method === "DELETE") {
      const user = await auth(request);
      if (!user) return cors(new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } }), origin);
      const dreamId = pathname.split("/")[2];
      const key = `dream:${user.userId}:${dreamId}`;
      const exists = await env.DREAMS_KV.get(key);
      if (!exists) return cors(new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { 'Content-Type': 'application/json' } }), origin);
      await env.DREAMS_KV.delete(key);
      return cors(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }), origin);
    }

    // LLM-интерпретация сна
    if (pathname === "/llm" && request.method === "POST") {
      const user = await auth(request);
      if (!user) return cors(new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } }), origin);
      const { dream } = await request.json();
      if (!dream) return cors(new Response(JSON.stringify({ error: "No dream" }), { status: 400, headers: { 'Content-Type': 'application/json' } }), origin);

      // Вызов DeepSeek LLM
      const apiKey = env.DEEPSEEK_API_KEY; // ключ должен быть в переменных окружения Cloudflare
      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "Ты — толкователь снов. Кратко и понятно объясняй смысл сна, не повторяй текст сна, не пиши лишнего." },
            { role: "user", content: dream }
          ]
        })
      });
      const data = await response.json();
      const result = data.choices?.[0]?.message?.content || "Ошибка интерпретации";
      return cors(new Response(JSON.stringify({ result }), { status: 200, headers: { 'Content-Type': 'application/json' } }), origin);
    }

    // Если ничего не подошло
    return cors(new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { 'Content-Type': 'application/json' } }), origin);
  }
};
