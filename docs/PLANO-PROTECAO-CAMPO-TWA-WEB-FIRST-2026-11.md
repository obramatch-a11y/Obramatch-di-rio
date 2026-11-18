# PROTOCOLO DE PROTEÇÃO E FUTURA ADEQUAÇÃO — OBRAMATCH CAMPO / TWA

**Data:** 18/11/2026  
**Repositório:** obramatch-a11y/Obramatch-di-rio  
**Status:** PLANO DE REFERÊNCIA, **nenhuma mudança funcional aprovada**.  
**Execução inicial:** leitura, inventário, acompanhamento de compatibilidade.  
**Estratégia oficial proposta:** [Plano de Orquestração WEB-FIRST](https://github.com/obramatch-a11y/Landing_page_diario/blob/main/docs/16-ESTRATEGIA-ORQUESTRACAO-WEB-FIRST-2026-11.md) (repositório mestre privado).  
**Visual do site:** [Plano de UX e imagens](https://github.com/obramatch-a11y/Landing_page_diario/blob/main/docs/17-DESIGN-SYSTEM-ASSETS-WEB-2026-11.md).  
**Produto Campo:** [Proposta de UX Campo](./PROPOSTA-CAMPO-TWA-UX-2026-11.md).

> O Campo seguirá protegido enquanto se organiza a plataforma WEB e se implanta gradualmente a Central de Governança. Os dados são compartilhados; por isso o projeto WEB também deverá testar compatibilidade com o Campo vigente.

## 1. O que NÃO mudar nesta primeira fase

- package name, bundle/assinatura e identidade do aplicativo da Play Store;
- manifesto TWA/PWA e escopo, domínio, Digital Asset Links, assetlinks.json;
- projeto Bubblewrap/Gradle, se localizado, sem etapa de autorização específica;
- código de interface e lógica de RDO/audio/IA/fotos/PDF, sem escopo aprovado;
- Cloudflare, Worker Telegram e webhooks;
- Firebase Auth, Firestore nomeado, regras, índices, dados de produção;
- Supabase Storage, políticas, URLs, rotinas de exclusão;
- assinaturas, planos, cota de IA, billing ou fluxos legados.

Não usar merge de PR de documentação como autorização de publicação Android. Backups/snapshots e regressão da versão publicada serão pré-requisitos.

## 2. O que a auditoria pode fazer agora (somente leitura)

- Localizar projeto de empacotamento Android, se disponível, e versão publicada correspondente.
- Inventariar componentes, telas, gravação, transcrição, PDF, assinatura, Telegram, armazenamento local, fotos, quota/planos, testes.
- Identificar rotas e serviços comuns com a plataforma WEB, especialmente Auth e **Firestore nomeado**.
- Mapear pontos de leitura/escrita em obras/{id} e RDOs; observar dependências de ownerId e de regras existentes.
- Documentar onde o site pode acrescentar novos conceitos sem quebrar o usuário individual.
- Registrar evidências e lacunas; não atribuir “homologado” a recursos apenas descritos.
- Fazer benchmark de UX e preparar protótipos, sem alterar o código do Campo.

## 3. Contratos que o Web deverá preservar

1. Uma UID Firebase corresponde ao usuário individual do Campo.
2. O usuário continua consultando obras próprias, gerando RDOs e acessando PDFs.
3. Mudanças empresariais não transformam automaticamente todas as obras em empresariais.
4. Novos campos opcionais não impedem leitura dos documentos legados.
5. Regras de autorização para empresas não se tornam “qualquer membro vê todos”.
6. O app não é forçado a consultar coleções novas antes de seu update.
7. Fotos Base64, URLs legadas e storagePath continuam legíveis conforme suporte vigente.
8. A estrutura atual do RDO e a numeração sequencial continuam compatíveis até migração aprovada.
9. Envio offline e sync preservam rascunhos e não alteram obra destino inadvertidamente.
10. Mudanças no site não alteram implicitamente a Cloudflare/TWA, Telegram ou Google Play.

## 4. Após web homologada: menor adaptação possível

**Mínimo a acrescentar ao Campo quando autorizado:**

- **Minhas obras** e **Obras de empresas** no seletor existente, com empresa/obra explicitamente visíveis;
- aceite de convite já criado na Central, usando login existente;
- marcação de destino no envio e estado real “Aguardando sincronização / Recebido pela Central”;
- receber solicitação de complemento ao RDO já existente;
- responder por áudio à solicitação, preservando versão/adendo/histórico no núcleo compartilhado;
- compartilhamento simples de PDF com cliente final via Android Web Share, sujeito a compatibilidade e permissão;
- eventual conferência por voz e áudio temporário, **somente após política aprovada**.

**Não acrescentar:** dashboard empresarial, administração de equipe, parâmetros de fluxo ou formulário complexo na tela inicial. Profissional autônomo permanece com a jornada atual, aprimorada por simplificação após teste.

## 5. Gate para iniciar código neste repositório

- Etapa específica de TWA autorizada no Plano Oficial, sem conflito com as demais.
- Central Web e contratos empresa/obra/convite aprovados e testados.
- Modelo físico e Firestore Rules compatíveis com usuários individuais e legados.
- Publicação web devidamente homologada, sem regressão de leitura/escrita do Campo.
- Testes Android/TWA, iOS PWA, offline, áudio, foto, PDF, assinatura, login, reset, integridade e sync planejados.
- Estratégia de versão, associacão de domínio, deploy Cloudflare e rollback definida.
- Atualização documental cruzada registrada no mestre.
- Aprovação explícita do responsável pela produção Play/Cloudflare.

## 6. Regras de GitHub

- Durante Web-first: **apenas documentos e auditoria**, preferencialmente em branch/PR separado da main.
- Desenvolver a adaptação futura em pequenos PRs temáticos, depois de gates aprovados.
- Não adotar mudanças de React/Vite ou “melhorias de stack” como parte automática do fluxo de aprovação.
- Revisar diff e rodar checks com evidência; nenhum commit ao repositório prova publicação na Play.
- Documentação global no repositório mestre Web; aqui ficam regras TWA e contrato de compatibilidade. Evitar cópias divergentes.

## 7. Cenários obrigatórios de não regressão

1. Usuário individual antigo continua com acesso a suas obras/RDOs sem convite empresarial.
2. Obra empresarial nova não aparece para usuário não convidado.
3. Profissional de duas empresas não vaza informação entre elas.
4. RDO criado e salvo offline reaparece ao reconectar, sem duplicação.
5. Web pode aprovar/devolver um RDO empresarial sem sobrescrever o original.
6. Usuário recebe complemento correto, por versão, com resposta registrável.
7. Geração de PDF e assinatura continuam legíveis com documentos antigos.
8. Login e Firebase apontam ao mesmo projeto e banco nomeado de antes.
9. Bloqueio ou rollback da Central não impossibilita uso pessoal do Campo.
10. Atualização TWA não rompe Digital Asset Links, identidade e instalação Play.

## 8. Evidência e próxima ação

Este arquivo registra a **orquestração de compatibilidade**, não indica que testes ou builds já foram executados. A única ação permitida inicialmente é inventário técnico sem mudança funcional, respeitando AGENTS.md e a etapa autorizada pelo documento mestre. O plano oficial atual precisa de reconciliação antes da implementação.

**Nenhum código, banco, segredo, dado, Cloudflare, TWA, Play Store ou deploy é alterado por este documento.**
