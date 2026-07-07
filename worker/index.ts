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
        // Diagnóstico temporário: mostra APENAS se cada variável existe e o
        // tamanho do TELEGRAM_SECRET (para achar espaço/typo). Nenhum valor
        // secreto é exposto. Remover depois que estiver tudo funcionando.
        if (pathname === '/api/diag') {
          const e = env as unknown as Record<string, string | undefined>;
          return json(200, {
            TELEGRAM_SECRET_presente: !!e.TELEGRAM_SECRET,
            TELEGRAM_SECRET_tamanho: e.TELEGRAM_SECRET ? e.TELEGRAM_SECRET.length : 0,
            TELEGRAM_SECRET_esperado_tamanho: 27,
            TELEGRAM_BOT_TOKEN_presente: !!e.TELEGRAM_BOT_TOKEN,
            GEMINI_API_KEY_presente: !!e.GEMINI_API_KEY,
            FIREBASE_SERVICE_ACCOUNT_presente: !!e.FIREBASE_SERVICE_ACCOUNT,
            FIREBASE_WEB_API_KEY_presente: !!e.FIREBASE_WEB_API_KEY,
            FIREBASE_DB_ID_presente: !!e.FIREBASE_DB_ID,
            SUPABASE_URL_presente: !!e.SUPABASE_URL,
            SUPABASE_SERVICE_KEY_presente: !!e.SUPABASE_SERVICE_KEY,
          });
        }
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
