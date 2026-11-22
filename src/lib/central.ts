import { auth } from '../firebase';

export interface ObraDaEmpresa {
  empresaId: string;
  empresaNome: string;
  obraId: string;
  obraNome: string;
  capabilities?: { canRegister?: boolean };
}

async function idToken(): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Entre novamente no aplicativo.');
  return token;
}

/** Obras de empresa atribuídas a esta conta pela Central (mesma conta da Web). */
export async function listarObrasDaEmpresa(signal?: AbortSignal): Promise<ObraDaEmpresa[]> {
  const token = await idToken();
  const obras = new Map<string, ObraDaEmpresa>();
  let pagina = '';
  for (let i = 0; i < 20; i += 1) {
    const q = new URLSearchParams({ scope: 'central', action: 'list_assigned_works' });
    if (pagina) q.set('pageToken', pagina);
    const r = await fetch(`/api/obras/dispatcher?${q}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal });
    if (!r.ok) throw new Error(`Não foi possível consultar as obras da empresa (código ${r.status}).`);
    const corpo = await r.json() as { works?: ObraDaEmpresa[]; nextPageToken?: string };
    for (const o of corpo.works ?? []) obras.set(`${o.empresaId}:${o.obraId}`, o);
    pagina = corpo.nextPageToken ?? '';
    if (!pagina) break;
  }
  return Array.from(obras.values());
}

export interface RdoParaCentral {
  data: string; horario: string; clima: string; equipe: string; atividades: string;
  materiais: string; ocorrencias: string; observacoes: string; condicaoTrabalho?: string;
  assinatura?: string; gps?: { latitude: number; longitude: number } | null;
}

/** Envia o RDO para a Central da empresa (vai para revisão). */
export async function enviarRdoParaCentral(
  empresaId: string,
  obraId: string,
  relatorio: RdoParaCentral,
  fotos: { url: string; legenda?: string }[],
  submissionId: string,
): Promise<{ id: string }> {
  const token = await idToken();
  const r = await fetch('/api/obras/dispatcher?scope=central', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'submit_field_rdo', companyId: empresaId, workId: obraId, report: relatorio,
      photos: fotos.map((f) => ({ dataUrl: f.url, legenda: f.legenda || '' })), submissionId,
    }),
    cache: 'no-store',
  });
  const corpo = await r.json().catch(() => null) as { message?: string; rdo?: { id: string } } | null;
  if (!r.ok || !corpo?.rdo?.id) throw new Error(corpo?.message || 'Não foi possível enviar o relatório para a Central.');
  return corpo.rdo;
}
