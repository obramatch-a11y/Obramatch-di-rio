import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

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
  /** Número do RDO (ex.: 012), versão (ex.: 2), situação (ex.: Aceito) e nomes para o cabeçalho. */
  numero?: string;
  /** Link de verificação pública; vira QR code no bloco de autenticidade. */
  verificacaoUrl?: string;
  versao?: string;
  situacao?: string;
  empresa?: string;
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
const margem = 16;
const fim = 277;
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
  const direita = larguraPagina - margem;
  doc.setProperties({ title: relatorios.length === 1 ? relatorios[0].titulo : 'Relatórios diários de obra', creator: 'ObraMatch Diário' });
  const semRodapeObraMatch = relatorios.some(r => r.semRodapeObraMatch);
  const valorDe = (r: DocumentoRdo, re: RegExp) => r.dados.find(d => re.test(d.rotulo))?.valor.trim() || '';

  // Logo: da empresa quando houver; senão o ícone do aplicativo (ou um selo desenhado, se o ícone não carregar).
  const logos = new Map<string, Awaited<ReturnType<typeof prepararImagem>> | null>();
  const carregarLogo = async (url: string | undefined) => {
    const chave = url || '__app__';
    if (logos.has(chave)) return logos.get(chave)!;
    let img: Awaited<ReturnType<typeof prepararImagem>> | null = null;
    try {
      img = url
        ? await prepararImagem(url, /^data:image\/jpe?g/i.test(url) ? 'JPEG' : 'PNG', 500, signal)
        : await prepararImagem('/img/icon-512-maskable.png', 'PNG', 300, signal).catch(() => prepararImagem('/icon-512.png', 'PNG', 300, signal));
    } catch { img = null; }
    logos.set(chave, img);
    return img;
  };
  const desenharLogo = (img: Awaited<ReturnType<typeof prepararImagem>> | null, personalizada: boolean, x: number, yTopo: number, lado: number) => {
    if (img && personalizada) {
      const esc = Math.min(lado / img.largura, lado / img.altura);
      const w = img.largura * esc, h = img.altura * esc;
      doc.addImage(img.dados, 'PNG', x + (lado - w) / 2, yTopo + (lado - h) / 2, w, h);
    } else if (img) {
      doc.addImage(img.dados, 'PNG', x, yTopo, lado, lado);
    } else {
      doc.setFillColor(azul);
      doc.roundedRect(x, yTopo, lado, lado, 2, 2, 'F');
      formatoTexto(doc, lado * 0.9, '#FFFFFF', true);
      doc.text('OM', x + lado / 2, yTopo + lado * 0.64, { align: 'center' });
    }
  };

  const tonsSituacao = (rotulo: string) => {
    if (/aceit|finaliz/i.test(rotulo)) return { fundo: '#E6F8ED', texto: '#087A36' };
    if (/devolv|correç|anterior/i.test(rotulo)) return { fundo: '#FFF1E0', texto: '#B45500' };
    return { fundo: '#E6EFFF', texto: azul };
  };

  const inicios: number[] = [];
  for (const [indice, relatorio] of relatorios.entries()) {
    if (indice) doc.addPage();
    inicios.push(doc.getNumberOfPages());
    const cliente = valorDe(relatorio, /^cliente$/i);
    const nomeMarca = (relatorio.marca?.nome || relatorio.empresa || cliente || 'ObraMatch Diário').trim();
    const subMarca = relatorio.marca?.nome || relatorio.empresa || cliente ? 'Relatório diário de obra' : 'Registro técnico de execução';
    const logoImg = await carregarLogo(relatorio.marca?.logo);
    const logoPersonalizada = !!relatorio.marca?.logo && !!logoImg;
    const numero = relatorio.numero
      || /(?:\bn[º°o]\.?\s*|\bRDO[\s-]+)(\d+)/i.exec(relatorio.titulo)?.[1]
      || '';
    const referencia = valorDe(relatorio, /^referência do rdo$/i);
    const identificador = numero ? `RDO nº ${numero}` : `RDO ${referencia.slice(0, 12) || relatorio.nomeArquivo.replace(/^(?:obramatch-)?rdo-/i, '').replace(/\.pdf$/i, '')}`;
    const dataTexto = valorDe(relatorio, /^data(?: do registro)?$/i) || relatorio.dataRegistro || '';
    let inicioPagina = 38;
    let y = inicioPagina;

    const cabecalhoCompleto = () => {
      desenharLogo(logoImg, logoPersonalizada, margem, 8, 16);
      formatoTexto(doc, 13, texto, true);
      doc.text((doc.splitTextToSize(nomeMarca, 100) as string[])[0], margem + 20, 14.8);
      formatoTexto(doc, 8.5, cinza);
      doc.text(subMarca, margem + 20, 20.2);
      formatoTexto(doc, 15, azul, true);
      doc.text(identificador.toLocaleUpperCase('pt-BR'), direita, 14.2, { align: 'right' });
      formatoTexto(doc, 8.5, cinza);
      doc.text([relatorio.versao ? `Versão ${relatorio.versao}` : '', dataTexto].filter(Boolean).join('  ·  '), direita, 19.6, { align: 'right' });
      if (relatorio.situacao) {
        const tom = tonsSituacao(relatorio.situacao);
        formatoTexto(doc, 7.5, tom.texto, true);
        const rotulo = relatorio.situacao.toLocaleUpperCase('pt-BR');
        const w = doc.getTextWidth(rotulo) + 6;
        doc.setFillColor(tom.fundo);
        doc.roundedRect(direita - w, 22, w, 5, 2.5, 2.5, 'F');
        doc.text(rotulo, direita - w / 2, 25.5, { align: 'center' });
      }
      doc.setFillColor(azul);
      doc.rect(margem, 30, largura, 0.7, 'F');
      doc.setFillColor(laranja);
      doc.rect(margem, 30, 32, 0.7, 'F');
    };
    const cabecalhoContinuacao = () => {
      desenharLogo(logoImg, logoPersonalizada, margem, 6.5, 7);
      formatoTexto(doc, 9, texto, true);
      doc.text((doc.splitTextToSize(nomeMarca, 100) as string[])[0], margem + 10, 11);
      formatoTexto(doc, 8.5, azul, true);
      doc.text(`${identificador} · continuação`, direita, 11, { align: 'right' });
      doc.setFillColor(azul);
      doc.rect(margem, 15.5, largura, 0.5, 'F');
    };
    cabecalhoCompleto();

    const reservar = (altura: number) => {
      if (y + altura <= fim || y === inicioPagina) return;
      doc.addPage();
      cabecalhoContinuacao();
      inicioPagina = 22;
      y = inicioPagina;
    };
    const linhasDe = (conteudo: string, tamanho: number, larguraTexto: number, negrito = false) => {
      formatoTexto(doc, tamanho, texto, negrito);
      return doc.splitTextToSize(conteudo.replace(/\r\n?/g, '\n'), larguraTexto) as string[];
    };

    // ----- Título -----
    formatoTexto(doc, 8, laranja, true);
    doc.text('RELATÓRIO DIÁRIO DE OBRA', margem, y);
    y += 7;
    const nomeObra = relatorio.subtitulo || relatorio.titulo;
    const linhasObra = linhasDe(nomeObra, 18, largura, true);
    formatoTexto(doc, 18, texto, true);
    for (const linha of linhasObra) { doc.text(linha, margem, y); y += 7.4; }
    y += 1;

    // ----- Ficha de identificação -----
    const todosDados = relatorio.dados.filter(({ valor }) => valor.trim());
    const autenticidade = todosDados.filter(({ rotulo }) => /^(sha[- ]?256|hash|referência do rdo)/i.test(rotulo));
    const ocultos = /^(data(?: do registro)?|hor[áa]rio|clima|condição de trabalho|situação|cliente|nome do assinante|assinante|assinado por)$/i;
    const buscar = (re: RegExp) => todosDados.find(d => re.test(d.rotulo));
    const principais = [buscar(/^data(?: do registro)?$/i), buscar(/^hor[áa]rio$/i), buscar(/^clima$/i), buscar(/^condição de trabalho$/i)].filter(Boolean) as DocumentoRdo['dados'];
    const secundarios = [
      buscar(/^cliente$/i),
      ...todosDados.filter(d => !ocultos.test(d.rotulo) && !autenticidade.includes(d)),
    ].filter(Boolean) as DocumentoRdo['dados'];
    type Celula = { rotulo: string; valor: string; coluna: number; colunas: number };
    const linhasFicha: Celula[][] = [];
    if (principais.length) linhasFicha.push(principais.map((d, i) => ({ ...d, coluna: i, colunas: principais.length })));
    for (let i = 0; i < secundarios.length; i++) {
      const atual = secundarios[i];
      const seguinte = secundarios[i + 1];
      if (seguinte && atual.valor.length <= 34 && seguinte.valor.length <= 34) {
        linhasFicha.push([{ ...atual, coluna: 0, colunas: 2 }, { ...seguinte, coluna: 1, colunas: 2 }]);
        i++;
      } else linhasFicha.push([{ ...atual, coluna: 0, colunas: 1 }]);
    }
    if (linhasFicha.length) {
      const medidas = linhasFicha.map(linha => {
        const lin = linha.map(cel => linhasDe(cel.valor, 9.5, largura / cel.colunas - 6, true));
        return { lin, altura: 4.8 + Math.max(...lin.map(l => l.length)) * 4.1 + 2.6 };
      });
      const total = medidas.reduce((t, m) => t + m.altura, 0);
      reservar(total + 4);
      doc.setFillColor('#F8FAFC');
      doc.setDrawColor(borda);
      doc.setLineWidth(0.25);
      doc.roundedRect(margem, y, largura, total, 1.6, 1.6, 'FD');
      let yy = y;
      for (const [r, linha] of linhasFicha.entries()) {
        if (r) { doc.setDrawColor(borda); doc.line(margem, yy, direita, yy); }
        for (const [k, cel] of linha.entries()) {
          const w = largura / cel.colunas;
          const x = margem + cel.coluna * w;
          if (cel.coluna) { doc.setDrawColor(borda); doc.line(x, yy + 1.8, x, yy + medidas[r].altura - 1.8); }
          formatoTexto(doc, 6.8, cinza, true);
          doc.text(cel.rotulo.toLocaleUpperCase('pt-BR').slice(0, 40), x + 3, yy + 4.2);
          formatoTexto(doc, 9.5, texto, true);
          for (const [i, l] of medidas[r].lin[k].entries()) doc.text(l, x + 3, yy + 8.4 + i * 4.1);
        }
        yy += medidas[r].altura;
      }
      y += total + 5;
    }

    // ----- Seções de texto -----
    const titulo = (rotulo: string, primeiraParte: number) => {
      y += 3;
      reservar(9 + primeiraParte);
      doc.setFillColor(laranja);
      doc.rect(margem, y - 2.6, 2.2, 2.2 + 0.4, 'F');
      formatoTexto(doc, 9, azul, true);
      const t = rotulo.toLocaleUpperCase('pt-BR');
      doc.text(t, margem + 4.2, y);
      doc.setDrawColor(borda);
      doc.setLineWidth(0.25);
      doc.line(margem + 6 + doc.getTextWidth(t), y - 1, direita, y - 1);
      y += 5;
    };
    const paragrafo = (conteudo: string, cor = texto) => {
      const linhas = linhasDe(conteudo, 10, largura);
      for (const linha of linhas) {
        reservar(4.8);
        formatoTexto(doc, 10, cor);
        doc.text(linha, margem, y);
        y += 4.8;
      }
      y += 3.2;
    };
    for (const secaoRdo of relatorio.secoes.filter(({ texto: t }) => t.trim())) {
      const ocorrencia = /ocorr/i.test(secaoRdo.titulo);
      titulo(secaoRdo.titulo, 10);
      if (ocorrencia) {
        const linhas = linhasDe(secaoRdo.texto, 10, largura - 6);
        const altura = linhas.length * 4.8 + 4;
        reservar(Math.min(altura, fim - inicioPagina));
        if (y + altura <= fim) {
          doc.setFillColor('#FFF8F0');
          doc.setDrawColor('#F5C99A');
          doc.setLineWidth(0.25);
          doc.roundedRect(margem, y - 3.4, largura, altura, 1.2, 1.2, 'FD');
          doc.setFillColor(laranja);
          doc.rect(margem, y - 3.4, 1.2, altura, 'F');
          formatoTexto(doc, 10, '#7A3A00');
          for (const l of linhas) { doc.text(l, margem + 4, y); y += 4.8; }
          y += 4;
          continue;
        }
      }
      paragrafo(secaoRdo.texto);
    }

    // ----- Fotografias -----
    if (relatorio.fotos.length) {
      titulo(`Registro fotográfico (${relatorio.fotos.length})`, 70);
      const larguraCelula = (largura - 5) / 2;
      const alturaImagem = 58;
      for (let i = 0; i < relatorio.fotos.length; i += 2) {
        const grupo = relatorio.fotos.slice(i, i + 2);
        const preparadas = await Promise.all(grupo.map(f => prepararImagem(f.url, 'JPEG', 1400, signal)));
        const legendas = grupo.map((f, k) => linhasDe(`Foto ${i + k + 1}${f.legenda?.trim() ? ` — ${f.legenda.trim()}` : ''}`, 8.5, larguraCelula));
        const metas = grupo.map(f => (f.metadados?.trim() ? linhasDe(f.metadados, 7.5, larguraCelula) : []));
        const alturaLinha = alturaImagem + 2 + Math.max(...legendas.map(l => l.length)) * 3.8 + Math.max(...metas.map(m => m.length)) * 3.3 + 4;
        reservar(alturaLinha);
        for (const [k, img] of preparadas.entries()) {
          const x = margem + k * (larguraCelula + 5);
          doc.setFillColor('#F1F5F9');
          doc.setDrawColor(borda);
          doc.setLineWidth(0.25);
          doc.roundedRect(x, y, larguraCelula, alturaImagem, 1.2, 1.2, 'FD');
          const esc = Math.min((larguraCelula - 2) / img.largura, (alturaImagem - 2) / img.altura);
          const w = img.largura * esc, h = img.altura * esc;
          doc.addImage(img.dados, 'JPEG', x + (larguraCelula - w) / 2, y + (alturaImagem - h) / 2, w, h);
          formatoTexto(doc, 8.5, texto);
          for (const [li, l] of legendas[k].entries()) doc.text(l, x, y + alturaImagem + 4.4 + li * 3.8);
          formatoTexto(doc, 7.5, cinza);
          for (const [li, l] of metas[k].entries()) doc.text(l, x, y + alturaImagem + 4.4 + legendas[k].length * 3.8 + li * 3.3);
        }
        y += alturaLinha;
      }
      y += 1;
    }

    // ----- Assinatura e autenticidade -----
    const assinatura = relatorio.assinatura ? await prepararImagem(relatorio.assinatura, 'PNG', 800, signal) : undefined;
    const assinante = relatorio.nomeAssinante?.trim()
      || todosDados.find(({ rotulo }) => /^(?:nome do assinante|assinante|assinado por)$/i.test(rotulo))?.valor.trim();
    const rodape = relatorio.rodape?.trim() || '';
    const rodapeDeIntegridade = /^(?:integridade|sha[- ]?256|hash)\b[^:\n]*:\s*[a-f0-9]{64}$/i.test(rodape);
    const nota = rodape && !rodapeDeIntegridade ? rodape : '';
    const qr = relatorio.verificacaoUrl
      ? await QRCode.toDataURL(relatorio.verificacaoUrl, { margin: 1, width: 360, errorCorrectionLevel: 'M' })
      : '';
    const codigos = autenticidade.map(({ rotulo, valor }) => `${rotulo}: ${valor}`);
    if (rodapeDeIntegridade) codigos.push(rodape);
    if (assinatura || codigos.length || nota || assinante || qr) {
      const ladoQr = qr ? 26 : 0;
      const larguraMeia = (largura - 5) / 2;
      const escAss = assinatura ? Math.min(64 / assinatura.largura, 18 / assinatura.altura) : 0;
      const hAss = assinatura ? assinatura.altura * escAss : 0;
      const textoAss = linhasDe(assinante ? `Assinante informado: ${assinante}` : 'Responsável pelo registro', 8, larguraMeia - 6);
      const linhasCodigo = codigos.flatMap(cod => linhasDe(cod, 6.8, larguraMeia - 6 - (qr ? ladoQr + 3 : 0)));
      const linhasQr = qr ? linhasDe('Verifique a autenticidade: aponte a câmera para o QR code ou acesse diario.obramatch.com.br/verificar', 6.8, larguraMeia - 6 - ladoQr - 3) : [];
      const linhasNota = nota ? linhasDe(nota, 8, largura - 6) : [];
      const alturaEsq = 8 + (assinatura ? hAss + 2 : 10) + 1 + textoAss.length * 3.6 + 3;
      const alturaDir = Math.max(8 + linhasCodigo.length * 3.1 + (qr ? linhasQr.length * 3.1 + 3 : 0) + 3, qr ? ladoQr + 10 : 0);
      const alturaCaixa = Math.max(alturaEsq, codigos.length || qr ? alturaDir : 0);
      const alturaTotal = alturaCaixa + (linhasNota.length ? linhasNota.length * 3.6 + 6 : 0);
      reservar(alturaTotal + 4);
      y += 2;
      doc.setFillColor('#F8FAFC');
      doc.setDrawColor(borda);
      doc.setLineWidth(0.25);
      doc.roundedRect(margem, y, largura, alturaCaixa, 1.6, 1.6, 'FD');
      formatoTexto(doc, 6.8, cinza, true);
      doc.text('ASSINATURA', margem + 3, y + 4.2);
      if (assinatura) doc.addImage(assinatura.dados, 'PNG', margem + 3, y + 6, assinatura.largura * escAss, hAss);
      const yLinha = y + 6 + (assinatura ? hAss + 1.5 : 9);
      doc.setDrawColor('#94A3B8');
      doc.line(margem + 3, yLinha, margem + 3 + larguraMeia - 8, yLinha);
      formatoTexto(doc, 8, cinza);
      for (const [i, l] of textoAss.entries()) doc.text(l, margem + 3, yLinha + 4 + i * 3.6);
      if (codigos.length || qr) {
        const xd = margem + larguraMeia + 5;
        doc.setDrawColor(borda);
        doc.line(xd - 2.5, y + 2, xd - 2.5, y + alturaCaixa - 2);
        formatoTexto(doc, 6.8, cinza, true);
        doc.text('AUTENTICIDADE E RASTREABILIDADE', xd, y + 4.2);
        formatoTexto(doc, 6.8, cinza);
        for (const [i, l] of linhasCodigo.entries()) doc.text(l, xd, y + 8 + i * 3.1);
        if (qr) {
          const xq = direita - ladoQr - 3;
          doc.addImage(qr, 'PNG', xq, y + 5, ladoQr, ladoQr);
          formatoTexto(doc, 6.8, azul, true);
          for (const [i, l] of linhasQr.entries()) doc.text(l, xd, y + 8 + linhasCodigo.length * 3.1 + 3 + i * 3.1);
        }
      }
      y += alturaCaixa + 3;
      if (linhasNota.length) {
        formatoTexto(doc, 8, cinza);
        for (const [i, l] of linhasNota.entries()) doc.text(l, margem, y + 2 + i * 3.6);
        y += linhasNota.length * 3.6 + 3;
      }
    }
    signal?.throwIfAborted();
  }

  // Índice (consolidado com vários relatórios).
  if (relatorios.length >= 5 || (relatorios.length >= 3 && doc.getNumberOfPages() >= 8)) {
    const porPagina = 24;
    const paginasIndice = Math.ceil(relatorios.length / porPagina);
    for (let folha = 0; folha < paginasIndice; folha++) {
      doc.insertPage(folha + 1);
      doc.setFillColor(azul);
      doc.rect(margem, 15.5, largura, 0.5, 'F');
      formatoTexto(doc, 9, texto, true);
      doc.text('ObraMatch Diário', margem, 11);
      formatoTexto(doc, 17, texto, true);
      doc.text('Índice de relatórios', margem, 30);
      formatoTexto(doc, 9, cinza);
      doc.text(`${relatorios.length} registros no consolidado`, margem, 37);
      for (let i = folha * porPagina; i < Math.min((folha + 1) * porPagina, relatorios.length); i++) {
        const linhaY = 48 + (i % porPagina) * 9;
        doc.setDrawColor(borda);
        doc.setLineWidth(0.18);
        doc.line(margem, linhaY + 2, direita, linhaY + 2);
        formatoTexto(doc, 9, texto);
        const primeiraLinha = (doc.splitTextToSize(`${relatorios[i].titulo}${relatorios[i].dataRegistro ? ` — ${relatorios[i].dataRegistro}` : ''}`, largura - 18) as string[])[0];
        const pagina = inicios[i] + paginasIndice;
        doc.textWithLink(primeiraLinha, margem, linhaY, { pageNumber: pagina });
        doc.text(String(pagina), direita, linhaY, { align: 'right' });
      }
    }
  }

  const paginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina++) {
    doc.setPage(pagina);
    doc.setDrawColor(borda);
    doc.setLineWidth(0.22);
    doc.line(margem, 283, direita, 283);
    formatoTexto(doc, 7.5, cinza);
    if (!semRodapeObraMatch) doc.text('Documento gerado pelo ObraMatch Diário  |  obramatch.com.br', margem, 288);
    doc.text(`Página ${pagina} de ${paginas}`, direita, 288, { align: 'right' });
  }
  const nome = relatorios.length === 1 ? relatorios[0].nomeArquivo : 'relatorios-obramatch';
  const nomeSeguro = nome.replace(/\.pdf$/i, '').replace(/[^\p{L}\p{N}._ -]/gu, '-').slice(0, 100).trim() || 'rdo-obramatch';
  return new File([doc.output('arraybuffer')], `${nomeSeguro}.pdf`, { type: 'application/pdf' });
}
