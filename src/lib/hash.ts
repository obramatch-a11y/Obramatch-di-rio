// Código de integridade do RDO: SHA-256 sobre JSON canônico (chaves ordenadas).
// Qualquer alteração posterior nos campos quebra o hash — valor probatório.

export interface CamposHashRdo {
  obraId: string;
  numeroRdo: number;
  data: string;
  horario: string;
  clima: string;
  equipe: string;
  atividades: string;
  materiais: string;
  ocorrencias: string;
  observacoes: string;
  gps: { latitude: number; longitude: number } | null;
}

export function jsonCanonico(campos: CamposHashRdo): string {
  const ordenado: Record<string, unknown> = {};
  Object.keys(campos)
    .sort()
    .forEach((k) => {
      ordenado[k] = (campos as any)[k] ?? null;
    });
  return JSON.stringify(ordenado);
}

export async function calcularHashRdo(campos: CamposHashRdo): Promise<string> {
  const texto = jsonCanonico(campos);
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
