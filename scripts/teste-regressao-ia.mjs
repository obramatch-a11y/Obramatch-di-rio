#!/usr/bin/env node
// Teste de regressão da IA do RDO — executa o fluxo real (prompt → Groq → JSON → parser)
// e valida os 18 critérios de aceite. NÃO toca em produção: chama a API do Groq diretamente.
//
// Uso:
//   GROQ_API_KEY=sua_chave node scripts/teste-regressao-ia.mjs
//   GROQ_API_KEY=sua_chave node scripts/teste-regressao-ia.mjs --modelos llama-3.1-8b-instant,llama-3.3-70b-versatile
//
// O prompt testado é SEMPRE o que está no checkout atual de functions/_lib/groq.ts.
// Para comparar com o prompt antigo: git checkout main && rode de novo.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const chave = process.env.GROQ_API_KEY;
if (!chave) {
  console.error('ERRO: defina GROQ_API_KEY no ambiente.');
  process.exit(1);
}

const argModelos = process.argv.find((a) => a.startsWith('--modelos'));
const MODELOS = argModelos
  ? argModelos.split('=')[1].split(',')
  : ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'];

// ---- Prompt ativo no checkout (mesma fonte usada pelo worker) ----
const groqTs = readFileSync(join(raiz, 'functions/_lib/groq.ts'), 'utf8');
const m = groqTs.match(/PROMPT_ESTRUTURAR = `([\s\S]*?)`;/);
if (!m) {
  console.error('ERRO: não encontrei PROMPT_ESTRUTURAR em functions/_lib/groq.ts');
  process.exit(1);
}
const PROMPT = m[1];

// ---- Relato-padrão do teste (idêntico ao documento de validação) ----
const RELATO = `Bom, hoje, dia 13 de julho de 2026, na obra do Residencial Jardim das Palmeiras, a equipe começou os trabalhos por volta das sete horas da manhã. Antes de começar, o mestre realizou um diálogo rápido de segurança e conferiu os equipamentos de proteção do pessoal.

Hoje estavam na obra um engenheiro, no caso eu, um mestre de obras, quatro pedreiros, cinco serventes, dois carpinteiros, dois armadores e um eletricista. Acho que deu dezesseis pessoas no total.

Na parte da manhã, dois pedreiros e três serventes continuaram a alvenaria de vedação do primeiro pavimento. Foram executados mais ou menos quarenta e dois metros quadrados de parede com bloco cerâmico. Os carpinteiros trabalharam nas formas das vigas V12 e V13, e os armadores continuaram a montagem da ferragem da laje do setor B.

O eletricista fez a passagem dos eletrodutos nas paredes que já estavam levantadas, principalmente nos quartos e no corredor. Foram usados blocos cerâmicos, cimento, areia, aço, madeira para forma e eletrodutos de vinte e vinte e cinco milímetros.

O tempo começou parcialmente nublado, mas por volta das dez e quarenta começou uma chuva forte. A equipe teve que parar os serviços externos e a movimentação de material. A chuva diminuiu perto das onze e vinte e cinco. Depois disso, os serviços internos continuaram normalmente. À tarde o tempo ficou aberto e a condição de trabalho voltou a ficar boa.

Também tivemos um problema com a betoneira, que ficou parada por uns trinta e cinco minutos porque a correia afrouxou. O próprio operador fez o ajuste e ela voltou a funcionar. Não sei se isso entra como ocorrência, mas acabou atrasando um pouco a preparação da argamassa.

Recebemos cinquenta sacos de cimento e três metros cúbicos de areia. Na conferência, foram encontrados dezoito blocos cerâmicos quebrados em um dos paletes, e o fornecedor ficou de substituir na próxima entrega.

Os trabalhos foram encerrados por volta das dezessete horas. Não houve acidente nem incidente com trabalhadores. Para amanhã, a previsão é concluir as formas das vigas, continuar a armação da laje e avançar com a alvenaria do primeiro pavimento.`;

// ---- Parser idêntico ao do worker (parsearJsonRdo) ----
function parsearJsonRdo(texto) {
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

// ---- Os 18 critérios de aceite ----
// avaliar(rdo) -> 'PASSOU' | 'FALHOU' | 'REVISAR' (revisão humana)
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const CRITERIOS = [
  ['1. Sem "concretagem"/"lançamento de concreto"', (r, t) => (!/concret|lancamento de concreto|lancou concreto/.test(t) ? 'PASSOU' : 'FALHOU')],
  ['2. Montagem da ferragem/armadura da laje do setor B', (r, t) => (/(montagem|armacao|armadura|ferragem)[\s\S]{0,60}laje/.test(t) && /setor b/.test(t) ? 'PASSOU' : 'FALHOU')],
  ['3. Formas das vigas V12 e V13', (r, t) => (/v12/.test(t) && /v13/.test(t) && /(forma|f[o]rma)/.test(t) ? 'PASSOU' : 'FALHOU')],
  ['4. ~42 m² com aproximação preservada', (r, t) => (/42|quarenta e dois/.test(t) ? (/mais ou menos|aproximad|cerca de|por volta/.test(norm(r.atividades)) ? 'PASSOU' : 'FALHOU') : 'FALHOU')],
  ['5. Equipe com funções e quantidades relatadas', (r, t) => (/pedreiro/.test(t) && /servente/.test(t) && /carpinteiro/.test(t) && /armador/.test(t) && /eletricista/.test(t) ? 'REVISAR' : 'FALHOU')],
  ['6. Total de pessoas não corrigido/inventado', (r, t) => (/quinze|17 pessoas|dezessete/.test(t) ? 'FALHOU' : 'REVISAR')],
  ['7. 50 sacos de cimento recebidos', (r, t) => (/(50|cinquenta) sacos/.test(t) ? 'PASSOU' : 'FALHOU')],
  ['8. 3 m³ de areia recebidos', (r, t) => (/(3|tres)\s?(m3|m³|metros cubicos)/.test(t) ? 'PASSOU' : 'FALHOU')],
  ['9. Exatamente 18 blocos quebrados', (r, t) => (/(18|dezoito)[\s\S]{0,40}(bloco|quebrad)|bloco[\s\S]{0,40}(18|dezoito)/.test(t) ? 'PASSOU' : 'FALHOU')],
  ['10. Substituição AINDA será feita (próxima entrega)', (r, t) => (/proxima entrega|ficou de substituir|sera substitu|a substituir/.test(t) && !/foram substituid|apos a substituicao|ja substituid/.test(t) ? 'PASSOU' : 'FALHOU')],
  ['11. Nenhum total de blocos inventado (ex.: 19)', (r, t) => (!/dezenove|19 bloco/.test(t) ? 'PASSOU' : 'FALHOU')],
  ['12. Chuva com ~10h40 e ~11h25', (r, t) => (/(10h40|10:40|dez e quarenta)/.test(t) && /(11h25|11:25|onze e vinte e cinco)/.test(t) ? 'PASSOU' : 'FALHOU')],
  ['13. Paralisação de serviços externos como ocorrência', (r) => (/(paralis|parad|interromp|suspens)/.test(norm(r.ocorrencias)) && /(extern|movimentacao)/.test(norm(r.ocorrencias)) ? 'PASSOU' : 'FALHOU')],
  ['14. Betoneira parada ~35 minutos como ocorrência', (r) => (/betoneira/.test(norm(r.ocorrencias)) && /(35|trinta e cinco)/.test(norm(r.ocorrencias)) ? 'PASSOU' : 'FALHOU')],
  ['15. DDS e conferência de EPIs', (r, t) => (/(dds|dialogo de seguranca|dialogo diario)/.test(t) && /epi/.test(t) ? 'PASSOU' : 'FALHOU')],
  ['16. Ausência de acidente e incidente registrada', (r, t) => (/(nao houve|sem|ausencia de)[\s\S]{0,30}acidente/.test(t) && /incidente/.test(t) ? 'PASSOU' : 'FALHOU')],
  ['17. Programação do dia seguinte fiel (3 itens)', (r) => { const o = norm(r.observacoes); return /(forma)[\s\S]{0,40}viga/.test(o) && /(armacao|armadura|ferragem)[\s\S]{0,40}laje/.test(o) && /alvenaria/.test(o) ? 'PASSOU' : 'FALHOU'; }],
  ['18. Nenhum fato inventado (leitura humana)', () => 'REVISAR'],
];

async function chamarGroq(modelo) {
  const inicio = Date.now();
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelo,
      temperature: 0.2,
      max_tokens: 2048,
      messages: [
        { role: 'system', content: PROMPT },
        { role: 'user', content: `Relato: ${RELATO}` },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  const ms = Date.now() - inicio;
  if (!res.ok) throw new Error(`Groq ${modelo} ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return { bruto: json?.choices?.[0]?.message?.content || '', uso: json?.usage, ms };
}

console.log('Prompt ativo: ' + (PROMPT.includes('ETAPAS CONSTRUTIVAS') ? 'NOVO (branch fix/ia-fidelidade-relato)' : 'ANTIGO (main)'));
console.log('Relato: teste-padrão Residencial Jardim das Palmeiras\n');

for (const modelo of MODELOS) {
  console.log('══════════════════════════════════════════');
  console.log(`MODELO: ${modelo}`);
  try {
    const { bruto, uso, ms } = await chamarGroq(modelo);
    console.log(`Latência: ${ms} ms · Tokens: ${uso?.prompt_tokens} entrada + ${uso?.completion_tokens} saída`);
    console.log('\n--- JSON BRUTO DO MODELO ---');
    console.log(bruto);
    let rdo;
    try {
      rdo = parsearJsonRdo(bruto);
    } catch (e) {
      console.log(`\nFALHOU: parsearJsonRdo não conseguiu ler o JSON (${e.message})`);
      continue;
    }
    console.log('\n--- APÓS parsearJsonRdo (o que o app recebe) ---');
    console.log(JSON.stringify(rdo, null, 2));
    const tudo = norm(Object.values(rdo).join(' \n '));
    console.log('\n--- CRITÉRIOS DE ACEITE ---');
    let falhas = 0;
    for (const [nome, avaliar] of CRITERIOS) {
      const resultado = avaliar(rdo, tudo);
      if (resultado === 'FALHOU') falhas++;
      console.log(`${resultado.padEnd(8)} ${nome}`);
    }
    console.log(`\nRESULTADO ${modelo}: ${falhas === 0 ? 'APROVADO nos critérios automáticos' : falhas + ' critério(s) FALHARAM'} (itens REVISAR exigem leitura humana)`);
  } catch (e) {
    console.log(`ERRO ao chamar o modelo: ${e.message}`);
  }
}
console.log('\nLembrete: nada foi publicado. Este teste chama a API do Groq diretamente, sem tocar no worker de produção.');
