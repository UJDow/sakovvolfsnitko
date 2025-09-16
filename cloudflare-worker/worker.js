
import bcrypt from "bcryptjs";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/register') {
      const { email, password, name } = await request.json();

      const existing = await env.USERS_KV.get(`user:${email}`);
      if (existing) {
        return new Response(JSON.stringify({ error: 'user_exists' }), { status: 409 });
      }

      // Безопасное хэширование пароля
      const passwordHash = await bcrypt.hash(password, 10);

      const userData = JSON.stringify({
        email,
        name,
        passwordHash,
        role: 'user',
        createdAt: Date.now()
      });

      await env.USERS_KV.put(`user:${email}`, userData);

      return new Response(JSON.stringify({ success: true }), { status: 201 });
    }

    return new Response('Not found', { status: 404 });
  }
}
