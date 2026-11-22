// Cliente da IA do app. As chamadas passam pela função serverless /api/ia,
// onde a chave do Gemini fica protegida (nunca exposta no navegador).

import { auth } from '../firebase';

/** A IA às vezes devolve lista ou objeto em vez de texto; isso derrubava a tela inteira. */
export function comoTexto(valor: unknown): string {
  if (valor == null) return '';
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
  if (Array.isArray(valor)) return valor.map(comoTexto).filter(Boolean).join('\n');
  if (typeof valor === 'object') {
    return Object.entries(valor as Record<string, unknown>)
      .map(([k, v]) => { const t = comoTexto(v); return t ? `${k}: ${t}` : ''; })
      .filter(Boolean).join('\n');
  }
  return '';
}

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
    let detalhe = '';
    try {
      const json = await res.json();
      detalhe = String(json?.erro || '');
    } catch {
      // resposta sem JSON
    }
    throw new Error(
      detalhe || `A IA está indisponível no momento (erro ${res.status}). Preencha manualmente ou tente de novo.`
    );
  }
  return res.json();
}

/** Envia um áudio gravado (base64, sem o prefixo data:) e recebe o RDO estruturado. */
export async function estruturarPorAudio(
  audioBase64: string,
  mimeType: string
): Promise<RdoEstruturado> {
  const json = (await chamarIa({ tipo: 'estruturar', audioBase64, mimeType: (mimeType || 'audio/webm').split(';')[0].trim() })) ?? {};
  return {
    atividades: comoTexto(json.atividades),
    equipe: comoTexto(json.equipe),
    materiais: comoTexto(json.materiais),
    ocorrencias: comoTexto(json.ocorrencias),
    observacoes: comoTexto(json.observacoes),
  };
}

/** Reescreve um texto como redação técnica de RDO (sem inventar fatos). */
export async function melhorarTexto(texto: string): Promise<string> {
  const json = await chamarIa({ tipo: 'melhorar', texto });
  return comoTexto(json?.texto) || texto;
}
