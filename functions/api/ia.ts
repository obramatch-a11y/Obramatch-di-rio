// POST /api/ia — IA do app com a chave protegida no servidor.
// Body: { tipo: 'estruturar' | 'melhorar', texto?, audioBase64?, mimeType? }
// Auth: header "Authorization: Bearer <Firebase ID token>"

import { Env } from '../_lib/google';
import { fsGet, fsSet } from '../_lib/firestore';
import { estruturarRdo, melhorarTextoRdo } from '../_lib/groq';
import { lerEstadoUso, dentroDaFranquia, consumirFranquia, mensagemFranquia, TipoUsoIa } from '../_lib/uso';

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

export const onRequestPost = async (ctx: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = ctx;

  if (!env.GROQ_API_KEY && !env.GEMINI_API_KEY) {
    return resposta(503, { erro: 'IA não configurada no servidor.' });
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

  // Franquia por plano (servidor). Checa antes; consome SÓ após sucesso.
  const tipoUso: TipoUsoIa = tipo === 'estruturar' ? 'transc' : 'melhoria';
  let estado;
  try {
    estado = await lerEstadoUso(env, uid);
  } catch (err: any) {
    console.error('Erro ao ler estado de uso:', err?.message || err);
    return resposta(502, { erro: 'Falha ao verificar sua franquia. Tente novamente.' });
  }

  if (!dentroDaFranquia(estado, tipoUso)) {
    return resposta(429, { erro: mensagemFranquia(estado, tipoUso) });
  }

  if (body.audioBase64 && String(body.audioBase64).length > estado.limites.audioMaxBase64) {
    const minutos = estado.plano === 'pro' ? '5 minutos' : '1 minuto e meio';
    return resposta(413, { erro: `Áudio muito longo para o seu plano. Grave até ${minutos}.` });
  }

  if (body.audioBase64 && body.mimeType && !String(body.mimeType).startsWith('audio/')) {
    return resposta(400, { erro: 'Formato de áudio inválido.' });
  }

  if (body.texto && String(body.texto).length > 20_000) {
    return resposta(400, { erro: 'Texto muito longo.' });
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
      await consumirFranquia(env, uid, estado, 'transc');
      return resposta(200, rdo as any);
    }

    // melhorar
    if (!body.texto || !String(body.texto).trim()) {
      return resposta(400, { erro: 'Envie o texto a ser melhorado.' });
    }
    const texto = await melhorarTextoRdo(env, String(body.texto));
    await consumirFranquia(env, uid, estado, 'melhoria');
    return resposta(200, { texto });
  } catch (err: any) {
    console.error('Erro na IA:', err?.message || err);
    return resposta(502, { erro: 'A IA está indisponível no momento. Tente novamente em instantes.' });
  }
};
