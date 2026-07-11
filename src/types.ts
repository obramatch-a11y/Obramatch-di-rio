export interface Obra {
  id: string;
  nome: string;
  cliente: string;
  endereco: string;
  responsavelTecnico: string;
  dataInicio: string;
  observacoes: string;
  gps?: GPSLocation | null;       // Localização da obra (base do clima oficial)
  proximoNumeroRdo?: number;      // Numeração sequencial dos RDOs
  arquivada?: boolean;            // Obra arquivada não conta no limite do plano
  ownerId: string;
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
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
  numeroRdo?: number;                     // RDO Nº sequencial por obra
  data: string;
  horario: string;
  clima: string;
  climaOficial?: ClimaOficialInfo | null; // Clima de fonte oficial (Open-Meteo)
  origem?: 'app' | 'telegram';
  hashIntegridade?: string;               // SHA-256 do conteúdo confirmado
  equipe: string;
  atividades: string;
  materiais: string;
  ocorrencias: string;
  observacoes: string;
  assinatura?: string; // Base64 signature image
  gps?: GPSLocation | null;
  condicaoTrabalho?: 'Praticável' | 'Parcialmente praticável' | 'Impraticável';
  ownerId: string;
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
}

export interface Foto {
  id: string;
  diarioId: string;
  obraId: string;
  url: string; // Base64 compressed image
  legenda?: string;
  data: string;
  horario: string;
  gps?: GPSLocation | null;
  ownerId: string;
  createdAt: any; // Timestamp
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
  }
}

export interface PlanoInfo {
  plano: 'free' | 'pro';
  validade?: string | null;
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
