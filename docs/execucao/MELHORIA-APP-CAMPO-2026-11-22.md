# Melhoria do App (Campo/TWA) — 22/11/2026

Branch: `melhoria/app-ux-dialogos-login-20261122`. **Não publicada.** Autorização do responsável: pedido direto do André em 22/11/2026, com a condição de avisar o que fazer antes de ir para produção.

## O que mudou (somente interface)
- Caixas de confirmação próprias, acessíveis (foco, Esc, leitor de tela), no lugar de `window.confirm`/`alert` nos pontos: voltar ao plano Free, excluir diário, excluir foto, avisos de erro do `AppContext`. A exclusão definitiva de obra continua bloqueada, como antes.
- Login: fechar a janela do Google não mostra mais erro; mensagens mais claras (sem internet, janela bloqueada, muitas tentativas); botão de mostrar/ocultar senha.

## Não alterado (protegido por AGENTS.md)
Package name, manifesto/escopo TWA, `assetlinks.json`, assinatura, domínio, Firebase e regras, Cloudflare/Worker, Supabase, secrets, fluxos de RDO/áudio/IA/foto/PDF.

## Testes
`npm run typecheck`, `npm run test:authoritative-flows` e `npm run build` aprovados. Teste visual no Chrome (390x844) da tela de login: o botão alterna o tipo do campo; sem erros de página. **Não testado:** dentro da TWA instalada, em aparelho físico, com leitor de tela, nem os diálogos de excluir diário/foto/plano Free (exigem conta logada).

## Para publicar
O app da Play Store carrega o site hospedado na Cloudflare (Worker `diariomatch`); não é preciso novo AAB. A publicação é o deploy do Worker (hoje manual com `npx wrangler deploy`, ou automática se houver integração Git). Backup/rollback: voltar a versão anterior do Worker no painel da Cloudflare.
