// Fotos e áudio escolhidos na tela inicial; o formulário do RDO os recolhe ao abrir.
const MAX_FOTOS = 10;
let pendentes: File[] = [];
let audioPendente: Blob | null = null;

export function adicionarFotosPendentes(arquivos: File[]): void {
  pendentes = [...pendentes, ...arquivos].slice(0, MAX_FOTOS);
}
export function listarFotosPendentes(): File[] { return pendentes; }
export function removerFotoPendente(indice: number): void {
  pendentes = pendentes.filter((_, i) => i !== indice);
}
export function limparFotosPendentes(): void { pendentes = []; }
export function tomarFotosPendentes(): File[] {
  const atuais = pendentes;
  pendentes = [];
  return atuais;
}
export function guardarAudioPendente(blob: Blob | null): void { audioPendente = blob; }
export function tomarAudioPendente(): Blob | null {
  const atual = audioPendente;
  audioPendente = null;
  return atual;
}
