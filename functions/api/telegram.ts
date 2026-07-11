// POST /api/telegram — webhook do bot @diariomatchbot.
// Fluxo: /start CODIGO vincula a conta · áudio/texto → Gemini estrutura o RDO
// → prévia com botões → ✅ grava no Firestore com clima oficial, GPS e hash.

import { Env } from '../_lib/google';
import { fsGet, fsSet, fsAdd, fsDelete, fsQuery } from '../_lib/firestore';
import { estruturarRdo, RdoEstruturado } from '../_lib/groq';
import {
  enviarMensagem,
  enviarAcao,
  responderCallback,
  removerTeclado,
  baixarArquivo,
  buscarClimaOficial,
  uploadFotoSupabase,
  TecladoInline,
} from '../_lib/telegram';
import { lerEstadoUso, dentroDaFranquia, consumirFranquia, mensagemFranquia } from '../_lib/uso';

const FUSO = 'America/Recife';

function hojeISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: FUSO });
}
function horaAgora(): string {
  return new Date().toLocaleTimeString('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' });
}

// Hash idêntico ao do app (src/lib/hash.ts): JSON canônico + SHA-256
async function calcularHash(campos: Record<string, any>): Promise<string> {
  const ordenado: Record<string, any> = {};
  Object.keys(campos).sort().forEach((k) => (ordenado[k] = campos[k] ?? null));
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(ordenado)));
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function esc(t: string): string {
  return String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function contasDoChat(env: Env, chatId: number): Promise<{ uid: string; data: Record<string, any> }[]> {
  const rows = await fsQuery(env, 'usuarios', 'telegramChatId', chatId, 10);
  return rows.map((r) => ({ uid: r.id, data: r.data }));
}

async function usuarioDoChat(env: Env, chatId: number): Promise<{ uid: string; data: Record<string, any> } | null> {
  const contas = await contasDoChat(env, chatId);
  if (contas.length === 0) return null;
  if (contas.length === 1) return contas[0];
  // Mais de uma conta neste Telegram: usa a que o usuário escolheu por último.
  const sessao = await fsGet(env, `rdo_pendentes/${chatId}`);
  const uidEscolhido = sessao?.data?.uidEscolhido;
  const escolhida = uidEscolhido ? contas.find((c) => c.uid === uidEscolhido) : null;
  return escolhida || contas[0];
}

function rotuloConta(c: { uid: string; data: Record<string, any> }): string {
  return c.data.nome || c.data.email || `Conta ${c.uid.slice(0, 6)}`;
}

async function obrasDoUsuario(env: Env, uid: string) {
  return fsQuery(env, 'obras', 'ownerId', uid, 20);
}

function previaRdo(rdo: RdoEstruturado, obraNome: string, clima: any, fotos: number, numeroPrevisto: number): string {
  const linhas = [
    `📋 <b>Prévia — RDO Nº ${String(numeroPrevisto).padStart(3, '0')}</b> · ${new Date().toLocaleDateString('pt-BR', { timeZone: FUSO })}`,
    `🏗 Obra: <b>${esc(obraNome)}</b>`,
    clima
      ? `🌤 Clima: ${esc(clima.condicao)}, ${clima.tempMin}–${clima.tempMax}°C, ${clima.chuvaMm}mm <i>(fonte oficial)</i>`
      : `🌤 Clima: sem GPS cadastrado na obra (abra o app e capture a localização)`,
    rdo.atividades ? `🔨 <b>Atividades:</b> ${esc(rdo.atividades)}` : '',
    rdo.equipe ? `👥 <b>Equipe:</b> ${esc(rdo.equipe)}` : '',
    rdo.materiais ? `📦 <b>Materiais:</b> ${esc(rdo.materiais)}` : '',
    rdo.ocorrencias ? `⚠️ <b>Ocorrências:</b> ${esc(rdo.ocorrencias)}` : '',
    rdo.observacoes ? `📝 <b>Observações:</b> ${esc(rdo.observacoes)}` : '',
    fotos > 0 ? `📸 ${fotos} foto${fotos > 1 ? 's' : ''} anexada${fotos > 1 ? 's' : ''}` : '',
    '',
    'Confere? Nada é salvo sem a sua confirmação.',
  ];
  return linhas.filter(Boolean).join('\n');
}

const TECLADO_CONFIRMA: TecladoInline = {
  inline_keyboard: [[
    { text: '✅ Confirmar', callback_data: 'conf' },
    { text: '✏️ Corrigir', callback_data: 'corr' },
    { text: '❌ Descartar', callback_data: 'desc' },
  ]],
};

async function mostrarPrevia(env: Env, chatId: number, pend: Record<string, any>): Promise<void> {
  const obra = await fsGet(env, `obras/${pend.obraId}`);
  const numeroPrevisto = Number(obra?.data?.proximoNumeroRdo) || 1;
  let clima = pend.climaOficial || null;
  if (!clima && obra?.data?.gps) {
    clima = await buscarClimaOficial(obra.data.gps.latitude, obra.data.gps.longitude, hojeISO());
    if (clima) await fsSet(env, `rdo_pendentes/${chatId}`, { climaOficial: clima });
  }
  const rdo: RdoEstruturado = {
    atividades: pend.atividades || '', equipe: pend.equipe || '', materiais: pend.materiais || '',
    ocorrencias: pend.ocorrencias || '', observacoes: pend.observacoes || '',
  };
  await enviarMensagem(env, chatId, previaRdo(rdo, obra?.data?.nome || 'Obra', clima, (pend.fotos || []).length, numeroPrevisto), TECLADO_CONFIRMA);
}

async function confirmarRdo(env: Env, chatId: number, uid: string): Promise<void> {
  const pendDoc = await fsGet(env, `rdo_pendentes/${chatId}`);
  if (!pendDoc || (!pendDoc.data.atividades && !pendDoc.data.ocorrencias && !pendDoc.data.observacoes)) {
    await enviarMensagem(env, chatId, 'Não há registro pendente. Mande um áudio contando o dia da obra. 🎙');
    return;
  }
  if (!pendDoc.data.obraId) {
    await enviarMensagem(env, chatId, 'Falta escolher a obra deste registro. Mande o relato de novo e selecione a obra. 🏗');
    return;
  }
  const pend = pendDoc.data;
  const obra = await fsGet(env, `obras/${pend.obraId}`);
  if (!obra) {
    await enviarMensagem(env, chatId, 'Obra não encontrada. Abra o app e verifique suas obras.');
    return;
  }

  const numeroRdo = Number(obra.data.proximoNumeroRdo) || 1;
  const dataISO = pend.data || hojeISO();
  const horario = pend.horario || horaAgora();
  const gps = obra.data.gps
    ? { latitude: Number(obra.data.gps.latitude), longitude: Number(obra.data.gps.longitude) }
    : null;
  const clima = pend.climaOficial?.condicao || 'Ensolarado';

  const hashIntegridade = await calcularHash({
    obraId: pend.obraId,
    numeroRdo,
    data: dataISO,
    horario,
    clima,
    equipe: pend.equipe || '',
    atividades: pend.atividades || '',
    materiais: pend.materiais || '',
    ocorrencias: pend.ocorrencias || '',
    observacoes: pend.observacoes || '',
    gps,
  });

  const agoraISO = new Date().toISOString();
  const diarioId = await fsAdd(env, `obras/${pend.obraId}/diarios`, {
    obraId: pend.obraId,
    ownerId: pend.uid || uid,
    numeroRdo,
    data: dataISO,
    horario,
    clima,
    climaOficial: pend.climaOficial || null,
    equipe: pend.equipe || '',
    atividades: pend.atividades || '',
    materiais: pend.materiais || '',
    ocorrencias: pend.ocorrencias || '',
    observacoes: pend.observacoes || '',
    gps,
    assinatura: '',
    origem: 'telegram',
    hashIntegridade,
    createdAt: agoraISO,
    updatedAt: agoraISO,
  });

  for (const foto of pend.fotos || []) {
    await fsAdd(env, `obras/${pend.obraId}/diarios/${diarioId}/fotos`, {
      diarioId, obraId: pend.obraId, ownerId: pend.uid || uid,
      url: foto.url, legenda: foto.legenda || '',
      data: dataISO, horario, gps, createdAt: agoraISO,
    });
  }

  await fsSet(env, `obras/${pend.obraId}`, { proximoNumeroRdo: numeroRdo + 1 });
  await fsDelete(env, `rdo_pendentes/${chatId}`);

  await enviarMensagem(
    env,
    chatId,
    `✅ <b>RDO Nº ${String(numeroRdo).padStart(3, '0')} registrado com sucesso!</b>\n` +
    `🔒 Código de integridade: <code>${hashIntegridade.slice(0, 12)}…</code>\n\n` +
    `📲 O registro já foi enviado para o app ObraMatch Diário. Abra o app para ver o relatório completo e gerar o PDF.`
  );
}

async function processarRelato(
  env: Env, chatId: number, uid: string,
  entrada: { texto?: string; audioBase64?: string; mimeType?: string }
): Promise<void> {
  // Franquia de IA do plano do usuário (a IA só roda se houver saldo)
  const estado = await lerEstadoUso(env, uid);
  if (!dentroDaFranquia(estado, 'transc')) {
    await enviarMensagem(env, chatId, `⏳ ${mensagemFranquia(estado, 'transc')}`);
    return;
  }
  if (entrada.audioBase64 && entrada.audioBase64.length > estado.limites.audioMaxBase64) {
    const minutos = estado.plano === 'pro' ? '5 minutos' : '1 minuto e meio';
    await enviarMensagem(env, chatId, `🎙 Áudio muito longo para o seu plano. Grave até ${minutos}.`);
    return;
  }

  await enviarAcao(env, chatId);
  let rdo: RdoEstruturado;
  try {
    rdo = await estruturarRdo(env, entrada);
  } catch (err) {
    console.error('Gemini falhou:', err);
    await enviarMensagem(env, chatId, '😕 Não consegui processar agora. Tente de novo em instantes ou registre pelo app.');
    return;
  }
  if (!rdo.atividades && !rdo.ocorrencias && !rdo.observacoes) {
    await enviarMensagem(env, chatId, 'Não identifiquei informações de obra no relato. Tente contar o que foi feito hoje: serviços, equipe, materiais e imprevistos. 🎙');
    return;
  }

  // Consome a franquia SOMENTE após a IA ter respondido com sucesso.
  await consumirFranquia(env, uid, estado, 'transc');

  const pendAnterior = await fsGet(env, `rdo_pendentes/${chatId}`);

  // Se este Telegram atende mais de uma conta e ainda nao foi escolhida, pergunta.
  const contas = await contasDoChat(env, chatId);
  const uidEscolhido = pendAnterior?.data?.uidEscolhido;
  if (contas.length > 1 && !uidEscolhido) {
    const rdoPend: Record<string, any> = {
      uid, chatId, ...rdo,
      data: hojeISO(), horario: horaAgora(),
      fotos: pendAnterior?.data?.fotos || [],
      climaOficial: null,
      obraId: null,
      criadoEm: Date.now(),
    };
    await fsSet(env, `rdo_pendentes/${chatId}`, rdoPend);
    const teclado: TecladoInline = {
      inline_keyboard: contas.map((c) => [{ text: `\u{1F464} ${rotuloConta(c)}`.slice(0, 60), callback_data: `conta:${c.uid}` }]),
    };
    await enviarMensagem(env, chatId, 'Este Telegram esta ligado a mais de uma conta. Registrar em qual?', teclado);
    return;
  }
  const uidFinal = uidEscolhido || uid;

  const obras = await obrasDoUsuario(env, uidFinal);
  if (obras.length === 0) {
    await enviarMensagem(env, chatId, 'Você ainda não tem obra cadastrada. Abra o app ObraMatch Diário e crie a primeira. 🏗');
    return;
  }

  const pend: Record<string, any> = {
    uid: uidFinal, chatId, ...rdo,
    data: hojeISO(), horario: horaAgora(),
    fotos: pendAnterior?.data?.fotos || [],
    climaOficial: null,
    uidEscolhido: uidEscolhido || null,
    obraId: pendAnterior?.data?.obraId || (obras.length === 1 ? obras[0].id : null),
    criadoEm: Date.now(),
  };
  await fsSet(env, `rdo_pendentes/${chatId}`, pend);

  if (!pend.obraId) {
    const teclado: TecladoInline = {
      inline_keyboard: obras.map((o) => [{ text: `🏗 ${o.data.nome}`.slice(0, 60), callback_data: `obra:${o.id}` }]),
    };
    await enviarMensagem(env, chatId, 'Esse registro é de qual obra?', teclado);
    return;
  }
  await mostrarPrevia(env, chatId, pend);
}

export const onRequestPost = async (ctx: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = ctx;

  if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.TELEGRAM_SECRET) {
    return new Response('unauthorized', { status: 401 });
  }

  let update: any;
  try { update = await request.json(); } catch { return new Response('ok'); }

  try {
    // Idempotência: o Telegram reenvia updates em timeout; nunca processar 2x.
    const updateId = Number(update?.update_id) || 0;
    const chatIdBruto = update?.message?.chat?.id || update?.callback_query?.message?.chat?.id;
    if (updateId && chatIdBruto) {
      try {
        const marca = await fsGet(env, `tg_updates/${chatIdBruto}`);
        if (Number(marca?.data?.ultimoUpdateId) >= updateId) return new Response('ok');
        await fsSet(env, `tg_updates/${chatIdBruto}`, { ultimoUpdateId: updateId, em: new Date().toISOString() });
      } catch { /* melhor esforço */ }
    }

    // ---------- Botões ----------
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message?.chat?.id;
      await responderCallback(env, cb.id);
      if (cb.message?.message_id) await removerTeclado(env, chatId, cb.message.message_id);

      const usuario = await usuarioDoChat(env, chatId);
      if (!usuario) { await enviarMensagem(env, chatId, 'Conta não vinculada. Abra o app e toque em "Conectar" no cartão do Telegram.'); return new Response('ok'); }

      const dado = String(cb.data || '');
      if (dado.startsWith('conta:')) {
        const uidEscolhido = dado.slice(6);
        await fsSet(env, `rdo_pendentes/${chatId}`, { uidEscolhido });
        const pend = await fsGet(env, `rdo_pendentes/${chatId}`);
        const obras = await obrasDoUsuario(env, uidEscolhido);
        if (obras.length === 0) {
          await enviarMensagem(env, chatId, 'Essa conta ainda não tem obra cadastrada. Abra o app ObraMatch Diário e crie a primeira. 🏗');
          return new Response('ok');
        }
        if (obras.length === 1) {
          await fsSet(env, `rdo_pendentes/${chatId}`, { obraId: obras[0].id });
          const p2 = await fsGet(env, `rdo_pendentes/${chatId}`);
          if (p2) await mostrarPrevia(env, chatId, p2.data);
        } else {
          const teclado: TecladoInline = {
            inline_keyboard: obras.map((o) => [{ text: `🏗 ${o.data.nome}`.slice(0, 60), callback_data: `obra:${o.id}` }]),
          };
          await enviarMensagem(env, chatId, 'Esse registro é de qual obra?', teclado);
        }
      } else if (dado.startsWith('obra:')) {
        const obraId = dado.slice(5);
        await fsSet(env, `rdo_pendentes/${chatId}`, { obraId });
        const pend = await fsGet(env, `rdo_pendentes/${chatId}`);
        if (pend) await mostrarPrevia(env, chatId, pend.data);
      } else if (dado === 'conf') {
        await confirmarRdo(env, chatId, usuario.uid);
      } else if (dado === 'corr') {
        await enviarMensagem(env, chatId, '✏️ Sem problema. Mande um novo áudio com o relato corrigido — vou montar a prévia de novo.');
      } else if (dado === 'desc') {
        await fsDelete(env, `rdo_pendentes/${chatId}`);
        await enviarMensagem(env, chatId, '🗑 Registro descartado. Nada foi salvo.');
      }
      return new Response('ok');
    }

    // ---------- Mensagens ----------
    const msg = update.message;
    if (!msg?.chat?.id) return new Response('ok');
    const chatId: number = msg.chat.id;
    const texto: string = msg.text || '';

    // /start CODIGO — vínculo da conta
    if (texto.startsWith('/start')) {
      const codigo = texto.split(' ')[1]?.trim().toUpperCase();
      if (!codigo) {
        await enviarMensagem(env, chatId,
          '👷 <b>ObraMatch Diário</b> — seu diário de obra por áudio.\n\n' +
          'Para conectar sua conta: abra o app <b>ObraMatch Diário</b>, toque em <b>Conectar</b> no cartão do Telegram e volte aqui.');
        return new Response('ok');
      }
      const rows = await fsQuery(env, 'usuarios', 'telegramLinkCode', codigo, 1);
      const valido = rows.length && Number(rows[0].data.telegramLinkExpira || 0) > Date.now();
      if (!valido) {
        await enviarMensagem(env, chatId, 'Código inválido ou expirado. Gere um novo no app (cartão "Diário pelo Telegram").');
        return new Response('ok');
      }
      await fsSet(env, `usuarios/${rows[0].id}`, { telegramChatId: chatId, telegramLinkCode: null });
      const obras = await obrasDoUsuario(env, rows[0].id);
      const lista = obras.length
        ? '\n\nSuas obras:\n' + obras.map((o) => `🏗 ${esc(o.data.nome)}`).join('\n')
        : '\n\nVocê ainda não tem obras — cadastre a primeira no app.';
      await enviarMensagem(env, chatId,
        `✅ <b>Conta conectada!</b>${lista}\n\n` +
        `Agora é só mandar um <b>áudio</b> contando o dia da obra que eu monto o RDO. Fotos também valem. 🎙📸`);
      return new Response('ok');
    }

    if (texto.startsWith('/ajuda')) {
      await enviarMensagem(env, chatId,
        '🎙 <b>Como usar o ObraMatch Diário</b>\n\n' +
        '1. Mande um <b>áudio</b> (ou texto) contando o dia: serviços feitos, equipe, materiais e imprevistos.\n' +
        '2. Se quiser, mande <b>fotos</b> antes de confirmar.\n' +
        '3. Eu monto o RDO com clima oficial e você só confirma. ✅\n\n' +
        'O relatório completo e o PDF ficam no app ObraMatch Diário. 📲');
      return new Response('ok');
    }

    const usuario = await usuarioDoChat(env, chatId);
    if (!usuario) {
      await enviarMensagem(env, chatId, 'Sua conta ainda não está conectada. Abra o app <b>ObraMatch Diário</b> e toque em <b>Conectar</b> no cartão do Telegram.');
      return new Response('ok');
    }

    if (texto.startsWith('/hoje')) {
      const obras = await obrasDoUsuario(env, usuario.uid);
      const resumo = obras.length
        ? obras.map((o) => `🏗 ${esc(o.data.nome)} — último RDO: Nº ${String(Math.max((Number(o.data.proximoNumeroRdo) || 1) - 1, 0)).padStart(3, '0')}`).join('\n')
        : 'Nenhuma obra cadastrada ainda.';
      await enviarMensagem(env, chatId, `📊 <b>Suas obras</b>\n\n${resumo}`);
      return new Response('ok');
    }

    // Áudio / mensagem de voz
    const voz = msg.voice || msg.audio;
    if (voz?.file_id) {
      if ((voz.file_size || 0) > 15_000_000) {
        await enviarMensagem(env, chatId, 'Áudio muito grande. Grave até uns 5 minutos, por favor.');
        return new Response('ok');
      }
      const arquivo = await baixarArquivo(env, voz.file_id);
      if (!arquivo) {
        await enviarMensagem(env, chatId, 'Não consegui baixar o áudio. Tente enviar de novo.');
        return new Response('ok');
      }
      await processarRelato(env, chatId, usuario.uid, { audioBase64: arquivo.base64, mimeType: arquivo.mime });
      return new Response('ok');
    }

    // Foto — anexa ao registro pendente (ou abre um novo aguardando o áudio)
    if (Array.isArray(msg.photo) && msg.photo.length) {
      const maior = msg.photo[msg.photo.length - 1];
      const arquivo = await baixarArquivo(env, maior.file_id);
      if (!arquivo) { await enviarMensagem(env, chatId, 'Não consegui baixar a foto. Tente de novo.'); return new Response('ok'); }
      const url = await uploadFotoSupabase(env, arquivo.base64, arquivo.mime, `telegram/${chatId}/${Date.now()}.jpg`);
      if (!url) {
        await enviarMensagem(env, chatId, '📸 Recebi a foto, mas o armazenamento de imagens ainda não está configurado — ela não será anexada. O relato em áudio funciona normalmente.');
        return new Response('ok');
      }
      const pend = await fsGet(env, `rdo_pendentes/${chatId}`);
      const fotos = [...(pend?.data?.fotos || []), { url, legenda: msg.caption || '' }];
      await fsSet(env, `rdo_pendentes/${chatId}`, { uid: usuario.uid, chatId, fotos, criadoEm: pend?.data?.criadoEm || Date.now() });
      await enviarMensagem(env, chatId, pend?.data?.atividades
        ? `📸 Foto anexada (${fotos.length} no total). Toque em ✅ na prévia para salvar ou mande outra foto.`
        : `📸 Foto guardada (${fotos.length}). Agora mande o <b>áudio</b> contando o dia que eu monto o RDO.`);
      if (pend?.data?.atividades && pend?.data?.obraId) {
        const atualizado = await fsGet(env, `rdo_pendentes/${chatId}`);
        if (atualizado) await mostrarPrevia(env, chatId, atualizado.data);
      }
      return new Response('ok');
    }

    // Texto simples → mesmo fluxo do áudio
    if (texto.trim()) {
      await processarRelato(env, chatId, usuario.uid, { texto });
      return new Response('ok');
    }

    await enviarMensagem(env, chatId, 'Mande um áudio 🎙, um texto ou fotos 📸 do dia da obra. Digite /ajuda para ver como funciona.');
    return new Response('ok');
  } catch (err: any) {
    console.error('Erro no webhook:', err?.message || err);
    return new Response('ok'); // sempre 200 para o Telegram não reenviar em loop
  }
};
