const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;
const BUCKET = 'diario-fotos';

/**
 * Converte uma string base64 (data URL) para Blob.
 */
function base64ToBlob(base64: string): { blob: Blob; ext: string } {
  const [header, data] = base64.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const ext = mime.split('/')[1] || 'jpg';
  const binary = atob(data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return { blob: new Blob([array], { type: mime }), ext };
}

/**
 * Envia uma imagem base64 ao Supabase Storage e retorna a URL pública.
 * @param base64 - Data URL da imagem (ex: "data:image/jpeg;base64,...")
 * @param path   - Caminho no bucket (ex: "obras/obraId/diarios/diarioId/foto-1")
 */
export async function uploadFoto(base64: string, path: string): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Variáveis de ambiente do Supabase não configuradas (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).');
  }

  const { blob, ext } = base64ToBlob(base64);
  const filePath = `${path}.${ext}`;
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filePath}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': blob.type,
      'x-upsert': 'true',
    },
    body: blob,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Falha ao enviar foto ao Supabase: ${response.status} — ${errText}`);
  }

  // URL pública do objeto
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filePath}`;
  return publicUrl;
}
