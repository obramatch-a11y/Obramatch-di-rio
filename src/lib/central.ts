import { auth } from '../firebase';

export interface ObraDaEmpresa {
  empresaId: string;
  empresaNome: string;
  obraId: string;
  obraNome: string;
  capabilities?: { canRegister?: boolean; canReview?: boolean; canManage?: boolean };
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

export interface RdoDaCentral {
  id: string;
  status: string;
  submittedByName?: string;
  data?: string;
  latestVersion: number;
  submittedAt?: string;
  lastReason?: string;
  sourceType?: string;
  submittedBy?: string;
}

async function lerCentral<T>(acao: string, params: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const token = await idToken();
  const q = new URLSearchParams({ scope: 'central', action: acao, ...params });
  const r = await fetch(`/api/obras/dispatcher?${q}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal });
  const corpo = await r.json().catch(() => null) as (T & { message?: string }) | null;
  if (!r.ok || !corpo) throw new Error((corpo as { message?: string } | null)?.message || `Não foi possível consultar a Central (código ${r.status}).`);
  return corpo;
}

/** Relatórios da obra de empresa que esta conta pode ver (inclui os enviados pela Web). */
export async function listarRdosDaCentral(empresaId: string, obraId: string, signal?: AbortSignal): Promise<RdoDaCentral[]> {
  const todos: RdoDaCentral[] = [];
  let pagina = '';
  for (let i = 0; i < 10; i += 1) {
    const params: Record<string, string> = { companyId: empresaId, workId: obraId };
    if (pagina) params.pageToken = pagina;
    const corpo = await lerCentral<{ rdos?: RdoDaCentral[]; nextPageToken?: string }>('list_rdos', params, signal);
    todos.push(...(corpo.rdos ?? []));
    pagina = corpo.nextPageToken ?? '';
    if (!pagina) break;
  }
  return todos;
}

export interface DetalheRdoCentral {
  rdo: RdoDaCentral;
  version: number;
  snapshot: Record<string, unknown>;
  photos: { id: string; legenda?: string }[];
}

export function detalharRdoDaCentral(empresaId: string, obraId: string, rdoId: string, signal?: AbortSignal) {
  return lerCentral<DetalheRdoCentral>('get_rdo', { companyId: empresaId, workId: obraId, rdoId }, signal);
}

export async function fotoRdoDaCentral(empresaId: string, obraId: string, rdoId: string, photoId: string, version: number, signal?: AbortSignal): Promise<string> {
  const corpo = await lerCentral<{ dataUrl: string }>('get_rdo_photo', { companyId: empresaId, workId: obraId, rdoId, photoId, version: String(version) }, signal);
  return corpo.dataUrl;
}

export type StatusAviso = 'submitted' | 'needs_correction';
export interface AvisoDaCentral extends RdoDaCentral { alertRead: boolean; submittedBy?: string }

/** Avisos do usuário na obra: devolvidos para ele corrigir, ou aguardando a revisão dele. */
export async function listarAvisosDaCentral(empresaId: string, obraId: string, status: StatusAviso, signal?: AbortSignal): Promise<AvisoDaCentral[]> {
  const todos: AvisoDaCentral[] = [];
  let pagina = '';
  for (let i = 0; i < 5; i += 1) {
    const params: Record<string, string> = { companyId: empresaId, workId: obraId, alertStatus: status };
    if (pagina) params.pageToken = pagina;
    const corpo = await lerCentral<{ rdos?: AvisoDaCentral[]; nextPageToken?: string }>('list_rdo_alerts', params, signal);
    todos.push(...(corpo.rdos ?? []));
    pagina = corpo.nextPageToken ?? '';
    if (!pagina) break;
  }
  return todos;
}

async function escreverCentral(corpo: Record<string, unknown>): Promise<{ rdo?: { id: string; status?: string; latestVersion?: number } }> {
  const token = await idToken();
  const r = await fetch('/api/obras/dispatcher?scope=central', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo), cache: 'no-store',
  });
  const resposta = await r.json().catch(() => null) as { message?: string; rdo?: { id: string } } | null;
  if (!r.ok) throw new Error(resposta?.message || `A Central recusou a operação (código ${r.status}).`);
  return resposta ?? {};
}

export const marcarAvisoComoLido = (empresaId: string, obraId: string, rdoId: string, versao: number, status: StatusAviso) =>
  escreverCentral({ action: 'mark_rdo_alert_read', companyId: empresaId, workId: obraId, rdoId, expectedVersion: versao, alertStatus: status });

export const devolverRdoDaCentral = (empresaId: string, obraId: string, rdoId: string, versao: number, motivo: string) =>
  escreverCentral({ action: 'request_correction', companyId: empresaId, workId: obraId, rdoId, expectedVersion: versao, reason: motivo });

export const aceitarRdoDaCentral = (empresaId: string, obraId: string, rdoId: string, versao: number, nota = '') =>
  escreverCentral({ action: 'accept_document', companyId: empresaId, workId: obraId, rdoId, expectedVersion: versao, note: nota });

/** Reenvio de um RDO devolvido (as fotos da versão anterior são mantidas pelo servidor). */
export const reenviarRdoDaCentral = (empresaId: string, obraId: string, rdoId: string, versao: number, relatorio: RdoParaCentral) =>
  escreverCentral({ action: 'resubmit_field_rdo', companyId: empresaId, workId: obraId, rdoId, expectedVersion: versao, report: relatorio });

export const registrarAparelhoNaCentral = (pushToken: string) => escreverCentral({ action: 'register_push_token', pushToken });

/** Reenvio de um RDO enviado a partir do Diário pessoal, depois de corrigido o original. */
export const reenviarRdoDoDiario = (empresaId: string, obraId: string, rdoId: string) =>
  escreverCentral({ action: 'resubmit_rdo', companyId: empresaId, workId: obraId, rdoId });
