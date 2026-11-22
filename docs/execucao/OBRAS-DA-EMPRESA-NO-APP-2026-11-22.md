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
