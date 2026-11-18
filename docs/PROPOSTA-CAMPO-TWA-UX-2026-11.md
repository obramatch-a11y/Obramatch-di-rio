# ObraMatch CAMPO — proposta de experiência TWA/PWA (18/11/2026)

**Este repositório:** `obramatch-a11y/Obramatch-di-rio` — **aplicação React/Vite/PWA usada na TWA Android da Google Play**, com Cloudflare/Telegram e fluxos de RDO.  
**Não é** o repositório da Central Web (`obramatch-a11y/Landing_page_diario`).  
**Status:** proposta para auditoria e design; nenhum código ou publicação alterados.  
**Referência global:** [RFC Campo + Central](https://github.com/obramatch-a11y/Landing_page_diario/blob/main/docs/rfc/RFC-2026-11-CAMPO-CENTRAL-GOVERNANCA.md) (repositório privado, requer permissão).  
**Proposta específica da Central:** [Web / Governança](https://github.com/obramatch-a11y/Landing_page_diario/blob/main/docs/PROPOSTA-CENTRAL-WEB-GOVERNANCA-2026-11.md).  
**Autoridade:** seguir `AGENTS.md`, Controle Mestre e ADRs do repositório mestre antes de qualquer alteração.

## 1. Missão da interface

Tornar o RDO tão simples quanto mandar áudio pelo WhatsApp, sem abandonar o engenheiro autônomo que precisa visualizar, gerar PDF, imprimir ou compartilhar seu relatório final. A Central empresarial administra aprovação, equipes, indicadores e histórico avançado; o Campo **não** vira painel corporativo.

Priorizar pedreiro, pintor, eletricista, empreiteiro, mestre de obras e engenheiro. Considerar trabalhadores com baixa alfabetização, aparelhos de entrada, uso em obra, uma mão e conectividade fraca. A interface deve ser profissional e respeitosa, nunca infantilizada.

## 2. Telas e ações, na ordem da jornada

| Tela | Propósito | Ação primária |
|---|---|---|
| Início / Minha obra | Contexto atual, aviso de pendências | **Gravar áudio** |
| Escolher obra | Separar **Minhas obras** de **Obras de empresas** | Selecionar a obra correta |
| Gravando | Gravar, pausar, cancelar ou concluir com feedback acessível | **Concluir áudio** |
| Processando | Estado real do processamento e opção de tentar novamente | Aguardar com arquivo preservado |
| Resumo do RDO | Exibir o que a IA entendeu, sem dados inventados | **Ouvir/Conferir** |
| Conferência por voz | Leitura em voz alta, pausa, repetir, correção por áudio | **Está igual ao que falei** |
| Envio empresarial | Mostrar claramente qual obra/empresa receberá | **Enviar para conferência** |
| Finalização individual | Gerar e conservar RDO próprio sem workflow corporativo | **Salvar relatório** |
| Meus relatórios | Buscar por obra/data, acompanhar estado | **Abrir relatório** |
| RDO/PDF | Exibir relatório e fotos, imprimir/baixar/compartilhar | **Ver PDF** |
| Pendência / devolução | Mostrar pedido do engenheiro em texto simples/voz | **Responder por áudio** |
| Sincronização offline | Diferenciar salvo no aparelho, pendente e recebido | **Tentar enviar novamente** |

Não adicionar gráfico, árvore de aprovações ou formulário extenso à tela inicial. Evitar preenchimento desnecessário; mostrar uma decisão de cada vez.

## 3. Identidade única, obras próprias e convites empresariais

**Uma conta → obras próprias + obras de múltiplas empresas.** Os vínculos são por obra, não pelo aparelho ou telefone. A Central envia convite seguro e o usuário autenticado aceita; a obra aparece na lista autorizada do Campo.

- Uma obra elegível: sugerir contexto, exibir nome e permitir troca.
- Múltiplas obras: seleção simples, nome da obra visível antes de enviar, confirmação na dúvida.
- IA **não** define empresa/obra por inferência livre do texto.
- O servidor valida vínculo/permissão independentemente da UI.
- Um funcionário desligado perde o direito de novos envios corporativos; relatórios pessoais não passam para a empresa.
- Uma obra individual pode ter cliente final/WhatsApp para compartilhamento simples.

## 4. Dois caminhos, sem confusão

**Individual:** `Gravar → IA → Conferir → Finalizar → Ver PDF / Compartilhar`. O usuário continua tendo ferramenta documental completa e não precisa da Central para emitir seu RDO.

**Empresarial:** `Gravar → IA → Conferir OU Encaminhar sem conferir → Enviar à Central`. O servidor confirma recebimento; o usuário vê estado do RDO e, se devolvido, responde por áudio. O Campo não aprova tecnicamente serviços por padrão.

**Compartilhar PDF por WhatsApp:** usar os recursos nativos de compartilhamento compatíveis do dispositivo/PWA. Link `wa.me` pode abrir conversa/mensagem, mas não anexa PDF automaticamente, não depende de webhook e não comprova entrega/leitura. Conferir permissões antes de compartilhar um RDO empresarial.

## 5. Áudio e transcrição — regra de UX proposta

O trabalhador com dificuldade de leitura **pode enviar sem ler o texto**; neste caso, mostrar `Transcrição pendente de conferência` e manter áudio temporário vinculado para o responsável autorizado na Central.

Quando o usuário ouvir/ler e confirmar, registrar **somente a conferência de fidelidade**; isso não é aprovação técnica nem confirmação de execução.

**Retenção experimental, não ativar ainda:** após confirmação, hipótese de 72h; não conferido, até 30 dias com alertas. Políticas precisam considerar contestações, obrigações de guarda, cópias e backups. Expiração sem conferência → `Transcrição não conferida — áudio original indisponível`. Nunca apresentar como validado por silêncio. Áudio em retenção excepcional não deve ser excluído.

## 6. Offline e feedback de sincronização

Diferenciar visivelmente:
- `Salvo no aparelho`;
- `Aguardando conexão`;
- `Enviando`;
- `Recebido pela Central` (somente após ack do servidor);
- `Erro — tentar novamente`.

Guardar rascunho/mídia durante falhas, impedir duplicação por retry/idempotência e confirmar obra/permissão quando reconectar. O horário declarado não substitui o horário do servidor.

## 7. Design system proposto

- Azul ObraMatch `#0A3D91`; laranja `#FF6F00`; fundos neutros claros.
- Microfone grande como ação visual dominante; foto, relatórios e pendências secundários.
- Ícones com texto, alvos de toque amplos, alto contraste, linguagem comum, leitura em voz alta e leitor de tela.
- Feedback visual, áudio acessível e movimento reduzido quando necessário.
- Evitar mascote grande, gradientes excessivos e dashboards na operação cotidiana.
- Prototipar telas reais em largura ~390px, testar responsividade e iOS/PWA.

## 8. Itens protegidos e integração real

**Não alterar por esta proposta:** `package name`, manifesto/escopo TWA, `assetlinks.json`, Digital Asset Links, assinatura, domínio, Play Store, variáveis de produção, regras Firestore, fotos existentes, rotinas de exclusão, billing e fluxos atualmente estáveis.

O repositório possui React 19, Vite 6, Tailwind 4 e PWA; o site utiliza outra versão de React/Vite. **Não copiar componentes cegamente**. O código-fonte Android de empacotamento Bubblewrap/Gradle deve ser localizado se não estiver neste repositório.

Firebase Auth/Firestore (incluindo **banco nomeado**) devem continuar consistentes com web. A estrutura atual de fotos tem caminhos legados: auditar antes de reescrever. Telegram existente não deve ser removido por causa de uma futura integração WhatsApp.

## 9. Testes de aceitação propostos

1. Profissional inicia relato em poucos toques e sabe qual obra está ativa.
2. Usuário com baixa alfabetização consegue ouvir e encaminhar sem confirmar texto que não leu.
3. Sem serviço informado, IA não fabrica resultado, equipe ou quantidade.
4. Engenheiro autônomo visualiza e compartilha PDF sem Central corporativa.
5. Usuário em duas construtoras não envia para obra errada nem acessa dados de outra.
6. Falha de conexão não perde áudio, foto ou rascunho; retry não duplica.
7. Envio não mostra sucesso antes do servidor confirmar.
8. Devolução permite responder por voz, sem alterar o original.
9. Android/TWA continua compilável e iPhone PWA é testado em aparelho real.
10. Testes comparativos com usuários reais medem tempo, compreensão e erros.

## 10. Ordem recomendada e próximo passo

1. **Somente leitura:** inventariar componentes, rotas, telas, captura de áudio, IA, Firestore, PDF, assinatura, offline e testes atuais.
2. Desenhar protótipos de Início, Escolha de Obra, Gravação, Conferência, Envio e Meus Relatórios.
3. Testar a experiência com profissionais reais e revisar o design.
4. Decidir contratos de envio/vínculo em conjunto com a Central web e o núcleo compartilhado.
5. Só então implementar por etapas autorizadas, com rollback, testes e autorização explícita para alterar TWA/Play Store.

**Este arquivo é uma proposta de design e produto. Não equivale a funcionalidade disponível, aprovação de arquitetura ou autorização de implantação.**
