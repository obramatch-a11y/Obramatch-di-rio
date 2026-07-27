export interface Obra {
  id: string;
  nome: string;
  cliente: string;
  endereco: string;
  responsavelTecnico: string;
  dataInicio: string;
  observacoes: string;
  gps?: GPSLocation | null;
  proximoNumeroRdo?: number;
  arquivada?: boolean;
  lockedByPlan?: boolean;
  planLockReason?: 'free_limit' | null;
  planLockedAt?: unknown;
  ownerId: string;
  createdAt: any;
  updatedAt: any;
}

export interface GPSLocation {
  latitude: number;
  longitude: number;
}

export interface ClimaOficialInfo {
  condicao: string;
  tempMax: number;
  tempMin: number;
  chuvaMm: number;
  fonte: string;
}

export interface Diario {
  id: string;
  obraId: string;
  numeroRdo?: number;
  data: string;
  horario: string;
  clima: string;
  climaOficial?: ClimaOficialInfo | null;
  origem?: 'app' | 'telegram';
  hashIntegridade?: string;
  equipe: string;
  atividades: string;
  materiais: string;
  ocorrencias: string;
  observacoes: string;
  assinatura?: string;
  gps?: GPSLocation | null;
  condicaoTrabalho?: 'Praticável' | 'Parcialmente praticável' | 'Impraticável';
  ownerId: string;
  createdAt: any;
  updatedAt: any;
}

export interface Foto {
  id: string;
  diarioId: string;
  obraId: string;
  url: string;
  legenda?: string;
  data: string;
  horario: string;
  gps?: GPSLocation | null;
  ownerId: string;
  createdAt: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export interface PlanoInfo {
  plano: 'free' | 'pro';
  rawPlan?: 'free' | 'pro';
  validade?: string | null;
  accessStatus?: string | null;
  financialStatus?: string | null;
  acessoAte?: string | null;
  currentPeriodEnd?: string | null;
}

export interface UsoIaInfo {
  transcMes: number;
  melhoriaMes: number;
  transcDia: number;
  melhoriaDia: number;
  dia?: string;
}

export const LIMITES_PLANO = {
  free: { obrasAtivas: 2, fotosPorRelatorio: 5, transcMes: 30, melhoriaMes: 30, transcDia: 2, melhoriaDia: 2 },
  pro:  { obrasAtivas: 10, fotosPorRelatorio: 20, transcMes: 300, melhoriaMes: 600, transcDia: 20, melhoriaDia: 60 },
} as const;
