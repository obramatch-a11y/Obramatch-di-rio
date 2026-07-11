// Definição central dos planos e franquias. Fonte única de verdade.

export type NomePlano = 'free' | 'pro';

export interface LimitesPlano {
  obrasAtivas: number;
  fotosPorRelatorio: number;
  transcDia: number;
  transcMes: number;
  melhoriaDia: number;
  melhoriaMes: number;
  audioMaxBase64: number; // tamanho máximo do áudio em caracteres base64
}

export const PLANOS: Record<NomePlano, LimitesPlano> = {
  free: {
    obrasAtivas: 2,
    fotosPorRelatorio: 5,
    transcDia: 2,
    transcMes: 30,
    melhoriaDia: 2,
    melhoriaMes: 30,
    audioMaxBase64: 1_600_000, // ~1,2MB de áudio ≈ até ~1,5 min
  },
  pro: {
    obrasAtivas: 10,
    fotosPorRelatorio: 20,
    transcDia: 20,
    transcMes: 300,
    melhoriaDia: 60,
    melhoriaMes: 600,
    audioMaxBase64: 5_400_000, // ~4MB de áudio ≈ até ~5 min
  },
};

export function limitesDoPlano(plano: string | null | undefined): LimitesPlano {
  return PLANOS[(plano === 'pro' ? 'pro' : 'free') as NomePlano];
}
