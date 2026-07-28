import type { Env } from '../functions/_lib/google';
import { fsDelete, fsGet, fsList, fsQuery, fsSet } from '../functions/_lib/firestore';

type WorkerContext = { request: Request; env: Env };

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function validarIdToken(env: Env, request: Request): Promise<string | null> {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token || !env.FIREBASE_WEB_API_KEY) return null;

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_WEB_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      },
    );
    if (!response.ok) return null;
    const payload = await response.json() as { users?: Array<{ localId?: string }> };
    return payload.users?.[0]?.localId || null;
  } catch {
    return null;
  }
}

async function corpoJson(request: Request): Promise<Record<string, unknown> | null> {
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().includes('application/json')) return null;
  try {
    const body = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body)
      ? body as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function textoId(value: unknown): string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(value) ? value : '';
}

async function autenticar(ctx: WorkerContext): Promise<{ uid: string; body: Record<string, unknown> } | Response> {
  const uid = await validarIdToken(ctx.env, ctx.request);
  if (!uid) return json(401, { message: 'Sessão inválida. Entre novamente no aplicativo.' });
  const body = await corpoJson(ctx.request);
  if (!body) return json(400, { message: 'Envie um corpo JSON válido.' });
  return { uid, body };
}

async function obterObraDoUsuario(env: Env, uid: string, obraId: string) {
  const obra = await fsGet(env, `obras/${obraId}`);
  if (!obra) return { error: json(404, { message: 'Obra não encontrada.' }) };
  if (obra.data.ownerId !== uid) return { error: json(403, { message: 'Você não tem acesso a esta obra.' }) };
  if (obra.data.lockedByPlan === true) return { error: json(423, { message: 'Esta obra está bloqueada pelo plano.' }) };
  return { obra };
}

async function obterPlano(env: Env, uid: string): Promise<'free' | 'pro'> {
  const plano = await fsGet(env, `planos/${uid}`);
  return plano?.data?.plano === 'pro' ? 'pro' : 'free';
}

export async function archiveWorkPost(ctx: WorkerContext): Promise<Response> {
  const auth = await autenticar(ctx);
  if (auth instanceof Response) return auth;
  const obraId = textoId(auth.body.obraId);
  if (!obraId || auth.body.arquivada !== true) return json(400, { message: 'Dados de arquivamento inválidos.' });

  const checked = await obterObraDoUsuario(ctx.env, auth.uid, obraId);
  if ('error' in checked) return checked.error;
  await fsSet(ctx.env, `obras/${obraId}`, {
    arquivada: true,
    updatedAt: new Date().toISOString(),
  });
  return json(200, { success: true, arquivada: true });
}

export async function reactivateWorkPost(ctx: WorkerContext): Promise<Response> {
  const auth = await autenticar(ctx);
  if (auth instanceof Response) return auth;
  const obraId = textoId(auth.body.obraId);
  if (!obraId) return json(400, { message: 'Obra inválida.' });

  const checked = await obterObraDoUsuario(ctx.env, auth.uid, obraId);
  if ('error' in checked) return checked.error;

  const planTier = await obterPlano(ctx.env, auth.uid);
  const limit = planTier === 'pro' ? 10 : 2;
  const obras = await fsQuery(ctx.env, 'obras', 'ownerId', auth.uid, 1000);
  const activeWorks = obras.filter(({ data }) => data.arquivada !== true && data.lockedByPlan !== true).length;
  if (checked.obra.data.arquivada === true && activeWorks >= limit) {
    return json(409, {
      message: `Seu plano permite até ${limit} obras ativas. Arquive outra obra ou altere o plano para reativar esta.`,
      activeWorksAfter: activeWorks,
      limit,
      planTier,
    });
  }

  await fsSet(ctx.env, `obras/${obraId}`, {
    arquivada: false,
    updatedAt: new Date().toISOString(),
  });
  return json(200, {
    success: true,
    arquivada: false,
    activeWorksAfter: checked.obra.data.arquivada === true ? activeWorks + 1 : activeWorks,
    limit,
    planTier,
  });
}

export async function deletePhotoPost(ctx: WorkerContext): Promise<Response> {
  const auth = await autenticar(ctx);
  if (auth instanceof Response) return auth;
  const obraId = textoId(auth.body.obraId);
  const diarioId = textoId(auth.body.diarioId);
  const photoId = textoId(auth.body.photoId);
  if (!obraId || !diarioId || !photoId) return json(400, { message: 'Identificação da foto inválida.' });

  const checked = await obterObraDoUsuario(ctx.env, auth.uid, obraId);
  if ('error' in checked) return checked.error;
  const diario = await fsGet(ctx.env, `obras/${obraId}/diarios/${diarioId}`);
  if (!diario || diario.data.ownerId !== auth.uid) return json(404, { message: 'RDO não encontrado.' });
  if (diario.data.lockedByAdmin === true) return json(423, { message: 'Este RDO está bloqueado para alterações.' });
  const foto = await fsGet(ctx.env, `obras/${obraId}/diarios/${diarioId}/fotos/${photoId}`);
  if (!foto) return json(200, { success: true, message: 'A foto já havia sido excluída.' });
  if (foto.data.ownerId !== auth.uid) return json(403, { message: 'Você não tem acesso a esta foto.' });

  await fsDelete(ctx.env, `obras/${obraId}/diarios/${diarioId}/fotos/${photoId}`);
  return json(200, { success: true, jobCreated: false, jobId: null });
}

export async function deleteDiaryPost(ctx: WorkerContext): Promise<Response> {
  const auth = await autenticar(ctx);
  if (auth instanceof Response) return auth;
  const obraId = textoId(auth.body.obraId);
  const diarioId = textoId(auth.body.diarioId);
  if (!obraId || !diarioId) return json(400, { message: 'Identificação do RDO inválida.' });

  const checked = await obterObraDoUsuario(ctx.env, auth.uid, obraId);
  if ('error' in checked) return checked.error;
  const diario = await fsGet(ctx.env, `obras/${obraId}/diarios/${diarioId}`);
  if (!diario) return json(200, { success: true, message: 'O RDO já havia sido excluído.' });
  if (diario.data.ownerId !== auth.uid) return json(403, { message: 'Você não tem acesso a este RDO.' });
  if (diario.data.lockedByAdmin === true) return json(423, { message: 'Este RDO está bloqueado para alterações.' });

  const photoCollectionPath = `obras/${obraId}/diarios/${diarioId}/fotos`;
  const fotos = await fsList(ctx.env, photoCollectionPath);
  for (const foto of fotos) {
    if (foto.data.ownerId !== auth.uid) {
      return json(409, { message: 'A exclusão foi interrompida porque existe uma foto com proprietário divergente.' });
    }
    await fsDelete(ctx.env, `${photoCollectionPath}/${foto.id}`);
  }
  await fsDelete(ctx.env, `obras/${obraId}/diarios/${diarioId}`);
  return json(200, { success: true, jobCreated: false, jobId: null, deletedPhotos: fotos.length });
}
