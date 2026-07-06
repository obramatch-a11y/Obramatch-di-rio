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

const PROMPT_ESTRUTURAR = `Você é um engenheiro civil brasileiro especialista em Relatórios Diários de Obra (RDO).
Você receberá um relato de canteiro de obra em português (áudio ou texto), geralmente informal.

Sua tarefa: estruturar o relato em campos de RDO com redação técnica.

REGRA ZERO DE FACTUALIDADE (ABSOLUTA): use SOMENTE informações presentes no relato. NUNCA invente quantidades, nomes, materiais, horários ou eventos. Se uma informação não foi dita, deixe o campo como string vazia "".

Regras de redação:
- Terminologia da construção civil brasileira, terceira pessoa, frases objetivas.
- "atividades": serviços executados no dia.
- "equipe": efetivo presente (funções e quantidades, se ditas).
- "materiais": materiais/equipamentos recebidos, entregues ou utilizados.
- "ocorrencias": imprevistos, paralisações, acidentes, problemas climáticos.
- "observacoes": demais informações relevantes.

Responda SOMENTE com JSON válido, sem markdown, sem crases, exatamente neste formato:
{"atividades":"...","equipe":"...","materiais":"...","ocorrencias":"...","observacoes":"..."}`;

const PROMPT_MELHORAR = `Você é um engenheiro civil brasileiro especialista em Relatórios Diários de Obra (RDO).
Reescreva o texto a seguir como redação técnica de RDO: terminologia da construção civil brasileira, terceira pessoa, frases objetivas e profissionais.

REGRA ZERO DE FACTUALIDADE (ABSOLUTA): mantenha TODOS os fatos do original e NÃO acrescente NENHUMA informação nova (quantidades, nomes, eventos). Apenas melhore a redação.

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
