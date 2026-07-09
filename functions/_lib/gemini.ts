// Chamadas à API do Gemini (nível gratuito) a partir das funções serverless.
// A chave fica em env.GEMINI_API_KEY — nunca chega ao navegador.

import { Env } from './google';

const MODELO = 'gemini-2.5-flash';

export interface RdoEstruturado {
  atividades: string;
  equipe: string;
  materiais: string;
  ocorrencias: string;
  observacoes: string;
}

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

interface ParteGemini {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

export async function chamarGemini(
  env: Env,
  partes: ParteGemini[],
  jsonMode: boolean
): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: partes }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const texto = json?.candidates?.[0]?.content?.parts
    ?.map((p: any) => p.text || '')
    .join('') || '';
  if (!texto) throw new Error('Gemini retornou resposta vazia');
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

/** Estrutura um relato (texto e/ou áudio base64) em campos de RDO. */
export async function estruturarRdo(
  env: Env,
  opts: { texto?: string; audioBase64?: string; mimeType?: string }
): Promise<RdoEstruturado> {
  const partes: ParteGemini[] = [{ text: PROMPT_ESTRUTURAR }];
  if (opts.audioBase64) {
    partes.push({
      inline_data: { mime_type: opts.mimeType || 'audio/ogg', data: opts.audioBase64 },
    });
  }
  if (opts.texto) partes.push({ text: `Relato: ${opts.texto}` });
  const resposta = await chamarGemini(env, partes, true);
  return parsearJsonRdo(resposta);
}

/** Reescreve um texto como redação técnica de RDO (sem inventar fatos). */
export async function melhorarTextoRdo(env: Env, texto: string): Promise<string> {
  const resposta = await chamarGemini(
    env,
    [{ text: PROMPT_MELHORAR }, { text: `Texto original: ${texto}` }],
    false
  );
  return resposta.trim();
}
