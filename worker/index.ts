// Entrada do Cloudflare Worker (modo Workers com assets estáticos).
// O deploy atual da Cloudflare é do tipo "Workers", que NÃO executa a pasta
// functions/ (convenção do Cloudflare Pages). Este arquivo faz a ponte:
// roteia /api/* para os mesmos handlers e serve o site estático no resto.

import { onRequestPost as iaPost } from '../functions/api/ia';
import { onRequestPost as telegramPost } from '../functions/api/telegram';
import { onRequestGet as setupWebhookGet } from '../functions/api/setup-webhook';
import { onRequestGet as perfilPublicoGet } from '../functions/api/perfil-publico';
import { onRequestGet as diagnosticoGet } from '../functions/api/diagnostico';
import type { Env as ApiEnv } from '../functions/_lib/google';

interface Env extends ApiEnv {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname.startsWith('/api/')) {
      const ctx = { request, env };
      try {
        if (pathname === '/api/ia' && request.method === 'POST') return await iaPost(ctx);
        if (pathname === '/api/telegram' && request.method === 'POST') return await telegramPost(ctx);
        if (pathname === '/api/setup-webhook' && request.method === 'GET') return await setupWebhookGet(ctx);
        if (pathname === '/api/perfil-publico' && request.method === 'GET') return await perfilPublicoGet(ctx);
        if (pathname === '/api/diagnostico' && request.method === 'GET') return await diagnosticoGet(ctx);
        return json(404, { erro: 'Rota de API não encontrada.' });
      } catch (err) {
        console.error('Erro na API:', err instanceof Error ? err.message : err);
        return json(500, { erro: 'Erro interno.' });
      }
    }

    // Todo o resto: site estático com headers de segurança
    const res = await env.ASSETS.fetch(request);
    const headers = new Headers(res.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)');
    headers.set('Content-Security-Policy', "frame-ancestors 'none'; object-src 'none'; base-uri 'self'");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  },
};
