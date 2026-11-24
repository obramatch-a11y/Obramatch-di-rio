import { jsPDF } from 'jspdf';

export interface DocumentoRdo {
  nomeArquivo: string;
  titulo: string;
  subtitulo?: string;
  dataRegistro?: string;
  horaRegistro?: string;
  dados: Array<{ rotulo: string; valor: string }>;
  secoes: Array<{ titulo: string; texto: string }>;
  fotos: Array<{ url: string; legenda?: string; metadados?: string }>;
  assinatura?: string;
  nomeAssinante?: string;
  rodape?: string;
  /** Marca própria (plano): logo e nome da empresa no cabeçalho. Ausente = marca ObraMatch. */
  marca?: { nome?: string; logo?: string };
  /** PDF limpo (plano): remove a assinatura ObraMatch do rodapé das páginas. */
  semRodapeObraMatch?: boolean;
}

/** Aplica ao documento os recursos do plano (marca própria e PDF limpo). */
export function aplicarPlanoAoDocumento(
  documento: DocumentoRdo,
  recursos: { marcaPropria?: boolean; pdfLimpo?: boolean },
  marca?: { logoDataUrl?: string; nomeEmpresa?: string } | null,
): DocumentoRdo {
  return {
    ...documento,
    marca: recursos.marcaPropria && marca && (marca.logoDataUrl || marca.nomeEmpresa) ? { nome: marca.nomeEmpresa, logo: marca.logoDataUrl } : undefined,
    semRodapeObraMatch: !!recursos.pdfLimpo,
  };
}

const azul = '#0A3D91';
const cinza = '#475569';
const texto = '#101828';
const margem = 17;
const inicio = 25;
const fim = 274;
const intervalo = 1.8;
const faixa = 7;
const espacoSecao = 2.4;
const laranja = '#FF6F00';
const borda = '#CBD5E1';

async function prepararImagem(url: string, tipo: 'JPEG' | 'PNG', maximo: number, signal?: AbortSignal) {
  if (!/^(https?:\/\/|blob:|data:image\/|\/[^/])/i.test(url)) throw new Error('O endereço de uma imagem do RDO é inválido.');
  const resposta = await fetch(url, { cache: 'no-store', signal, referrerPolicy: 'no-referrer' });
  if (!resposta.ok) throw new Error('Não foi possível carregar todas as imagens do RDO. Tente novamente.');
  const temporario = URL.createObjectURL(await resposta.blob());
  try {
    const imagem = new Image();
    imagem.src = temporario;
    await imagem.decode();
    signal?.throwIfAborted();
    const proporcao = Math.min(1, maximo / Math.max(imagem.naturalWidth, imagem.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(imagem.naturalWidth * proporcao));
    canvas.height = Math.max(1, Math.round(imagem.naturalHeight * proporcao));
    const contexto = canvas.getContext('2d');
    if (!contexto) throw new Error('O navegador não conseguiu preparar a imagem para o PDF.');
    if (tipo === 'JPEG') {
      contexto.fillStyle = '#fff';
      contexto.fillRect(0, 0, canvas.width, canvas.height);
    }
    contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
    return {
      dados: canvas.toDataURL(tipo === 'JPEG' ? 'image/jpeg' : 'image/png', 0.84),
      largura: canvas.width,
      altura: canvas.height,
    };
  } catch (erro) {
    if (signal?.aborted) throw erro;
    throw new Error('Uma foto ou assinatura do RDO não pôde ser lida. Reabra o relatório e tente novamente.');
  } finally {
    URL.revokeObjectURL(temporario);
  }
}

function formatoTexto(doc: jsPDF, tamanho: number, cor: string, destaque = false) {
  doc.setFont('helvetica', destaque ? 'bold' : 'normal');
  doc.setFontSize(tamanho);
  doc.setTextColor(cor);
}

function chaveCronologica(relatorio: DocumentoRdo): string {
  const data = (relatorio.dataRegistro || relatorio.dados.find(item => /^data(?: do registro)?$/i.test(item.rotulo))?.valor || '').trim();
  const brasileira = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data);
  const iso = /^\d{4}-\d{2}-\d{2}(?:$|T)/.test(data) ? data.slice(0, 10) : '';
  const dia = brasileira ? `${brasileira[3]}-${brasileira[2]}-${brasileira[1]}` : iso;
  if (!dia) return '9999-99-99';
  const horario = (relatorio.horaRegistro || relatorio.dados.find(item => /^(?:hora|hor[áa]rio)(?: do registro)?$/i.test(item.rotulo))?.valor || '').trim();
  const partes = /^(\d{1,2}):(\d{2})/.exec(horario);
  return partes ? `${dia} ${partes[1].padStart(2, '0')}:${partes[2]}` : dia;
}

export async function gerarArquivoPdfRdo(
  entrada: DocumentoRdo | DocumentoRdo[], signal?: AbortSignal,
): Promise<File> {
  const relatorios = Array.isArray(entrada)
    ? entrada.map(relatorio => ({ relatorio, chave: chaveCronologica(relatorio) }))
      .sort((a, b) => a.chave.localeCompare(b.chave)).map(({ relatorio }) => relatorio)
    : [entrada];
  if (!relatorios.length) throw new Error('Selecione pelo menos um relatório para gerar o PDF.');
  signal?.throwIfAborted();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const larguraPagina = doc.internal.pageSize.getWidth();
  const largura = larguraPagina - margem * 2;
  doc.setProperties({ title: relatorios.length === 1 ? relatorios[0].titulo : 'Relatórios diários de obra', creator: 'ObraMatch Diário' });

  const marca = relatorios.find(r => r.marca && (r.marca.nome || r.marca.logo))?.marca;
  const semRodapeObraMatch = relatorios.some(r => r.semRodapeObraMatch);
  let logo: Awaited<ReturnType<typeof prepararImagem>> | undefined;
  if (marca?.logo) { try { logo = await prepararImagem(marca.logo, /^data:image\/jpe?g/i.test(marca.logo) ? 'JPEG' : 'PNG', 500, signal); } catch { logo = undefined; } }

  const cabecalho = () => {
    doc.setFillColor(azul);
    doc.rect(0, 0, larguraPagina, 16, 'F');
    doc.setFillColor(laranja);
    doc.rect(0, 16, larguraPagina, 1.2, 'F');
    let xMarca = margem;
    if (logo) {
      const esc = Math.min(30 / logo.largura, 10 / logo.altura);
      doc.setFillColor('#FFFFFF');
      doc.roundedRect(margem, 2.6, logo.largura * esc + 3, logo.altura * esc + 2, 1, 1, 'F');
      doc.addImage(logo.dados, 'PNG', margem + 1.5, 3.6, logo.largura * esc, logo.altura * esc);
      xMarca = margem + logo.largura * esc + 6;
    }
    formatoTexto(doc, 11, '#FFFFFF', true);
    doc.text((marca?.nome || 'OBRAMATCH').toLocaleUpperCase('pt-BR').slice(0, 40), xMarca, 10.4);
    formatoTexto(doc, 8, '#FFFFFF');
    doc.text('RELATÓRIO DIÁRIO DE OBRA', larguraPagina - margem, 10.4, { align: 'right' });
  };

  const inicios: number[] = [];
  for (const [indice, relatorio] of relatorios.entries()) {
    if (indice) doc.addPage();
    inicios.push(doc.getNumberOfPages());
    cabecalho();
    let y = inicio;
    const referencia = relatorio.dados.find(({ rotulo }) => /^referência do rdo$/i.test(rotulo))?.valor.trim();
    const numero = /(?:\bn[º°o]\.?\s*|\bRDO[\s-]+)(\d+)/i.exec(relatorio.titulo)?.[1];
    const identificador = numero
      ? `RDO nº ${numero}`
      : `RDO ${referencia?.slice(0, 12) || relatorio.nomeArquivo.replace(/^(?:obramatch-)?rdo-/i, '').replace(/\.pdf$/i, '')}`;

    const reservar = (altura: number) => {
      if (y + altura <= fim || y === inicio) return;
      doc.addPage();
      cabecalho();
      formatoTexto(doc, 8, azul, true);
      const identificacao = (doc.splitTextToSize(`${identificador} · continuação`, largura) as string[])[0];
      doc.text(identificacao, margem, 22);
      y = inicio;
    };
    const montarTexto = (conteudo: string, tamanho = 10, cor = texto, negrito = false, larguraTexto = largura) => {
      formatoTexto(doc, tamanho, cor, negrito);
      const linhas = doc.splitTextToSize(conteudo.replace(/\r\n?/g, '\n'), larguraTexto) as string[];
      return { linhas, passo: tamanho * 0.43, tamanho, cor, negrito };
    };
    type Bloco = ReturnType<typeof montarTexto>;
    const alturaTexto = (bloco: Bloco) => bloco.linhas.length * bloco.passo + intervalo;
    const desenharTexto = (bloco: Bloco, reservarFechamento = 0) => {
      const linhasFinais = Math.min(bloco.linhas.length, 2);
      for (const [i, linha] of bloco.linhas.entries()) {
        const reserva = i === bloco.linhas.length - linhasFinais
          ? reservarFechamento + linhasFinais * bloco.passo + intervalo : bloco.passo;
        reservar(Math.min(reserva, fim - inicio));
        formatoTexto(doc, bloco.tamanho, bloco.cor, bloco.negrito);
        doc.text(linha, margem, y + bloco.passo * 0.78);
        y += bloco.passo;
      }
      y += intervalo;
    };
    const alturaFaixa = (bloco: Bloco) => Math.max(faixa, bloco.linhas.length * bloco.passo + 3) + espacoSecao;
    const montarFaixa = (titulo: string) => montarTexto(titulo.toLocaleUpperCase('pt-BR'), 9, azul, true, largura - 6);
    const secao = (titulo: string, primeiraParte = 0) => {
      const bloco = montarFaixa(titulo);
      const altura = alturaFaixa(bloco);
      reservar(altura + primeiraParte);
      doc.setFillColor('#EDF3FA');
      doc.roundedRect(margem, y, largura, altura - espacoSecao, 1, 1, 'F');
      formatoTexto(doc, bloco.tamanho, bloco.cor, bloco.negrito);
      for (const [i, linha] of bloco.linhas.entries()) doc.text(linha, margem + 3, y + 1.6 + bloco.passo * (i + 0.78));
      y += altura;
    };

    desenharTexto(montarTexto(relatorio.titulo, 18, texto, true));
    if (relatorio.subtitulo) desenharTexto(montarTexto(relatorio.subtitulo, 10.5, azul, true));

    const todosDados = relatorio.dados.filter(({ valor }) => valor.trim());
    const autenticidade = todosDados.filter(({ rotulo }) => /^(sha[- ]?256|hash|referência do rdo)/i.test(rotulo));
    const dadosVisiveis = todosDados.filter(item => !autenticidade.includes(item));

    const larguraMeiaCelula = (largura - 4) / 2;
    const cabeMeiaCelula = ({ valor }: DocumentoRdo['dados'][number]) =>
      montarTexto(valor, 10, texto, true, larguraMeiaCelula - 6).linhas.length === 1 && valor.length <= 38;
    const dadosPorLinha: DocumentoRdo['dados'][] = [];
    for (let i = 0; i < dadosVisiveis.length; i++) {
      const atual = dadosVisiveis[i];
      const seguinte = dadosVisiveis[i + 1];
      if (seguinte && cabeMeiaCelula(atual) && cabeMeiaCelula(seguinte)) { dadosPorLinha.push([atual, seguinte]); i++; }
      else dadosPorLinha.push([atual]);
    }
    if (dadosPorLinha.length) {
      y += 2;
      secao('Identificação do registro', 14);
    }
    for (const linha of dadosPorLinha) {
      const larguraCelula = linha.length === 2 ? larguraMeiaCelula : largura;
      const valores = linha.map(({ valor }) => montarTexto(valor, 10, texto, true, larguraCelula - 6));
      const passo = valores[0].passo;
      const totalLinhas = Math.max(...valores.map(valor => valor.linhas.length));
      const altura = 6.2 + totalLinhas * passo + 2;
      reservar(altura + 2);
      for (const [coluna, valor] of valores.entries()) {
        const x = margem + coluna * (larguraCelula + 4);
        doc.setFillColor('#F8FAFC');
        doc.setDrawColor(borda);
        doc.setLineWidth(0.22);
        doc.roundedRect(x, y, larguraCelula, altura, 1, 1, 'FD');
        formatoTexto(doc, 7, cinza, true);
        doc.text(linha[coluna].rotulo.toLocaleUpperCase('pt-BR').slice(0, 40), x + 3, y + 4);
        formatoTexto(doc, valor.tamanho, valor.cor, true);
        for (const [i, textoLinha] of valor.linhas.entries()) doc.text(textoLinha, x + 3, y + 6.2 + passo * (i + 0.78));
      }
      y += altura + 2;
    }

    const assinatura = relatorio.assinatura ? await prepararImagem(relatorio.assinatura, 'PNG', 800, signal) : undefined;
    const escalaAssinatura = assinatura ? Math.min(76 / assinatura.largura, 21 / assinatura.altura) : 0;
    const alturaAssinatura = assinatura ? assinatura.altura * escalaAssinatura : 0;
    const tituloAssinatura = 'Responsável pelo registro';
    const tituloRodape = 'Observação documental';
    const tituloAutenticidade = 'Autenticidade e rastreabilidade';
    const assinante = relatorio.nomeAssinante?.trim()
      || todosDados.find(({ rotulo }) => /^(?:nome do assinante|assinante|assinado por)$/i.test(rotulo))?.valor.trim();
    const assinaturaTexto = montarTexto(
      assinante ? `Assinante informado: ${assinante}` : 'Assinatura registrada no ObraMatch Diário',
      8, cinza,
    );
    const rodape = relatorio.rodape?.trim() || '';
    const rodapeDeIntegridade = /^(?:integridade|sha[- ]?256|hash)\b[^:\n]*:\s*[a-f0-9]{64}$/i.test(rodape);
    const nota = rodape && !rodapeDeIntegridade ? montarTexto(rodape, 8.5, cinza) : undefined;
    const codigos = autenticidade.map(({ rotulo, valor }) => montarTexto(`${rotulo}: ${valor}`, 8, cinza));
    if (rodapeDeIntegridade) codigos.push(montarTexto(rodape, 8, cinza));
    const blocoAssinatura = assinatura ? alturaFaixa(montarFaixa(tituloAssinatura)) + alturaAssinatura + 5 + alturaTexto(assinaturaTexto) : 0;
    const blocoNota = nota ? alturaFaixa(montarFaixa(tituloRodape)) + alturaTexto(nota) : 0;
    const blocoAutenticidade = codigos.length ? alturaFaixa(montarFaixa(tituloAutenticidade)) + codigos.reduce((total, codigo) => total + alturaTexto(codigo), 0) : 0;
    const fechamento = blocoAssinatura + blocoNota + blocoAutenticidade;
    const fechamentoComConteudo = fechamento <= fim - inicio - 20 ? fechamento : 0;

    const secoes = relatorio.secoes.filter(({ texto }) => texto.trim());
    for (const [i, item] of secoes.entries()) {
      const bloco = montarTexto(item.texto);
      const reservaFinal = !relatorio.fotos.length && i === secoes.length - 1 ? fechamentoComConteudo : 0;
      const primeiraParte = bloco.linhas.length <= 2 ? alturaTexto(bloco) + reservaFinal : bloco.passo;
      secao(item.titulo, primeiraParte);
      desenharTexto(bloco, reservaFinal);
    }
    for (const [i, foto] of relatorio.fotos.entries()) {
      const imagem = await prepararImagem(foto.url, 'JPEG', 1500, signal);
      const escala = Math.min((largura - 2) / imagem.largura, 80 / imagem.altura);
      const altura = imagem.altura * escala;
      const larguraFoto = imagem.largura * escala;
      const titulo = `Fotografia ${i + 1} de ${relatorio.fotos.length}`;
      const legenda = foto.legenda?.trim() ? montarTexto(foto.legenda, 9, cinza) : undefined;
      const metadados = foto.metadados?.trim() ? montarTexto(foto.metadados, 8, cinza) : undefined;
      const alturaFoto = altura + 3.2 + (legenda ? alturaTexto(legenda) : 0) + (metadados ? alturaTexto(metadados) : 0);
      const comFechamento = i === relatorio.fotos.length - 1 ? fechamentoComConteudo : 0;
      // Quando cabe em uma folha, a última fotografia acompanha o bloco final.
      const secaoComFoto = alturaFaixa(montarFaixa(titulo)) + alturaFoto;
      const reservaFoto = secaoComFoto + comFechamento <= fim - inicio ? alturaFoto + comFechamento
        : secaoComFoto <= fim - inicio ? alturaFoto : altura + 3.2 + (legenda?.passo || metadados?.passo || 0);
      secao(titulo, reservaFoto);
      const x = margem + (largura - larguraFoto) / 2;
      doc.setDrawColor(borda);
      doc.setLineWidth(0.26);
      doc.rect(x - 0.45, y - 0.45, larguraFoto + 0.9, altura + 0.9);
      doc.addImage(imagem.dados, 'JPEG', x, y, larguraFoto, altura);
      y += altura + 3.2;
      if (legenda) desenharTexto(legenda);
      if (metadados) desenharTexto(metadados);
    }
    if (assinatura) {
      secao(tituloAssinatura, alturaAssinatura + 5 + Math.min(alturaTexto(assinaturaTexto), 9));
      doc.addImage(assinatura.dados, 'PNG', margem + 3, y, assinatura.largura * escalaAssinatura, alturaAssinatura);
      y += alturaAssinatura + 2;
      doc.setDrawColor('#94A3B8');
      doc.setLineWidth(0.22);
      doc.line(margem, y, margem + 82, y);
      y += 3;
      desenharTexto(assinaturaTexto);
    }
    if (nota) {
      secao(tituloRodape, nota.passo);
      desenharTexto(nota);
    }
    if (codigos.length) {
      secao(tituloAutenticidade, Math.min(14, alturaTexto(codigos[0])));
      for (const codigo of codigos) desenharTexto(codigo);
    }
    signal?.throwIfAborted();
  }

  // O índice segue a mesma ordem cronológica do consolidado.
  if (relatorios.length >= 5 || (relatorios.length >= 3 && doc.getNumberOfPages() >= 8)) {
    const porPagina = 24;
    const paginasIndice = Math.ceil(relatorios.length / porPagina);
    const posicaoPagina = larguraPagina - margem;
    for (let folha = 0; folha < paginasIndice; folha++) {
      doc.insertPage(folha + 1);
      cabecalho();
      formatoTexto(doc, 17, texto, true);
      doc.text('Índice de relatórios', margem, inicio + 4);
      formatoTexto(doc, 9, cinza);
      doc.text(`${relatorios.length} registros no consolidado`, margem, inicio + 11);
      for (let i = folha * porPagina; i < Math.min((folha + 1) * porPagina, relatorios.length); i++) {
        const linhaY = inicio + 22 + (i % porPagina) * 9;
        doc.setDrawColor(borda);
        doc.setLineWidth(0.18);
        doc.line(margem, linhaY + 2, posicaoPagina, linhaY + 2);
        formatoTexto(doc, 9, texto);
        const primeiraLinha = (doc.splitTextToSize(relatorios[i].titulo, largura - 18) as string[])[0];
        const pagina = inicios[i] + paginasIndice;
        doc.textWithLink(primeiraLinha, margem, linhaY, { pageNumber: pagina });
        doc.text(String(pagina), posicaoPagina, linhaY, { align: 'right' });
      }
    }
  }

  const paginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina++) {
    doc.setPage(pagina);
    doc.setDrawColor(borda);
    doc.setLineWidth(0.22);
    doc.line(margem, 281, larguraPagina - margem, 281);
    formatoTexto(doc, 8, cinza);
    if (!semRodapeObraMatch) doc.text('ObraMatch Diário  |  Registro documental', margem, 287);
    doc.text(`${pagina} / ${paginas}`, larguraPagina - margem, 287, { align: 'right' });
  }
  const nome = relatorios.length === 1 ? relatorios[0].nomeArquivo : 'relatorios-obramatch';
  const nomeSeguro = nome.replace(/\.pdf$/i, '').replace(/[^\p{L}\p{N}._ -]/gu, '-').slice(0, 100).trim() || 'rdo-obramatch';
  return new File([doc.output('arraybuffer')], `${nomeSeguro}.pdf`, { type: 'application/pdf' });
}
