// Cliente da IA do app. As chamadas passam pela função serverless /api/ia,
// onde a chave do Gemini fica protegida (nunca exposta no navegador).

import { auth } from '../firebase';

export interface RdoEstruturado {
  atividades: string;
  equipe: string;
  materiais: string;
  ocorrencias: string;
  observacoes: string;
}

async function chamarIa(body: Record<string, unknown>): Promise<any> {
  const user = auth.currentUser;
  if (!user) throw new Error('Você precisa estar conectado para usar a IA.');
  const token = await user.getIdToken();

  const res = await fetch('/api/ia', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    throw new Error('Limite diário de uso da IA atingido. Tente novamente amanhã.');
  }
  if (!res.ok) {
    throw new Error('A IA está indisponível no momento. Preencha manualmente ou tente de novo.');
  }
  return res.json();
}

/** Envia um áudio gravado (base64, sem o prefixo data:) e recebe o RDO estruturado. */
export async function estruturarPorAudio(
  audioBase64: string,
  mimeType: string
): Promise<RdoEstruturado> {
  const json = await chamarIa({ tipo: 'estruturar', audioBase64, mimeType });
  return json as RdoEstruturado;
}

/** Reescreve um texto como redação técnica de RDO (sem inventar fatos). */
export async function melhorarTexto(texto: string): Promise<string> {
  const json = await chamarIa({ tipo: 'melhorar', texto });
  return String(json.texto || texto);
}
