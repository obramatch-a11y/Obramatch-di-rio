// GET /api/diagnostico?secret=SEU_TELEGRAM_SECRET
// Testa cada credencial DE VERDADE e devolve um relatório do que está
// funcionando e do que está quebrado. Não expõe nenhum valor secreto.

import { Env, obterAccessToken } from '../_lib/google';

export const onRequestGet = async (ctx: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = ctx;
  const url = new URL(request.url);

  if (!env.TELEGRAM_SECRET || url.searchParams.get('secret') !== env.TELEGRAM_SECRET) {
    return new Response('unauthorized', { status: 401 });
  }

  const r: Record<string, string> = {};

  // 1) Presença das variáveis
  r['1_GEMINI_API_KEY'] = env.GEMINI_API_KEY
    ? `presente (começa com "${env.GEMINI_API_KEY.slice(0, 3)}", ${env.GEMINI_API_KEY.length} caracteres)`
    : 'FALTANDO';
  r['2_TELEGRAM_BOT_TOKEN'] = env.TELEGRAM_BOT_TOKEN ? 'presente' : 'FALTANDO';
  r['3_FIREBASE_WEB_API_KEY'] = env.FIREBASE_WEB_API_KEY ? 'presente' : 'FALTANDO';
  r['4_SUPABASE_URL'] = env.SUPABASE_URL ? 'presente' : 'faltando (fotos usarão modo alternativo)';
  r['5_SUPABASE_SERVICE_KEY'] = env.SUPABASE_SERVICE_KEY ? 'presente' : 'faltando (fotos usarão modo alternativo)';

  // 2) FIREBASE_SERVICE_ACCOUNT é um JSON válido e completo?
  try {
    const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT || '');
    if (sa.client_email && sa.private_key && sa.project_id) {
      r['6_FIREBASE_SERVICE_ACCOUNT'] = `JSON ok (projeto ${sa.project_id})`;
    } else {
      r['6_FIREBASE_SERVICE_ACCOUNT'] = 'PROBLEMA: JSON válido mas incompleto (faltam client_email / private_key / project_id)';
    }
  } catch {
    r['6_FIREBASE_SERVICE_ACCOUNT'] = env.FIREBASE_SERVICE_ACCOUNT
      ? 'PROBLEMA: o valor colado NÃO é um JSON válido (foi cortado ou alterado ao colar)'
      : 'FALTANDO';
  }

  // 3) A credencial de serviço autentica no Google de verdade?
  try {
    await obterAccessToken(env);
    r['7_autenticacao_google'] = 'OK — credencial de serviço funciona (Firestore e bot podem gravar)';
  } catch (e: any) {
    r['7_autenticacao_google'] = 'FALHOU: ' + String(e?.message || e).slice(0, 180);
  }

  // 4) O Gemini responde com esta chave? (mesma chamada que o app usa)
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Responda apenas: ok' }] }] }),
      }
    );
    if (res.ok) {
      r['8_gemini'] = 'OK — a IA respondeu';
    } else {
      const detalhe = (await res.text()).slice(0, 250);
      r['8_gemini'] = `FALHOU: HTTP ${res.status} — ${detalhe}`;
    }
  } catch (e: any) {
    r['8_gemini'] = 'FALHOU: ' + String(e?.message || e).slice(0, 180);
  }

  // 5) A chave web valida sessões de login? (token falso: 400 = chave ok)
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_WEB_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: 'teste' }) }
    );
    if (res.status === 400) {
      r['9_validacao_de_login'] = 'OK — chave web aceita pelo Google';
    } else {
      const detalhe = (await res.text()).slice(0, 250);
      r['9_validacao_de_login'] = `ATENÇÃO: HTTP ${res.status} — ${detalhe}`;
    }
  } catch (e: any) {
    r['9_validacao_de_login'] = 'FALHOU: ' + String(e?.message || e).slice(0, 180);
  }

  return new Response(JSON.stringify(r, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
