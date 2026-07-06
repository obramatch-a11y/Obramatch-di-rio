// GET /api/setup-webhook?secret=SEU_TELEGRAM_SECRET
// Registra o webhook do bot apontando para /api/telegram deste mesmo domínio.
// Rode UMA vez no navegador após o deploy (e de novo se trocar o domínio).

import { Env } from '../_lib/google';

export const onRequestGet = async (ctx: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = ctx;
  const url = new URL(request.url);

  if (!env.TELEGRAM_SECRET || url.searchParams.get('secret') !== env.TELEGRAM_SECRET) {
    return new Response('unauthorized', { status: 401 });
  }
  if (!env.TELEGRAM_BOT_TOKEN) {
    return new Response('TELEGRAM_BOT_TOKEN não configurado nas variáveis da Cloudflare Pages.', { status: 503 });
  }

  const webhookUrl = `${url.origin}/api/telegram`;
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: env.TELEGRAM_SECRET,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: true,
    }),
  });
  const json = await res.json();

  return new Response(
    JSON.stringify({ webhook: webhookUrl, resultado: json }, null, 2),
    { headers: { 'Content-Type': 'application/json' } }
  );
};
