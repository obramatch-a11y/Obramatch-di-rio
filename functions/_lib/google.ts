// Autenticação Google via service account (JWT RS256 assinado com Web Crypto)
// + helpers do Firestore REST. Roda em Cloudflare Pages Functions.

export interface Env {
  GEMINI_API_KEY: string;
  GROQ_API_KEY?: string;            // Chave da API Groq (Whisper + Llama)
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_SECRET: string;
  FIREBASE_SERVICE_ACCOUNT: string; // JSON completo da credencial de serviço
  FIREBASE_DB_ID?: string;          // ID do banco (padrão: "(default)")
  FIREBASE_WEB_API_KEY?: string;    // Chave web pública (validação de ID token)
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_KEY?: string;
}

function base64url(data: ArrayBuffer | string): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemParaArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

let tokenCache: { token: string; expira: number } | null = null;

export async function obterAccessToken(env: Env): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expira - 60_000) return tokenCache.token;

  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const agora = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      iat: agora,
      exp: agora + 3600,
    })
  );

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemParaArrayBuffer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const assinatura = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(`${header}.${payload}`)
  );
  const jwt = `${header}.${payload}.${base64url(assinatura)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`,
  });
  if (!res.ok) throw new Error('Falha ao obter token Google: ' + (await res.text()));
  const json = await res.json();
  tokenCache = { token: json.access_token, expira: Date.now() + json.expires_in * 1000 };
  return tokenCache.token;
}

export function projetoEBanco(env: Env): { projectId: string; dbId: string } {
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  return { projectId: sa.project_id, dbId: env.FIREBASE_DB_ID || '(default)' };
}
