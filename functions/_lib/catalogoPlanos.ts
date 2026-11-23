// Catálogo comercial lido no SERVIDOR (editado no painel administrativo do Landing_page_diario).
// Documentos (somente a credencial de serviço lê/escreve; regras do Firestore negam o cliente):
//   config_comercial/launch_promo        → { active }                    promoção de lançamento
//   config_comercial_planos/{planoId}    → { status, <limites>, features } plano do catálogo
//
// Regras de segurança (espelham o app e o servidor Vercel):
//  - Sem documento ou falha de leitura = padrões do código (nunca libera mais do que antes).
//  - Promoção ilegível = DESLIGADA.
//  - Plano desconhecido ou arquivado segue as regras do Pro.
//  - Free puro nunca herda limites do Pro (só com a promoção ativa).

import { Env } from './google';
import { fsGet } from './firestore';
import { LimitesPlano, PLANOS } from './planos';

const TTL_MS = 15_000;
const cache = new Map<string, { at: number; valor: any }>();

async function comCache<T>(chave: string, carregar: () => Promise<T>): Promise<T> {
  const agora = Date.now();
  const hit = cache.get(chave);
  if (hit && agora - hit.at < TTL_MS) return hit.valor as T;
  const valor = await carregar();
  cache.set(chave, { at: agora, valor });
  return valor;
}

export function limparCacheCatalogo(): void {
  cache.clear();
}

const CAMPOS_LIMITE = ['obrasAtivas', 'fotosPorRelatorio', 'transcDia', 'transcMes', 'melhoriaDia', 'melhoriaMes'] as const;
const RECURSO_PADRAO: Record<string, boolean> = { free: false, pro: true, equipe: true, empresa: true };

/** Promoção de lançamento ativa? Falha de leitura = false (não libera nada a mais). */
export async function promocaoAtiva(env: Env): Promise<boolean> {
  try {
    return await comCache('promo', async () => {
      const doc = await fsGet(env, 'config_comercial/launch_promo');
      return doc?.data?.active === true;
    });
  } catch (e: any) {
    console.error('Falha ao ler a promoção de lançamento (tratada como desligada):', e?.message || e);
    return false;
  }
}

interface DocPlano { status: string; limites: Partial<Record<(typeof CAMPOS_LIMITE)[number], number>>; relatoriosGerenciais?: boolean }

async function lerDocPlano(env: Env, id: string): Promise<DocPlano | null> {
  try {
    return await comCache(`plano:${id}`, async () => {
      const doc = await fsGet(env, `config_comercial_planos/${id}`);
      if (!doc) return null;
      const limites: DocPlano['limites'] = {};
      for (const campo of CAMPOS_LIMITE) {
        const v = doc.data[campo];
        if (typeof v === 'number' && Number.isInteger(v)) limites[campo] = v;
      }
      const recurso = doc.data.features?.relatoriosGerenciais;
      return {
        status: String(doc.data.status || ''),
        limites,
        relatoriosGerenciais: typeof recurso === 'boolean' ? recurso : undefined,
      } as DocPlano;
    });
  } catch (e: any) {
    console.error(`Falha ao ler config_comercial_planos/${id} (usando padrões):`, e?.message || e);
    return null;
  }
}

export interface PlanoResolvido {
  /** Id do plano efetivamente aplicado ('free', 'pro', 'equipe', ...). */
  id: string;
  limites: LimitesPlano;
  relatoriosGerenciais: boolean;
}

/**
 * @param tier 'free' ou o id do plano pago vigente (planoId do usuário; 'pro' por padrão).
 */
export async function resolverPlano(env: Env, tier: string, promocao: boolean): Promise<PlanoResolvido> {
  let id = tier === 'free' && promocao ? 'pro' : tier || 'free';
  const doc = await lerDocPlano(env, id);
  // Plano arquivado: segue as regras do Pro (nunca fica sem direitos). Desconhecido sem padrão: Pro.
  if (doc?.status === 'archived' && id !== 'free' && id !== 'pro') id = 'pro';
  const efetivoDoc = id === (tier === 'free' && promocao ? 'pro' : tier || 'free') ? doc : await lerDocPlano(env, id);
  const base = id === 'free' ? PLANOS.free : PLANOS.pro;
  const limites: LimitesPlano = { ...base };
  for (const campo of CAMPOS_LIMITE) {
    const v = efetivoDoc?.limites[campo];
    if (v === undefined) continue;
    if (v === -1) (limites as any)[campo] = Infinity;
    else if (v >= 1) (limites as any)[campo] = v;
  }
  const padrao = RECURSO_PADRAO[id] ?? RECURSO_PADRAO.pro;
  return { id, limites, relatoriosGerenciais: efetivoDoc?.relatoriosGerenciais ?? padrao };
}
