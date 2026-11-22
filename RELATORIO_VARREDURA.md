# Relatório de varredura — ObraMatch Diário (App)
Data: 2026-11-22 · Escopo: repositório inteiro (src, worker, functions, regras Firestore, configs) · Modo: somente leitura

## Resumo
Estado geral bom: typecheck, build e testes de fluxo passam; não há `innerHTML`, `catch` vazio, chave secreta ou `service_role` no código. Os 3 maiores riscos: (1) datas de RDO e obra saem erradas à noite por causa do fuso horário; (2) vulnerabilidades "altas" no `npm audit` (cadeia do Firebase), de impacto prático baixo mas que merecem acompanhamento; (3) não há lint nem testes de tela, então erros de layout como os de hoje só aparecem em produção.

## 🔴 Crítico
Nenhum achado confirmado.

## 🟠 Alto
| # | Categoria | Arquivo:linha | Problema | Impacto | Correção sugerida | Esforço |
|---|---|---|---|---|---|---|
| 1 | Bug / datas | src/components/DiarioForm.tsx:124 e :169; ObraDashboard.tsx:105-108; NovaObraModal.tsx:33; ExportarRdos.tsx:9 | `new Date().toISOString().split('T')[0]` usa data em UTC. No Recife (UTC-3), depois das 21h o app grava o dia **seguinte**. | RDO feito à noite fica com data errada; "RDO de hoje/ontem" no painel erra; exportação por período pode cortar dias. | Criar um helper `hojeLocal()` (ano/mês/dia do horário local ou fuso America/Recife) e usar nos 5 pontos. | P |

## 🟡 Médio
| # | Categoria | Arquivo:linha | Problema | Impacto | Correção sugerida | Esforço |
|---|---|---|---|---|---|---|
| 2 | Dependências | package.json (firebase ^12) | `npm audit`: 4 vulnerabilidades altas via `@grpc/grpc-js` (dependência do Firestore). | Pelo uso no navegador o risco prático é baixo (o pacote é de servidor). O `audit fix --force` **rebaixaria o Firebase para v9** e quebraria o app: não aplicar. | Atualizar o Firebase quando sair versão que corrija; reavaliar a cada mês. | P |
| 3 | Qualidade | package.json | Não há script de lint, nem teste de layout/tela. | Quebras visuais só são vistas pelo usuário em produção. | Adicionar ESLint e um teste de fumaça (ex.: Playwright com viewport de celular). | M |
| 4 | Manutenção | src/components/DiarioForm.tsx (903 linhas), AppContext.tsx (688), ObraDashboard.tsx (652) | Arquivos muito grandes, misturam tela, regra de negócio e envio. | Cada ajuste tem mais chance de quebrar outra coisa. | Separar em partes (gravação/IA, fotos, envio) aos poucos. | G |

## 🔵 Baixo / Melhorias
| # | Categoria | Arquivo:linha | Problema | Correção | Esforço |
|---|---|---|---|---|---|
| 5 | Segurança | functions/api/telegram.ts:277 | Segredo do webhook comparado com `!==` (não é comparação de tempo constante). Risco teórico. | Usar comparação segura. | P |
| 6 | Segurança | wrangler.jsonc:14 | Chave web do Firebase no repositório. É pública por desenho, mas precisa de restrição. | Conferir no Google Cloud se a chave está restrita por domínio/app. | P |
| 7 | Segurança | functions/api/perfil-publico.ts:17 | CORS `*` e consulta por `uid` sem login. Só devolve totais, mas permite saber se um uid tem obras. | Aceitável; se quiser, limitar origem ao site ObraMatch. | P |
| 8 | Regras Firestore | firestore.rules (obras/diarios/fotos) | Regras só checam o dono; não validam campos nem tamanho. O dono pode gravar qualquer conteúdo nas próprias obras. | Se houver limites de plano por obra, garantir que o servidor também os valida. Suspeita: não confirmei a imposição no servidor. | M |
| 9 | Documentação | .env.example | Cita Supabase (`VITE_SUPABASE_*`), que o App não usa mais. | Atualizar para Firebase/Cloudflare. | P |
| 10 | SEO / PWA | index.html | Sem `meta description`. Em app instalado quase não importa. | Adicionar uma linha. | P |

## Vitórias rápidas
1. Corrigir o fuso nas datas (achado 1): maior impacto real para quem trabalha à noite.
2. Atualizar `.env.example` (9).
3. Conferir restrição da chave Firebase no Google Cloud (6).
4. Comparação segura do segredo do Telegram (5).
5. `meta description` (10).

## Roadmap
- **Curto:** achados 1, 5, 6, 9, 10. Revogar os tokens do GitHub colados em conversa.
- **Médio:** ESLint + teste de fumaça em celular (3); validação de plano no servidor (8).
- **Longo:** quebrar os arquivos grandes (4); atualizar Firebase quando houver correção (2).

## O que não foi possível verificar
- Código da plataforma Web (Vercel/Landing): fora do acesso desta sessão. As regras de autorização da Central foram assumidas como no resumo anterior.
- Push no Android (TWA), aceitar/devolver/reenviar com contas reais: dependem de teste manual.
- Regras do Firestore em produção (só li o arquivo do repositório).
- Desempenho real e bundle: build passou, mas não medi.
