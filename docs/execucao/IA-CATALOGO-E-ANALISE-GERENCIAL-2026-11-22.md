# IA do Worker com catálogo comercial + análise gerencial (2026-11-22)

## O que mudou
- `functions/_lib/catalogoPlanos.ts` (novo): lê `config_comercial/launch_promo` e `config_comercial_planos/{id}` (cache de 15 s). Falha de leitura = padrões do código e promoção DESLIGADA (nunca libera mais).
- `functions/_lib/uso.ts`: limites de IA passam a vir do plano atribuído (`planos/{uid}.planoId`, ausente = `pro`) e do catálogo. `-1` = sem limite. Plano arquivado/desconhecido segue as regras do Pro. Free só herda limites do Pro com a promoção ativa. A lógica de `validade` não foi alterada.
- `functions/api/ia.ts` + `groq.ts`: novo `tipo: "analise_gerencial"` (body `{ resumo }`, até 30.000 caracteres). Exige o recurso `relatoriosGerenciais` do plano (403 caso contrário), consome 1 unidade da franquia de melhorias, usa Groq com Gemini de reserva. O prompt (engenheiro civil sênior) só permite fatos presentes nos dados.
- Resolve BRB-022 (limites de IA do Worker fixos no código).

## Verificação
`npm run test:ia-catalogo` (11 testes com Firestore/OAuth/Groq simulados), `npm run typecheck`, `npm run build` e `test:authoritative-flows` passaram. NÃO testado contra Firestore real nem em produção.

## Efeito a conhecer
Com a promoção de lançamento ativa, usuários Free passam a ter as franquias de IA do Pro no Worker.

## 2026-11-23 — A IA passa a ler o texto dos RDOs
Prompt reescrito: parecer técnico de engenheiro sênior a partir de "documentos" (texto dos RDOs) + indicadores; fatos só dos RDOs, interpretação marcada como "avaliação técnica"/"hipótese". Limite do resumo 30 mil → 70 mil caracteres; saída até 4096 tokens. Falta validar em produção.

## 2026-11-23 (2) — Parecer de engenheiro sênior mais profundo
Prompt reescrito para DIAGNOSTICAR (cronologia, causa raiz, segurança/NR, inconsistências do diário, comparativo, plano de ação com prazo e responsável, perguntas para a obra). Gemini 2.5 Flash passa a ser o principal da análise gerencial (8192 tokens); Groq/Llama fica de reserva (4096). Falta avaliar a qualidade em produção.

## 2026-11-23 (3) — Parecer cortado
Causa: Gemini 2.5 gasta o limite de saída "pensando". Correção: thinkingBudget 1024, saída 16384, e resposta com finishReason MAX_TOKENS cai no Groq em vez de ser mostrada cortada.
