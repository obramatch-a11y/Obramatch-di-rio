// Controle de plano e franquias de IA no SERVIDOR.
// Documentos:
//   planos/{uid}            → { plano, desde, validade, origem } (escrita só por aqui)
//   uso_ia/{uid}_{AAAA-MM}  → contadores mensais/diários (escrita só por aqui)
// O cliente NUNCA escreve nessas coleções (regras do Firestore negam).

import { Env } from './google';
import { fsGet, fsSet } from './firestore';
import { limitesDoPlano, LimitesPlano } from './planos';

const FUSO = 'America/Recife';

function hojeISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: FUSO });
}
function mesAtual(): string {
  return hojeISO().slice(0, 7); // AAAA-MM
}

export type TipoUsoIa = 'transc' | 'melhoria';

export interface EstadoUso {
  plano: 'free' | 'pro';
  limites: LimitesPlano;
  docId: string;
  transcDia: number;
  transcMes: number;
  melhoriaDia: number;
  melhoriaMes: number;
}

/** Lê plano + uso do mês. Plano expirado (validade no passado) volta a free. */
export async function lerEstadoUso(env: Env, uid: string): Promise<EstadoUso> {
  let plano: 'free' | 'pro' = 'free';
  try {
    const p = await fsGet(env, `planos/${uid}`);
    if (p?.data?.plano === 'pro') {
      const validade = p.data.validade ? Date.parse(String(p.data.validade)) : null;
      if (!validade || validade > Date.now()) plano = 'pro';
    }
  } catch { /* sem doc = free */ }

  const docId = `${uid}_${mesAtual()}`;
  let transcDia = 0, transcMes = 0, melhoriaDia = 0, melhoriaMes = 0;
  try {
    const u = await fsGet(env, `uso_ia/${docId}`);
    if (u?.data) {
      transcMes = Number(u.data.transcMes) || 0;
      melhoriaMes = Number(u.data.melhoriaMes) || 0;
      if (u.data.dia === hojeISO()) {
        transcDia = Number(u.data.transcDia) || 0;
        melhoriaDia = Number(u.data.melhoriaDia) || 0;
      }
    }
  } catch { /* primeiro uso do mês */ }

  return { plano, limites: limitesDoPlano(plano), docId, transcDia, transcMes, melhoriaDia, melhoriaMes };
}

/** true se o usuário AINDA TEM franquia para o tipo pedido. NÃO consome. */
export function dentroDaFranquia(estado: EstadoUso, tipo: TipoUsoIa): boolean {
  if (tipo === 'transc') {
    return estado.transcDia < estado.limites.transcDia && estado.transcMes < estado.limites.transcMes;
  }
  return estado.melhoriaDia < estado.limites.melhoriaDia && estado.melhoriaMes < estado.limites.melhoriaMes;
}

/** Consome 1 unidade da franquia (chamar SOMENTE após a IA responder com sucesso). */
export async function consumirFranquia(env: Env, uid: string, estado: EstadoUso, tipo: TipoUsoIa): Promise<void> {
  const hoje = hojeISO();
  const dados: Record<string, any> = {
    uid,
    dia: hoje,
    ultimoUso: new Date().toISOString(),
    transcMes: estado.transcMes + (tipo === 'transc' ? 1 : 0),
    melhoriaMes: estado.melhoriaMes + (tipo === 'melhoria' ? 1 : 0),
    transcDia: estado.transcDia + (tipo === 'transc' ? 1 : 0),
    melhoriaDia: estado.melhoriaDia + (tipo === 'melhoria' ? 1 : 0),
  };
  try {
    await fsSet(env, `uso_ia/${estado.docId}`, dados);
  } catch (e: any) {
    console.error('Falha ao registrar consumo de IA:', e?.message || e);
  }
}

export function mensagemFranquia(estado: EstadoUso, tipo: TipoUsoIa): string {
  const l = estado.limites;
  const noDia = tipo === 'transc' ? estado.transcDia >= l.transcDia : estado.melhoriaDia >= l.melhoriaDia;
  const nome = tipo === 'transc' ? 'transcrições por voz' : 'melhorias de texto';
  return noDia
    ? `Você usou todas as ${nome} de hoje do seu plano. Amanhã a franquia diária renova. O registro manual continua ilimitado.`
    : `Você usou toda a franquia mensal de ${nome} do seu plano. Ela renova no dia 1º. O registro manual continua ilimitado.`;
}
