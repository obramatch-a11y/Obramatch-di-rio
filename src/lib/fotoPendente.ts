// Fotos escolhidas na tela inicial; o formulário do RDO as recolhe ao abrir.
let pendentes: File[] = [];

export function guardarFotosPendentes(arquivos: File[]): void {
  pendentes = arquivos.slice(0, 10);
}

export function tomarFotosPendentes(): File[] {
  const atuais = pendentes;
  pendentes = [];
  return atuais;
}
