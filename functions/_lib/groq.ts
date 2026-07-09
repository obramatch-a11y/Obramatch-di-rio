// Chamadas à API do Groq a partir das funções serverless.
// A chave fica em env.GROQ_API_KEY — nunca chega ao navegador.
//
// Estratégia:
//   - Áudio  → whisper-large-v3-turbo (transcrição rápida em pt-BR)
//   - Texto  → llama-3.1-8b-instant   (maior limite gratuito de requisições)
//   - Se o Groq falhar por qualquer motivo (limite, indisponibilidade, chave
//     ausente), cai automaticamente no Gemini (functions/_lib/gemini.ts),
//     que continua configurado como reserva. Nenhum fluxo quebra.

import { Env } from './google';
import {
  RdoEstruturado,
  estruturarRdo as estruturarRdoGemini,
  melhorarTextoRdo as melhorarTextoRdoGemini,
} from './gemini';

export type { RdoEstruturado } from './gemini';

const MODELO_AUDIO = 'whisper-large-v3-turbo';
const MODELO_TEXTO = 'llama-3.1-8b-instant';

const PROMPT_ESTRUTURAR = `Você é um engenheiro civil brasileiro, residente de obra, especialista na redação de Relatórios Diários de Obra (RDO).
Você receberá um relato de canteiro de obra em português, geralmente informal (fala de mestre de obras ou encarregado).

Sua tarefa: estruturar o relato em campos de RDO com redação técnica de engenharia.

REGRA ZERO DE FACTUALIDADE (ABSOLUTA): use SOMENTE informações presentes no relato. NUNCA invente quantidades, nomes, materiais, traços, horários, locais ou eventos. Se uma informação não foi dita, deixe o campo como string vazia "".

Regras de redação técnica (obrigatórias):
- Voz impessoal e terceira pessoa: "Foi executada...", "Procedeu-se à...", "Deu-se continuidade a...".
- Vocabulário técnico da construção civil brasileira: converta termos informais para o termo técnico EQUIVALENTE sem alterar o fato (ex.: "levantar parede" -> "execução de alvenaria de vedação"; "rebocar" -> "aplicação de revestimento argamassado"; "bater laje" -> "concretagem de laje"; "ferragem" -> "armadura"; "valeta" -> "vala"; "caixaria" -> "fôrma").
- Se o termo informal for ambíguo e não houver equivalente técnico seguro, mantenha o termo original entre aspas em vez de arriscar.
- Frases objetivas, sem gírias, sem diminutivos, sem opinião.
- Indique frentes de serviço e pavimentos/locais quando citados no relato.
- "atividades": serviços executados no dia, redigidos como itens técnicos.
- "equipe": efetivo presente (funções e quantidades, se ditas; use nomenclatura de função: pedreiro, servente, armador, carpinteiro, mestre de obras, encarregado).
- "materiais": materiais/equipamentos recebidos, entregues ou utilizados.
- "ocorrencias": imprevistos, paralisações, retrabalhos, acidentes, condições climáticas adversas e seus impactos no serviço.
- "observacoes": demais informações relevantes ao registro da obra.

Responda SOMENTE com JSON válido, sem markdown, sem crases, exatamente neste formato:
{"atividades":"...","equipe":"...","materiais":"...","ocorrencias":"...","observacoes":"..."}`;

const PROMPT_MELHORAR = `Você é um engenheiro civil brasileiro, residente de obra, especialista na redação de Relatórios Diários de Obra (RDO).
Reescreva o texto a seguir como redação técnica de RDO, no padrão de registro de engenharia.

REGRA ZERO DE FACTUALIDADE (ABSOLUTA): mantenha TODOS os fatos do original e NÃO acrescente NENHUMA informação nova (quantidades, nomes, traços, locais, eventos). Apenas eleve o nível técnico da redação.

Regras de redação técnica (obrigatórias):
- Voz impessoal e terceira pessoa: "Foi executada...", "Procedeu-se à...", "Deu-se continuidade a...".
- Converta termos informais para o termo técnico EQUIVALENTE sem alterar o fato (ex.: "levantar parede" -> "execução de alvenaria de vedação"; "rebocar" -> "aplicação de revestimento argamassado"; "bater laje" -> "concretagem de laje"; "ferragem" -> "armadura"; "caixaria" -> "fôrma").
- Se o termo informal for ambíguo e não houver equivalente técnico seguro, mantenha o termo original entre aspas.
- Frases objetivas e profissionais, sem gírias, sem diminutivos, sem opinião.

Responda SOMENTE com o texto reescrito, sem comentários.`;

/** Transcreve áudio (base64) em pt-BR usando o Whisper do Groq. */
async function transcreverAudioGroq(
  env: Env,
  audioBase64: string,
  mimeType: string
): Promise<string> {
  const binario = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
  const form = new FormData();
  form.append('file', new Blob([binario], { type: mimeType }), 'audio.ogg');
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
  jsonMode: boolean
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
      max_tokens: 2048,
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
