// Entrada do Cloudflare Worker (modo Workers com assets estáticos).
// O deploy atual da Cloudflare é do tipo "Workers", que NÃO executa a pasta
// functions/ (convenção do Cloudflare Pages). Este arquivo faz a ponte:
// roteia /api/* para os mesmos handlers e serve o site estático no resto.

import { onRequestPost as iaPost } from '../functions/api/ia';
import { onRequestPost as telegramPost } from '../functions/api/telegram';
import { onRequestGet as setupWebhookGet } from '../functions/api/setup-webhook';
import { onRequestGet as perfilPublicoGet } from '../functions/api/perfil-publico';
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
        return json(404, { erro: 'Rota de API não encontrada.' });
      } catch (err) {
        console.error('Erro na API:', err instanceof Error ? err.message : err);
        return json(500, { erro: 'Erro interno.' });
      }
    }

    // Todo o resto: site estático (SPA fallback configurado no wrangler.jsonc)
    return env.ASSETS.fetch(request);
  },
};
