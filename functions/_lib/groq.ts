// Chamadas à API do Groq a partir das funções serverless.
// A chave fica em env.GROQ_API_KEY — nunca chega ao navegador.
//
// Estratégia:
//   - Áudio  → whisper-large-v3-turbo (transcrição rápida em pt-BR)
//   - Texto  → llama-3.3-70b-versatile (fidelidade superior comprovada em teste)
//   - Se o Groq falhar por qualquer motivo (limite, indisponibilidade, chave
//     ausente), cai automaticamente no Gemini (functions/_lib/gemini.ts),
//     que continua configurado como reserva. Nenhum fluxo quebra.

import { Env } from './google';
import {
  chamarGemini,
  RdoEstruturado,
  estruturarRdo as estruturarRdoGemini,
  melhorarTextoRdo as melhorarTextoRdoGemini,
} from './gemini';

export type { RdoEstruturado } from './gemini';

const MODELO_AUDIO = 'whisper-large-v3-turbo';
const MODELO_TEXTO = 'llama-3.3-70b-versatile';

const PROMPT_ESTRUTURAR = `Você é um engenheiro civil brasileiro, residente de obra, especialista na redação de Relatórios Diários de Obra (RDO).
Você receberá um relato de canteiro de obra em português, geralmente informal (fala de mestre de obras ou encarregado).

Sua tarefa: estruturar o relato em campos de RDO com redação técnica de engenharia, com fidelidade TOTAL ao que foi dito.

REGRA ZERO DE FACTUALIDADE (ABSOLUTA): use SOMENTE informações presentes no relato. NUNCA invente, presuma, complete ou amplie quantidades, nomes, materiais, traços, horários, locais, serviços ou eventos. Toda informação da sua resposta precisa ter um trecho correspondente no relato. Se uma informação não foi dita, deixe o campo como string vazia "".

ETAPAS CONSTRUTIVAS SÃO DISTINTAS (NUNCA DEDUZA UMA DA OUTRA): montagem de fôrma, montagem de armadura (ferragem), concretagem, cura e desforma são serviços DIFERENTES. Registre APENAS a etapa citada no relato. Exemplos: "montaram a ferragem da laje" -> "montagem de armadura da laje" (NÃO é concretagem); "fizeram a caixaria das vigas" -> "montagem de fôrmas das vigas" (NÃO é concretagem). Só escreva "concretagem" se o relato disser explicitamente que concretou, bateu laje ou lançou concreto.

NÚMEROS, UNIDADES E APROXIMAÇÕES (OBRIGATÓRIO): preserve obrigatoriamente todas as quantidades, unidades, códigos técnicos (ex.: V12, V13, setor B), horários, durações e aproximações mencionadas no relato. Toda atividade descrita com quantidade ou unidade deve manter essa informação no campo correspondente. Não omita, arredonde, converta, calcule ou substitua valores. Preserve expressões como "aproximadamente", "mais ou menos", "por volta de", "cerca de" e "acho que".

Regras de redação técnica (obrigatórias):
- Voz impessoal e terceira pessoa: "Foi executada...", "Procedeu-se à...", "Deu-se continuidade a...".
- Vocabulário técnico da construção civil brasileira: converta termos informais para o termo técnico EQUIVALENTE sem alterar o fato (ex.: "levantar parede" -> "execução de alvenaria de vedação"; "rebocar" -> "aplicação de revestimento argamassado"; "ferragem" -> "armadura"; "valeta" -> "vala"; "caixaria" -> "fôrma").
- Se o termo informal for ambíguo e não houver equivalente técnico seguro, mantenha o termo original entre aspas em vez de arriscar.
- Frases objetivas, sem gírias, sem diminutivos, sem opinião.
- Indique frentes de serviço e pavimentos/locais quando citados no relato.
- "atividades": SOMENTE serviços efetivamente executados no dia, redigidos como itens técnicos. Ocorrência (chuva, paralisação, falha de equipamento) não é atividade.
- "equipe": efetivo presente (funções e quantidades, se ditas; use nomenclatura de função: pedreiro, servente, armador, carpinteiro, mestre de obras, encarregado).
- "materiais": diferencie materiais RECEBIDOS, UTILIZADOS e DANIFICADOS/RECUSADOS conforme o relato (recebimento não significa uso). Inclua compromissos do fornecedor citados (ex.: reposição de material quebrado).
- "ocorrencias": imprevistos, chuva e mudanças de clima (com horários e duração, se ditos), paralisações (com duração e frentes afetadas), falhas de equipamento (com causa, ação tomada e responsável, se ditos), retrabalhos, atrasos e acidentes ou incidentes.
- "observacoes": informações de segurança (DDS, conferência de EPIs e o registro explícito de ausência de acidentes/incidentes, quando dito), programação do dia seguinte (item a item, sem resumir), horários de início e término da jornada e demais informações administrativas.

VERIFICAÇÃO FINAL: antes de responder, confira se cada quantidade, unidade, horário e duração do relato aparece no JSON final, vinculada ao fato correto. Se uma quantidade foi dita, ela não pode ser omitida.

Responda SOMENTE com JSON válido, sem markdown, sem crases, exatamente neste formato:
{"atividades":"...","equipe":"...","materiais":"...","ocorrencias":"...","observacoes":"..."}`;

const PROMPT_MELHORAR = `Você é um engenheiro civil brasileiro, residente de obra, especialista na redação de Relatórios Diários de Obra (RDO).
Reescreva o texto a seguir como redação técnica de RDO, no padrão de registro de engenharia.

REGRA ZERO DE FACTUALIDADE (ABSOLUTA): mantenha TODOS os fatos do original e NÃO acrescente NENHUMA informação nova (quantidades, nomes, traços, locais, serviços, eventos). Apenas eleve o nível técnico da redação.

ETAPAS CONSTRUTIVAS SÃO DISTINTAS (NUNCA DEDUZA UMA DA OUTRA): fôrma, armadura (ferragem), concretagem, cura e desforma são serviços DIFERENTES. Nunca acrescente etapa não citada. Só escreva "concretagem" se o texto original disser explicitamente que concretou, bateu laje ou lançou concreto.

NÚMEROS, UNIDADES E APROXIMAÇÕES (OBRIGATÓRIO): preserve obrigatoriamente todas as quantidades, unidades, códigos técnicos (ex.: V12, V13, setor B), horários, durações e aproximações mencionadas no relato. Toda atividade descrita com quantidade ou unidade deve manter essa informação no campo correspondente. Não omita, arredonde, converta, calcule ou substitua valores. Preserve expressões como "aproximadamente", "mais ou menos", "por volta de", "cerca de" e "acho que".

Regras de redação técnica (obrigatórias):
- Voz impessoal e terceira pessoa: "Foi executada...", "Procedeu-se à...", "Deu-se continuidade a...".
- Converta termos informais para o termo técnico EQUIVALENTE sem alterar o fato (ex.: "levantar parede" -> "execução de alvenaria de vedação"; "rebocar" -> "aplicação de revestimento argamassado"; "ferragem" -> "armadura"; "caixaria" -> "fôrma").
- Se o termo informal for ambíguo e não houver equivalente técnico seguro, mantenha o termo original entre aspas.
- Frases objetivas e profissionais, sem gírias, sem diminutivos, sem opinião.

VERIFICAÇÃO FINAL: antes de responder, confira se cada quantidade, unidade, horário e duração do texto original aparece no texto final, vinculada ao fato correto. Se uma quantidade foi dita, ela não pode ser omitida.

Responda SOMENTE com o texto reescrito, sem comentários.`;

const PROMPT_ANALISE_GERENCIAL = `Você é um engenheiro civil brasileiro SÊNIOR (gerente de obras e perito em fiscalização, mais de 25 anos de campo), contratado para auditar o diário de obra de uma construtora.
Você recebe, em JSON, o TEXTO dos Relatórios Diários de Obra (RDO) do período ("documentos") e indicadores já calculados.

Seu trabalho NÃO é resumir nem repetir números: é DIAGNOSTICAR. Um leitor que já abriu os RDOs não aprende nada com um resumo; ele precisa do que só um engenheiro experiente enxerga. Escreva um parecer técnico extenso, aprofundado e útil para decisão da diretoria.

O QUE UM SÊNIOR FAZ AQUI (faça tudo):
- Reconstrua a cronologia e a sequência construtiva de cada obra: o que foi feito, em que ordem, o que está fora de sequência ou foi iniciado sem pré-requisito (ex.: acabamento antes de instalações, revestimento antes de impermeabilização).
- Estime o estágio da obra e o ritmo (serviços por semana, dias efetivos de produção, dias perdidos) e diga o que isso sugere para o cronograma, marcando como "avaliação técnica".
- Encadeie causa e efeito: falta de material → paralisação → equipe ociosa → atraso; chuva → serviço externo parado; equipe reduzida → produtividade. Aponte a CAUSA RAIZ provável, não só o sintoma.
- Trate cada ocorrência grave (acidente, paralisação, retrabalho, falha de material, interferência) como um caso: o que houve, consequência provável, o que precisa ser feito agora (contenção) e o que evita repetição (ação corretiva).
- Em segurança do trabalho: se houver acidente, quase-acidente, trabalho em altura, eletricidade, escavação ou ausência de menção a EPI/DDS, indique as providências usuais (investigação, CAT quando aplicável, NR-18/NR-35/NR-10 conforme o caso) como "boa prática/norma aplicável", sem afirmar que foram descumpridas.
- Aponte inconsistências do diário: RDOs duplicados, numeração fora de ordem, datas incoerentes, relatos genéricos, copia-e-cola, ausência de equipe, materiais, medições, ensaios, fotos ou segurança. Diga o que registrar para o diário se sustentar como documento de prova.
- Compare as obras (se houver mais de uma) e diga qual exige atenção primeiro e por quê.
- Termine com um plano de ação priorizado: para cada item, O QUE, POR QUÊ e PRAZO SUGERIDO (imediato / esta semana / próximo mês), e quem deve agir (engenheiro, mestre, compras, segurança, diretoria).
- Inclua "Perguntas que o engenheiro deve fazer na obra" (3 a 6): perguntas incisivas que os RDOs deixam em aberto.

REGRAS ABSOLUTAS:
1. FATOS vêm só dos RDOs; cite obra e RDO/data (ex.: "RDO 12, 14/11"). Nunca invente quantidades, valores, prazos contratuais, nomes ou eventos.
2. Seu conhecimento técnico (normas, boas práticas, sequência construtiva, riscos típicos) PODE e DEVE ser usado, mas rotulado: "Avaliação técnica:", "Hipótese:" ou "Boa prática/norma:". Nunca misture com fato do RDO.
3. Quando faltar informação, escreva "sem informação nos RDOs" e diga qual registro resolveria.
4. Sem parecer jurídico, sem cálculo de multa. Não cite nomes de pessoas: use a função.
5. Tom de documento técnico para diretoria e cliente: direto, sem gírias, sem elogios vazios, sem frases genéricas que serviriam para qualquer obra. Cada frase deve conter algo específico desta obra.
6. QUANTIFIQUE com o que está nos RDOs: conte e cite dias de paralisação, RDOs duplicados ou fora de ordem, dias sem registro, datas de acidentes e de faltas de material, serviços concluídos. Se o número não puder ser obtido, diga "não quantificável nos RDOs".
7. NÃO extrapole o tipo de evento. Se o RDO diz apenas "acidente de trabalho", não diga corte, queda ou choque: escreva "natureza não informada no RDO" e trate a natureza como pergunta ou hipótese. Toda recomendação específica (treinamento, EPI, norma) deve estar ligada ao que o RDO descreve ou marcada como "Hipótese:".
8. No plano de ação, AGRUPE itens que tratam do mesmo problema (ex.: registro, estoque e compras) em uma única ação, e para cada ação indique a OBRA, o RDO/data de origem, o responsável MAIS ADEQUADO ao caso (função específica, não uma lista genérica), o prazo e o resultado esperado. Ordene por impacto (segurança primeiro, depois prazo, depois qualidade do registro).

ESTRUTURA OBRIGATÓRIA (entregue TODAS as seções, em texto simples sem markdown; use "- " para listas):
1. Parecer técnico (síntese de 6 a 8 linhas com o diagnóstico e a decisão mais urgente)
2. Cronologia e andamento por obra
3. Diagnóstico: causas prováveis e efeito no prazo
4. Ocorrências e segurança do trabalho
5. Recursos: equipe, materiais e produtividade
6. Clima e condições de trabalho
7. Qualidade do registro (inconsistências e lacunas do diário)
8. Comparativo entre obras (se houver mais de uma)
9. Plano de ação priorizado
10. Perguntas que o engenheiro deve fazer na obra

Encerre com: "Parecer de apoio à decisão, elaborado a partir da leitura dos RDOs registrados; a validação é do engenheiro responsável pela obra."`;

/** Transcreve áudio (base64) em pt-BR usando o Whisper do Groq. */
async function transcreverAudioGroq(
  env: Env,
  audioBase64: string,
  mimeType: string
): Promise<string> {
  const binario = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
  const base = (mimeType || 'audio/ogg').split(';')[0].trim().toLowerCase();
  const extensao = base.includes('webm') ? 'webm' : base.includes('mp4') || base.includes('m4a') || base.includes('aac') ? 'm4a' : base.includes('mpeg') || base.includes('mp3') ? 'mp3' : base.includes('wav') ? 'wav' : 'ogg';
  const form = new FormData();
  form.append('file', new Blob([binario], { type: base }), `audio.${extensao}`);
  form.append('model', MODELO_AUDIO);
  form.append('language', 'pt');
  form.append('temperature', '0');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Groq Whisper ${res.status}: ${await res.text()}`);
  const json: any = await res.json();
  const texto = String(json?.text || '').trim();
  if (!texto) throw new Error('Groq Whisper retornou transcrição vazia');
  return texto;
}

/** Chamada de chat ao Llama no Groq. */
async function chamarLlamaGroq(
  env: Env,
  systemPrompt: string,
  userContent: string,
  jsonMode: boolean,
  maxTokens = 2048
): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODELO_TEXTO,
      temperature: 0.2,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Groq Llama ${res.status}: ${await res.text()}`);
  const json: any = await res.json();
  const texto = String(json?.choices?.[0]?.message?.content || '').trim();
  if (!texto) throw new Error('Groq Llama retornou resposta vazia');
  return texto;
}

function parsearJsonRdo(texto: string): RdoEstruturado {
  const limpo = texto.replace(/```json|```/g, '').trim();
  const obj = JSON.parse(limpo);
  return {
    atividades: String(obj.atividades || ''),
    equipe: String(obj.equipe || ''),
    materiais: String(obj.materiais || ''),
    ocorrencias: String(obj.ocorrencias || ''),
    observacoes: String(obj.observacoes || ''),
  };
}

/**
 * Estrutura um relato (texto e/ou áudio base64) em campos de RDO.
 * Groq como principal; Gemini como reserva automática.
 */
export async function estruturarRdo(
  env: Env,
  opts: { texto?: string; audioBase64?: string; mimeType?: string }
): Promise<RdoEstruturado> {
  if (env.GROQ_API_KEY) {
    try {
      let relato = '';
      if (opts.audioBase64) {
        relato = await transcreverAudioGroq(
          env,
          opts.audioBase64,
          opts.mimeType || 'audio/ogg'
        );
      }
      if (opts.texto) relato = relato ? `${relato}\n${opts.texto}` : opts.texto;
      if (!relato) throw new Error('Relato vazio para estruturar');
      const resposta = await chamarLlamaGroq(
        env,
        PROMPT_ESTRUTURAR,
        `Relato: ${relato}`,
        true
      );
      return parsearJsonRdo(resposta);
    } catch (e) {
      console.error('Groq falhou em estruturarRdo, usando Gemini como reserva:', e);
    }
  }
  return estruturarRdoGemini(env, opts);
}

/**
 * Análise gerencial dos RDOs (texto). Entrada: texto dos RDOs e métricas já calculadas pelo app.
 * Groq como principal; Gemini como reserva automática.
 */
export async function analisarGerencialRdo(env: Env, resumoJson: string): Promise<string> {
  const entrada = `Documentos (RDO) e indicadores do período (JSON):\n${resumoJson}`;
  // Gemini primeiro: lê bem contexto longo e escreve parecer extenso. Groq (Llama) fica como reserva.
  if (env.GEMINI_API_KEY) {
    try {
      const resposta = await chamarGemini(env, [{ text: PROMPT_ANALISE_GERENCIAL }, { text: entrada }], false, 16384, 1024);
      return resposta.trim();
    } catch (e) {
      console.error('Gemini falhou em analisarGerencialRdo, usando Groq como reserva:', e);
    }
  }
  if (env.GROQ_API_KEY) {
    try {
      const resposta = await chamarLlamaGroq(env, PROMPT_ANALISE_GERENCIAL, entrada, false, 4096);
      return resposta.trim();
    } catch (e) {
      console.error('Groq falhou em analisarGerencialRdo, usando Gemini como reserva:', e);
    }
  }
  throw new Error('IA indisponível para a análise gerencial.');
}

/**
 * Reescreve um texto como redação técnica de RDO (sem inventar fatos).
 * Groq como principal; Gemini como reserva automática.
 */
export async function melhorarTextoRdo(env: Env, texto: string): Promise<string> {
  if (env.GROQ_API_KEY) {
    try {
      const resposta = await chamarLlamaGroq(
        env,
        PROMPT_MELHORAR,
        `Texto original: ${texto}`,
        false
      );
      return resposta.trim();
    } catch (e) {
      console.error('Groq falhou em melhorarTextoRdo, usando Gemini como reserva:', e);
    }
  }
  return melhorarTextoRdoGemini(env, texto);
}
