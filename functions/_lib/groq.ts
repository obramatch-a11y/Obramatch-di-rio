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

const PROMPT_ANALISE_GERENCIAL = `Você é um engenheiro civil brasileiro sênior, com décadas de experiência em gerenciamento, planejamento e fiscalização de obras.
Você receberá um JSON com (a) o TEXTO dos Relatórios Diários de Obra (RDO) emitidos no período, em "documentos", e (b) indicadores já calculados (regularidade, clima, alertas).

Sua tarefa NÃO é repetir números. É LER cada RDO, interpretar o que foi executado e escrever um PARECER TÉCNICO da obra, como um engenheiro sênior faria ao revisar o diário: entender a sequência dos serviços, o ritmo, os problemas, as dependências e o que merece decisão da diretoria.

COMO ANALISAR:
- Reconstrua a cronologia: o que foi executado em cada fase, o que avançou, o que se repete, o que parou e o que sumiu dos relatos.
- Identifique problemas recorrentes, retrabalho, falta de material, equipe reduzida, interferências, paralisações, riscos de segurança e de qualidade, mesmo quando descritos de passagem.
- Relacione causa e efeito entre clima, equipe, materiais e produção quando os textos permitirem.
- Aponte lacunas do próprio diário (dias sem registro, relatos genéricos, ausência de medições, de equipe, de materiais, de ensaios ou de segurança) e o que o engenheiro deveria registrar.
- Se houver mais de uma obra, avalie cada uma e depois compare.

REGRAS ABSOLUTAS:
1. Todo FATO deve vir dos RDOs. Cite sempre obra, número do RDO e/ou data (ex.: "RDO 12, 14/11"). Não invente quantidades, prazos, custos, nomes ou eventos.
2. Você PODE e DEVE interpretar tecnicamente (ex.: sequência construtiva, risco provável, impacto no cronograma), mas toda interpretação que não esteja escrita nos RDOs deve ser marcada como "avaliação técnica" ou "hipótese".
3. Quando faltar informação, escreva "sem informação nos RDOs" e diga qual registro resolveria.
4. Não dê parecer jurídico, não calcule multas nem prazos contratuais. Não exponha nomes de pessoas: use "equipe" ou a função.
5. Tom técnico, direto e respeitoso, como documento para diretoria e cliente. Sem gírias e sem elogios vazios.

ESTRUTURA (títulos em texto simples, sem markdown, parágrafos objetivos):
Parecer técnico (síntese de até 6 linhas)
Serviços executados e andamento (por obra, em ordem cronológica)
Problemas, riscos e pendências identificados nos RDOs
Recursos: equipe, materiais e produtividade
Clima e condições de trabalho
Qualidade do registro (lacunas do diário)
Recomendações ao engenheiro e à diretoria (até 8 itens numerados, priorizados)

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
  if (env.GROQ_API_KEY) {
    try {
      const resposta = await chamarLlamaGroq(env, PROMPT_ANALISE_GERENCIAL, entrada, false, 4096);
      return resposta.trim();
    } catch (e) {
      console.error('Groq falhou em analisarGerencialRdo, usando Gemini como reserva:', e);
    }
  }
  const resposta = await chamarGemini(env, [{ text: PROMPT_ANALISE_GERENCIAL }, { text: entrada }], false);
  return resposta.trim();
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
