import type { Obra, Diario, Foto } from '../types';
import { gerarArquivoPdfRdo, type DocumentoRdo } from './pdfRdo';

const dataBr = (iso: string) => iso?.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1');
const ok = (dados: Array<{ rotulo: string; valor?: string }>): DocumentoRdo['dados'] =>
  dados.flatMap(({ rotulo, valor }) => (valor?.trim() ? [{ rotulo, valor }] : []));

/** Monta o documento do RDO no mesmo formato usado pela web (modelo único de PDF). */
export function montarDocumentoRdo(obra: Obra, diario: Diario, fotos: Foto[], opcoes: { semRodapeObraMatch?: boolean } = {}): DocumentoRdo {
  const numero = diario.numeroRdo ? String(diario.numeroRdo).padStart(3, '0') : '';
  const secoes = [
    { titulo: 'Atividades executadas', texto: diario.atividades },
    { titulo: 'Equipe presente', texto: diario.equipe },
    { titulo: 'Materiais e equipamentos', texto: diario.materiais },
    { titulo: 'Ocorrências e imprevistos', texto: diario.ocorrencias },
    { titulo: 'Observações', texto: diario.observacoes },
  ].filter((s) => s.texto?.trim()) as DocumentoRdo['secoes'];
  const oficial = diario.climaOficial;
  return {
    nomeArquivo: `obramatch-rdo-${numero || diario.id}.pdf`,
    titulo: numero ? `Relatório diário de obra nº ${numero}` : 'Relatório diário de obra',
    subtitulo: obra.nome,
    numero: numero || undefined,
    dataRegistro: diario.data,
    horaRegistro: diario.horario,
    dados: ok([
      { rotulo: 'Data', valor: dataBr(diario.data) },
      { rotulo: 'Horário', valor: diario.horario },
      { rotulo: 'Cliente', valor: obra.cliente },
      { rotulo: 'Responsável técnico', valor: obra.responsavelTecnico },
      { rotulo: 'Endereço', valor: obra.endereco },
      { rotulo: 'Clima', valor: diario.clima },
      { rotulo: 'Condição de trabalho', valor: diario.condicaoTrabalho },
      { rotulo: 'Clima oficial', valor: oficial ? `${oficial.tempMin} °C a ${oficial.tempMax} °C · ${oficial.chuvaMm} mm · Open-Meteo` : undefined },
      { rotulo: 'GPS', valor: diario.gps ? `${diario.gps.latitude.toFixed(6)}, ${diario.gps.longitude.toFixed(6)}` : undefined },
    ]),
    secoes,
    fotos: fotos.map((f) => ({
      url: f.url,
      legenda: f.legenda,
      metadados: [f.horario && `Hora: ${f.horario}`, f.gps && `GPS: ${f.gps.latitude.toFixed(5)}, ${f.gps.longitude.toFixed(5)}`].filter(Boolean).join(' · ') || undefined,
    })),
    assinatura: diario.assinatura || undefined,
    rodape: diario.hashIntegridade ? `Integridade (SHA-256): ${diario.hashIntegridade}` : undefined,
    semRodapeObraMatch: opcoes.semRodapeObraMatch,
  };
}

function baixar(arquivo: File) {
  const url = URL.createObjectURL(arquivo);
  const a = document.createElement('a');
  a.href = url;
  a.download = arquivo.name;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Gera o PDF e entrega: compartilha (se o aparelho permitir) ou baixa. */
export async function entregarPdfRdo(documento: DocumentoRdo | DocumentoRdo[], modo: 'baixar' | 'compartilhar'): Promise<'compartilhado' | 'baixado'> {
  const arquivo = await gerarArquivoPdfRdo(documento);
  if (modo === 'compartilhar' && typeof navigator.share === 'function' && navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: 'Relatório diário de obra' });
      return 'compartilhado';
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return 'compartilhado';
    }
  }
  baixar(arquivo);
  return 'baixado';
}
