import type { User } from 'firebase/auth';

interface ApiErrorBody {
  message?: string;
  erro?: string;
}

export interface ArchiveWorkResult {
  success: boolean;
  arquivada?: boolean;
  message?: string;
  activeWorksAfter?: number;
  limit?: number;
  planTier?: 'free' | 'pro';
}

export interface DeleteResult {
  success: boolean;
  message?: string;
  jobCreated?: boolean;
  jobId?: string | null;
}

function ensureOnline(): void {
  if (!navigator.onLine) {
    throw new Error('Esta operação precisa de internet para ser confirmada com segurança. Conecte-se e tente novamente.');
  }
}

async function readError(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({})) as ApiErrorBody;
  return body.message || body.erro || `Falha na operação (${response.status}).`;
}

async function postAuthenticated<T>(
  user: User,
  path: string,
  payload: Record<string, unknown>,
): Promise<T> {
  ensureOnline();

  let idToken = await user.getIdToken();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(path, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      cache: 'no-store',
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });

    if (response.status === 401 && attempt === 0) {
      idToken = await user.getIdToken(true);
      continue;
    }

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    return response.json() as Promise<T>;
  }

  throw new Error('Sua sessão expirou. Entre novamente no aplicativo.');
}

export async function setWorkArchived(
  user: User,
  obraId: string,
  arquivada: boolean,
): Promise<ArchiveWorkResult> {
  const path = arquivada ? '/api/obras/archive' : '/api/obras/reactivate';
  return postAuthenticated<ArchiveWorkResult>(user, path, arquivada ? { obraId, arquivada: true } : { obraId });
}

export async function deleteDiaryAuthoritatively(
  user: User,
  obraId: string,
  diarioId: string,
): Promise<DeleteResult> {
  return postAuthenticated<DeleteResult>(user, '/api/diarios/delete', { obraId, diarioId });
}

export async function deletePhotoAuthoritatively(
  user: User,
  obraId: string,
  diarioId: string,
  photoId: string,
): Promise<DeleteResult> {
  return postAuthenticated<DeleteResult>(user, '/api/storage/delete-photo', {
    obraId,
    diarioId,
    photoId,
  });
}
