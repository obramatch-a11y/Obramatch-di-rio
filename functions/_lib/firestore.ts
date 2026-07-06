// Firestore via REST (as funções usam a credencial de serviço, que não
// passa pelas regras de segurança do cliente — o app continua protegido).

import { Env, obterAccessToken, projetoEBanco } from './google';

function baseUrl(env: Env): string {
  const { projectId, dbId } = projetoEBanco(env);
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${encodeURIComponent(dbId)}/documents`;
}

// ---- Conversão JS <-> formato de valores do Firestore ----
export function paraValor(v: any): any {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(paraValor) } };
  if (typeof v === 'object') {
    const fields: Record<string, any> = {};
    for (const k of Object.keys(v)) fields[k] = paraValor(v[k]);
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

export function deValor(v: any): any {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(deValor);
  if ('mapValue' in v) {
    const out: Record<string, any> = {};
    for (const k of Object.keys(v.mapValue.fields || {})) out[k] = deValor(v.mapValue.fields[k]);
    return out;
  }
  return null;
}

export function paraCampos(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const k of Object.keys(obj)) fields[k] = paraValor(obj[k]);
  return fields;
}

export function deCampos(fields: Record<string, any> | undefined): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of Object.keys(fields || {})) out[k] = deValor(fields![k]);
  return out;
}

// ---- Operações ----
export async function fsGet(env: Env, path: string): Promise<{ id: string; data: Record<string, any> } | null> {
  const token = await obterAccessToken(env);
  const res = await fetch(`${baseUrl(env)}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore GET ${path}: ${await res.text()}`);
  const doc = await res.json();
  return { id: doc.name.split('/').pop(), data: deCampos(doc.fields) };
}

export async function fsSet(env: Env, path: string, dados: Record<string, any>, merge = true): Promise<void> {
  const token = await obterAccessToken(env);
  const mask = merge ? '?' + Object.keys(dados).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&') : '';
  const res = await fetch(`${baseUrl(env)}/${path}${mask}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: paraCampos(dados) }),
  });
  if (!res.ok) throw new Error(`Firestore SET ${path}: ${await res.text()}`);
}

export async function fsAdd(env: Env, collectionPath: string, dados: Record<string, any>): Promise<string> {
  const token = await obterAccessToken(env);
  const res = await fetch(`${baseUrl(env)}/${collectionPath}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: paraCampos(dados) }),
  });
  if (!res.ok) throw new Error(`Firestore ADD ${collectionPath}: ${await res.text()}`);
  const doc = await res.json();
  return doc.name.split('/').pop();
}

export async function fsDelete(env: Env, path: string): Promise<void> {
  const token = await obterAccessToken(env);
  await fetch(`${baseUrl(env)}/${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
}

/** Consulta simples: coleção filtrada por um campo == valor. */
export async function fsQuery(
  env: Env,
  colecao: string,
  campo: string,
  valor: any,
  limite = 10
): Promise<{ id: string; data: Record<string, any> }[]> {
  const token = await obterAccessToken(env);
  const { projectId, dbId } = projetoEBanco(env);
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${encodeURIComponent(dbId)}/documents:runQuery`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: colecao }],
          where: {
            fieldFilter: { field: { fieldPath: campo }, op: 'EQUAL', value: paraValor(valor) },
          },
          limit: limite,
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`Firestore QUERY ${colecao}: ${await res.text()}`);
  const linhas = await res.json();
  return (linhas as any[])
    .filter((l) => l.document)
    .map((l) => ({ id: l.document.name.split('/').pop(), data: deCampos(l.document.fields) }));
}
