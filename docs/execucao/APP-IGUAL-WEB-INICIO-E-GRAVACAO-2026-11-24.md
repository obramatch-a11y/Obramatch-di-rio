# App (Play Store) igual à web: início e gravação — 2026-11-24

Branch: `feat/app-igual-web`. **Não publicada.** Pedido do André em 24/11/2026: deixar o app igual à web, conforme o designer.

## O que mudou (somente interface)
- `campo-web.css` do app = o da web (botão de gravar circular laranja, cabeçalho azul, cartões claros, grade de fotos).
- Início: cabeçalho "OBRAMATCH CAMPO / Olá, Nome! / Pronto para registrar o dia da obra?" com foto da conta ou mascote; botão "Escrever RDO" (antes "Prefiro escrever"); removidos os textos de passos 1-2-3.
- Gravador: tempo na tela, **pausar e retomar**, "Concluir gravação", "Descartar áudio" e mensagens de estado, como na web. O fluxo (áudio → IA → relatório pré-preenchido) não mudou.
- Fotos anexadas: grade com miniatura, nome e botão Remover, como na web.

## Não alterado
Package name, manifesto/escopo TWA, assetlinks, assinatura, Firebase, regras, Worker, Supabase, lógica de RDO/IA/foto/PDF.

## Ainda diferente da web (próxima etapa)
Tela de revisão/edição do RDO (`DiarioForm`), Meus relatórios, RDO/PDF e assinatura: o app usa outro layout; portar exige mexer no fluxo de dados e deve ser feito com teste em aparelho.

## Testes
`tsc`, `npm run build`, `test:authoritative-flows` aprovados. Renderização do início e do gravador (repouso e gravando) em Chrome headless 390 px. **Não testado:** pausa/retomada com microfone real e dentro da TWA instalada.

## Para publicar
O app da Play Store carrega o site da Cloudflare (Worker `diariomatch`); não precisa de novo AAB. Publicar = deploy do Worker. Rollback: reverter o commit e refazer o deploy.
