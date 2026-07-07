// POST /api/ia — IA do app com a chave protegida no servidor.
// Body: { tipo: 'estruturar' | 'melhorar', texto?, audioBase64?, mimeType? }
// Auth: header "Authorization: Bearer <Firebase ID token>"

import { Env } from '../_lib/google';
import { fsGet, fsSet } from '../_lib/firestore';
import { estruturarRdo, melhorarTextoRdo } from '../_lib/gemini';

const LIMITE_DIARIO = 20;

function resposta(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Valida o ID token do Firebase Auth e retorna o uid. */
async function validarIdToken(env: Env, token: string): Promise<string | null> {
  if (!env.FIREBASE_WEB_API_KEY) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_WEB_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.users?.[0]?.localId || null;
  } catch {
    return null;
  }
}

/** Controle do nível gratuito: máximo de chamadas por usuário por dia. */
async function dentroDoLimite(env: Env, uid: string): Promise<boolean> {
  const hoje = new Date().toISOString().split('T')[0];
  const docPath = `usuarios/${uid}`;
  let count = 0;
  try {
    const doc = await fsGet(env, docPath);
    const uso = doc?.data?.iaUso;
    if (uso && uso.data === hoje) count = Number(uso.count) || 0;
  } catch {
    // primeiro uso do dia
  }
  if (count >= LIMITE_DIARIO) return false;
  await fsSet(env, docPath, { iaUso: { data: hoje, count: count + 1 } });
  return true;
}

export const onRequestPost = async (ctx: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = ctx;

  if (!env.GEMINI_API_KEY) {
    return resposta(503, { erro: 'IA não configurada. Defina GEMINI_API_KEY nas variáveis da Cloudflare Pages.' });
  }

  // Autenticação
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return resposta(401, { erro: 'Não autenticado.' });
  const uid = await validarIdToken(env, token);
  if (!uid) return resposta(401, { erro: 'Sessão inválida. Entre novamente no app.' });

  // Corpo
  let body: any;
  try {
    body = await request.json();
  } catch {
    return resposta(400, { erro: 'JSON inválido.' });
  }
  const tipo = body?.tipo;
  if (tipo !== 'estruturar' && tipo !== 'melhorar') {
    return resposta(400, { erro: "Campo 'tipo' deve ser 'estruturar' ou 'melhorar'." });
  }
  if (body.audioBase64 && String(body.audioBase64).length > 14_000_000) {
    return resposta(413, { erro: 'Áudio muito longo. Grave até ~5 minutos.' });
  }

  // Limite diário (nível gratuito do Gemini) — melhor esforço:
  // se o Firestore falhar aqui, a IA continua funcionando mesmo assim.
  try {
    if (!(await dentroDoLimite(env, uid))) {
      return resposta(429, { erro: 'Limite diário de uso da IA atingido.' });
    }
  } catch (err: any) {
    console.error('Aviso: falha ao registrar limite diário:', err?.message || err);
  }

  try {
    if (tipo === 'estruturar') {
      if (!body.audioBase64 && !body.texto) {
        return resposta(400, { erro: 'Envie um áudio ou um texto para estruturar.' });
      }
      const rdo = await estruturarRdo(env, {
        texto: body.texto,
        audioBase64: body.audioBase64,
        mimeType: body.mimeType,
      });
      return resposta(200, rdo as any);
    }

    // melhorar
    if (!body.texto || !String(body.texto).trim()) {
      return resposta(400, { erro: 'Envie o texto a ser melhorado.' });
    }
    const texto = await melhorarTextoRdo(env, String(body.texto));
    return resposta(200, { texto });
  } catch (err: any) {
    console.error('Erro na IA:', err?.message || err);
    return resposta(502, { erro: 'A IA está indisponível no momento. Tente novamente em instantes.' });
  }
};
