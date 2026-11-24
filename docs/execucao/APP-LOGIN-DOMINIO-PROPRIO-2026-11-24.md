# Login com Google em domínio próprio (2026-11-24)

Problema: a tela do Google mostrava "Prosseguir para gen-lang-client-0809833199.firebaseapp.com".

Solução: o Worker repassa `/__/auth/*` e `/__/firebase/*` ao Firebase e o app usa o próprio host como `authDomain` (somente em `diariomatch.obramatch.workers.dev`; em outros hosts mantém o padrão).

## Antes de publicar (console)
1. Google Cloud (projeto gen-lang-client-0809833199) → Google Auth Platform → Clientes → cliente Web (auto-criado pelo Firebase): adicionar em "URIs de redirecionamento autorizados" `https://diariomatch.obramatch.workers.dev/__/auth/handler`.
2. Firebase → Authentication → Configurações → Domínios autorizados: adicionar `diariomatch.obramatch.workers.dev`.

Sem esses dois passos o login falha com redirect_uri_mismatch. Reverter = remover o host de `HOSTS_LOGIN_PROPRIO` em `src/firebase.ts`.
