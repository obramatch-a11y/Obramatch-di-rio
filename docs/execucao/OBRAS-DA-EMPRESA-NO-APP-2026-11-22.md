# Obras da empresa (Central) no App — 2026-11-22

Problema: obra atribuída ao executante pela Central (Web) não aparecia no App.

Causa: o App só lia as obras próprias do Firestore e nunca consultava a Central (conta e banco são os mesmos).

Correção (aditiva):
- Worker: `proxyCentral` em `functions/_lib/authoritativeProxy.ts`, rota `/api/obras/dispatcher`, com lista fechada de ações
  (`list_assigned_works`, `submit_field_rdo`, `resubmit_field_rdo`), exigindo `Authorization: Bearer`, corpo até 4 MB. Demais ações: 404.
- App: `src/lib/central.ts` (lista e envio); `Dashboard` mistura "Minhas obras" e "Obras da empresa"; `DiarioForm` envia à Central
  quando `selectedObra.empresa` existe (id de envio estável, máx. 10 fotos, mesma regra da Web). Obra avulsa segue igual.
- Teste manual da ponte com upstream simulado: ação permitida passa; outras 404; sem token 401.

Fora do escopo desta etapa: aviso de RDO devolvido, reenvio após devolução e papel de revisor no App.
Reversão: reativar a versão anterior no Cloudflare (Implantações).

## Correções do mesmo dia (2ª rodada)
- "Gravar RDO" não abria em obra de empresa: o `AppContext` devolvia ao início qualquer obra fora da coleção `obras` do usuário. Obras com `empresa` agora são preservadas.
- Botões "Tirar foto" e "Escolher foto" na tela inicial (foto segue para o RDO aberto; `src/lib/fotoPendente.ts`).
- Relatórios da obra de empresa (`RelatoriosEmpresa`): lista e detalhe lidos da Central (`list_rdos`, `get_rdo`, `get_rdo_photo`); a autorização é do servidor.
- Ponte da Central: leituras de RDO liberadas com parâmetros em lista fechada.
- Tela branca ao abrir: se `#root` seguir vazio após 6 s, recarrega uma única vez.
- Pendente: corrigir e reenviar RDO devolvido, aviso de devolvido, papel de revisor no App.

## 3ª rodada: avisos, correção e revisão
- Avisos na tela inicial (`AvisosEmpresa`): RDO devolvido para o autor; RDO aguardando revisão para quem tem `canReview`. Atualiza ao abrir, ao voltar ao app e a cada 60 s.
- Corrigir e reenviar (`resubmit_field_rdo`): edita os textos; fotos e assinatura da versão anterior são mantidas pelo servidor.
- Revisão no App: Aceitar (`accept_document`) e Devolver com motivo de 10+ letras (`request_correction`). A regra "revisor independente" e as permissões continuam sendo do servidor.
- Aviso no celular: `public/firebase-messaging-sw.js` + `src/lib/push.ts` (mesma chave VAPID e mesmo registro da Web, via ponte). O toque no aviso abre a tela inicial. Depende de o Chrome/TWA permitir notificações para o app instalado.
- Ponte: POST liberado também para `request_correction`, `accept_document`, `register_push_token`, `unregister_push_token`; GET com `alertStatus`. Demais ações: 404 (testado com Central simulada).
- Não verificado com conta real nesta data: envio/recebimento do push, aceite/devolução e reenvio de ponta a ponta.

## 4ª rodada: correção de RDO devolvido, qualquer origem
- RDO do Campo: edição e `resubmit_field_rdo` (já existia).
- RDO enviado do Diário pessoal: o App localiza o original nas obras da própria conta pelo `hashIntegridadeOrigem` do snapshot (`src/lib/origemDiario.ts`), grava a correção com novo hash e chama `resubmit_rdo`. O servidor continua validando dono e hash.
- Ponte: `resubmit_rdo` liberado no POST (teste com Central simulada: aceito; `submit_rdo` segue bloqueado).
- Limite: se o original não estiver na conta logada (apagado ou de outra conta), o App avisa e pede para corrigir onde foi criado.

## Rodada 5 — responsivo e layout (branch fix/layout-responsivo-20261122)
- Causa raiz do corte de menu/modais: o campo de arquivo mostrava o texto nativo e alargava a página. Agora o input fica invisível sobre o botão e a página não rola na horizontal.
- Atalhos de foto (Tirar foto / Escolher foto / Relatórios) em grade responsiva.
- Formulários (Novo RDO, Nova obra): visual do Campo (bordas suaves, cantos arredondados, campos maiores, fonte 16px). Cabeçalho "Voltar / Novo RDO" para obras da empresa.
- Relatório da empresa: status em português (inclui "Aceito"), data com fallback, chips, seções com destaque, grade de fotos, cartões de correção/decisão.

## Rodada 6 — varredura (branch fix/varredura-2026-11-22)
Relatório: RELATORIO_VARREDURA.md.
- Datas em horário local (`src/lib/dataLocal.ts`): fim do "dia seguinte" após 21h em RDO, nova obra, painel, exportação e sincronização.
- Telegram: segredo do webhook comparado em tempo constante.
- `.env.example` atualizado; `meta description` no index.html.
- Não aplicado de propósito: `npm audit fix --force` (rebaixaria o Firebase). Pendências: ESLint/teste de tela, validar plano no servidor, restringir chave web no Google Cloud.

## Rodada 7 — tela inicial fluida
- Fotos (tirar/escolher) ficam na tela inicial com miniaturas, remoção individual e "Remover todas"; só entram no relatório quando ele abre.
- "Gravar RDO" grava na própria tela inicial (cronômetro, "Parar e continuar", "Cancelar"). Ao parar, abre o relatório e a IA já preenche os campos para edição.
- `fotoPendente.ts` guarda fotos e áudio pendentes; `DiarioForm` os recolhe ao abrir (`processarAudio`).

## Rodada 8 — linguagem simples
- Tela inicial com 3 passos explicados (falar, parar, conferir e enviar), "Prefiro escrever" e aviso de fotos opcionais.
- Formulário: botões "Enviar"/"Enviar relatório" para obra da empresa; mensagem de pronto após a IA.

## Rodada 9 — relatório simples
Ordem do formulário: Ditar → Atividades (texto principal) → Fotos → "Mais detalhes (opcional)" (equipe, materiais, ocorrências, observações) fechado → "Data, horário, GPS e clima" fechado → Enviar. Nenhum campo foi removido; apenas recolhido.

## Rodada 10 — tela branca ao parar a gravação
- Hipótese: a IA devolvia campo em formato não-texto (lista/objeto) e `atividades.trim()` derrubava a tela inteira. `estruturarPorAudio` agora converte tudo para texto (`comoTexto`).
- `LimiteDeErro` no topo do app: em qualquer falha de tela mostra aviso com "Tentar de novo"/"Recarregar" e a mensagem do erro, em vez de tela branca.
- Não reproduzido localmente (exige login Firebase); depende de reteste do usuário.

## Rodada 11 — IA com áudio e tela branca no login
- IA 502 ao enviar áudio gravado no celular: o servidor mandava o arquivo como `audio.ogg` com conteúdo webm e o mime com `;codecs=opus`. Agora o nome/extensão seguem o formato real e o mime é normalizado (cliente e servidor, Groq e Gemini). O erro 502 passou a mostrar a causa resumida entre parênteses para diagnóstico. Causa exata NÃO confirmada (sem acesso aos logs do Cloudflare).
- Tela branca após login: `Dashboard` deixou de ser carregado sob demanda; o fallback agora é "Carregando…" com recarga automática (limpando cache) após 12 s e botão após 6 s; a rede de segurança do `main.tsx` tenta até 3 vezes e zera quando o app aparece.
