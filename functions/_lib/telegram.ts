// Helpers da API oficial de bots do Telegram.

import { Env } from './google';

const API = (env: Env) => `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;

export interface TecladoInline {
  inline_keyboard: { text: string; callback_data: string }[][];
}

export async function enviarMensagem(
  env: Env,
  chatId: number,
  texto: string,
  teclado?: TecladoInline
): Promise<void> {
  await fetch(`${API(env)}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: texto,
      parse_mode: 'HTML',
      ...(teclado ? { reply_markup: teclado } : {}),
    }),
  });
}

export async function enviarAcao(env: Env, chatId: number, acao = 'typing'): Promise<void> {
  await fetch(`${API(env)}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: acao }),
  });
}

export async function responderCallback(env: Env, callbackId: string, texto?: string): Promise<void> {
  await fetch(`${API(env)}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, ...(texto ? { text: texto } : {}) }),
  });
}

export async function removerTeclado(env: Env, chatId: number, messageId: number): Promise<void> {
  await fetch(`${API(env)}/editMessageReplyMarkup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
  });
}

function bufferParaBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let bin = '';
  const bloco = 8192;
  for (let i = 0; i < bytes.length; i += bloco) {
    bin += String.fromCharCode(...bytes.subarray(i, i + bloco));
  }
  return btoa(bin);
}

/** Baixa um arquivo do Telegram (voz, foto) e retorna em base64 + mime. */
export async function baixarArquivo(
  env: Env,
  fileId: string
): Promise<{ base64: string; mime: string; tamanho: number } | null> {
  const info = await fetch(`${API(env)}/getFile?file_id=${encodeURIComponent(fileId)}`);
  if (!info.ok) return null;
  const json = await info.json();
  const path = json?.result?.file_path;
  if (!path) return null;

  const res = await fetch(`https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${path}`);
  if (!res.ok) return null;
  const buffer = await res.arrayBuffer();

  const ext = String(path).split('.').pop()?.toLowerCase() || '';
  const mime =
    ext === 'oga' || ext === 'ogg' ? 'audio/ogg'
    : ext === 'mp3' ? 'audio/mpeg'
    : ext === 'm4a' ? 'audio/mp4'
    : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
    : ext === 'png' ? 'image/png'
    : 'application/octet-stream';

  return { base64: bufferParaBase64(buffer), mime, tamanho: buffer.byteLength };
}

// ---- Clima oficial (Open-Meteo) ----
export interface ClimaOficial {
  condicao: string;
  tempMax: number;
  tempMin: number;
  chuvaMm: number;
  fonte: 'open-meteo';
}

function converterWeatherCode(code: number): string {
  if (code === 0 || code === 1) return 'Ensolarado';
  if (code === 2 || code === 3 || code === 45 || code === 48) return 'Nublado';
  if (code >= 95) return 'Instável';
  if (code >= 51) return 'Chuvoso';
  return 'Nublado';
}

export async function buscarClimaOficial(
  lat: number,
  lon: number,
  dataISO: string
): Promise<ClimaOficial | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum` +
      `&timezone=America%2FSao_Paulo&start_date=${dataISO}&end_date=${dataISO}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const d = json?.daily;
    if (!d?.weather_code?.length) return null;
    return {
      condicao: converterWeatherCode(Number(d.weather_code[0])),
      tempMax: Math.round(Number(d.temperature_2m_max[0])),
      tempMin: Math.round(Number(d.temperature_2m_min[0])),
      chuvaMm: Math.round(Number(d.precipitation_sum[0] ?? 0) * 10) / 10,
      fonte: 'open-meteo',
    };
  } catch {
    return null;
  }
}

// ---- Upload de foto ao Supabase Storage (credencial de serviço) ----
export async function uploadFotoSupabase(
  env: Env,
  base64: string,
  mime: string,
  path: string
): Promise<string | null> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return null;
  try {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const res = await fetch(`${env.SUPABASE_URL}/storage/v1/object/diario-fotos/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        apikey: env.SUPABASE_SERVICE_KEY,
        'Content-Type': mime,
        'x-upsert': 'true',
      },
      body: bytes,
    });
    if (!res.ok) return null;
    return `${env.SUPABASE_URL}/storage/v1/object/public/diario-fotos/${path}`;
  } catch {
    return null;
  }
}
