// Upload de fotos ao Supabase Storage (bucket público 'diario-fotos').
// Se as variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não estiverem
// configuradas, retorna o próprio base64 (fallback) para o app nunca quebrar.

const env = (import.meta as any).env || {};
const SUPABASE_URL: string = env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY: string = env.VITE_SUPABASE_ANON_KEY || '';
const BUCKET = 'diario-fotos';

export function storageConfigurado(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function base64ParaBlob(base64: string): { blob: Blob; ext: string } {
  const [meta, data] = base64.split(',');
  const mime = meta.match(/data:(.*?);/)?.[1] || 'image/jpeg';
  const ext = mime.split('/')[1] || 'jpg';
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return { blob: new Blob([arr], { type: mime }), ext };
}

/**
 * Envia uma imagem base64 ao Supabase Storage e retorna a URL pública.
 * Em caso de erro ou storage não configurado, retorna o base64 original.
 */
export async function uploadFoto(base64: string, path: string): Promise<string> {
  if (!storageConfigurado()) return base64;
  try {
    const { blob, ext } = base64ParaBlob(base64);
    const objectPath = `${path}.${ext}`;
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectPath}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': blob.type,
          'x-upsert': 'true',
        },
        body: blob,
      }
    );
    if (!res.ok) {
      console.warn('Falha no upload ao Supabase, usando base64 local.');
      return base64;
    }
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;
  } catch (err) {
    console.warn('Erro no upload ao Supabase:', err);
    return base64;
  }
}
