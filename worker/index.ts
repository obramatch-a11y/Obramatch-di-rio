// Entrada do Cloudflare Worker (modo Workers com assets estáticos).
// O deploy atual da Cloudflare é do tipo "Workers", que NÃO executa a pasta
// functions/ automaticamente. Este arquivo registra explicitamente cada rota
// de API e serve os assets estáticos no restante das requisições.

import { onRequestPost as iaPost } from '../functions/api/ia';
import { onRequestPost as telegramPost } from '../functions/api/telegram';
import { onRequestGet as setupWebhookGet } from '../functions/api/setup-webhook';
import { onRequestGet as perfilPublicoGet } from '../functions/api/perfil-publico';
import { onRequestGet as diagnosticoGet } from '../functions/api/diagnostico';
import { onRequestPost as archiveWorkPost } from '../functions/api/obras/archive';
import { onRequestPost as reactivateWorkPost } from '../functions/api/obras/reactivate';
import { onRequestPost as deletePhotoPost } from '../functions/api/storage/delete-photo';
import { onRequestPost as deleteDiaryPost } from '../functions/api/diarios/delete';
import type { Env as ApiEnv } from '../functions/_lib/google';

interface RateLimiter {
  limit: (options: { key: string }) => Promise<{ success: boolean }>;
}

interface Env extends ApiEnv {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  IA_LIMIT?: RateLimiter;
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname.startsWith('/api/')) {
      const ctx = { request, env };
      try {
        if (pathname === '/api/ia' && request.method === 'POST') {
          // Rate limit por IP (anti-abuso). Só bloqueia se o binding existir.
          if (env.IA_LIMIT) {
            const ip = request.headers.get('CF-Connecting-IP') || 'desconhecido';
            const { success } = await env.IA_LIMIT.limit({ key: ip });
            if (!success) {
              return new Response(
                JSON.stringify({ erro: 'Muitas solicitações em pouco tempo. Aguarde alguns segundos e tente novamente.' }),
                {
                  status: 429,
                  headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Cache-Control': 'no-store',
                    'Retry-After': '60',
                  },
                },
              );
            }
          }
          return await iaPost(ctx);
        }

        if (pathname === '/api/telegram' && request.method === 'POST') return await telegramPost(ctx);
        if (pathname === '/api/setup-webhook' && request.method === 'GET') return await setupWebhookGet(ctx);
        if (pathname === '/api/perfil-publico' && request.method === 'GET') return await perfilPublicoGet(ctx);
        if (pathname === '/api/diagnostico' && request.method === 'GET') return await diagnosticoGet(ctx);

        // Rotas autoritativas usadas pelo app/TWA.
        if (pathname === '/api/obras/archive' && request.method === 'POST') return await archiveWorkPost(ctx);
        if (pathname === '/api/obras/reactivate' && request.method === 'POST') return await reactivateWorkPost(ctx);
        if (pathname === '/api/storage/delete-photo' && request.method === 'POST') return await deletePhotoPost(ctx);
        if (pathname === '/api/diarios/delete' && request.method === 'POST') return await deleteDiaryPost(ctx);

        return json(404, { erro: 'Rota de API não encontrada.' });
      } catch (error) {
        console.error('Erro na API:', error instanceof Error ? error.message : error);
        return json(500, { erro: 'Erro interno.' });
      }
    }

    // Todo o resto: site estático com headers de segurança.
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)');
    headers.set('Content-Security-Policy', "frame-ancestors 'none'; object-src 'none'; base-uri 'self'");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};