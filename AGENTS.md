# AGENTS.md — ObraMatch Diário / TWA

Este arquivo é obrigatório para qualquer agente de IA ou desenvolvedor que trabalhe neste repositório.

## Fonte documental oficial

A memória operacional e a documentação global inicial do ecossistema estão no repositório:

`obramatch-a11y/Landing_page_diario`

Documento único de entrada:

`docs/10-CONTROLE-MESTRE-DO-PROJETO.md`

Quando os dois repositórios estiverem clonados no mesmo computador, localize o clone de `Landing_page_diario` e leia esse documento antes de alterar este repositório.

## Procedimento obrigatório

Antes de analisar, modificar, testar ou executar scripts neste repositório:

1. leia o Controle Mestre no repositório de documentação;
2. siga a cadeia obrigatória de leitura indicada nele;
3. consulte o Status Mestre e o Plano de Execução;
4. confirme que a etapa autoriza alterações neste repositório;
5. audite o código atual antes de implementar;
6. preserve as proteções do TWA e Google Play;
7. execute os testes aplicáveis;
8. registre todas as alterações, decisões, falhas e evidências na memória operacional do repositório mestre;
9. atualize o relatório específico em `docs/execucao/`;
10. não declare conclusão enquanto a documentação obrigatória não estiver atualizada.

## Regra para este repositório

Não alterar sem autorização específica:

- package name;
- manifest e escopo do TWA;
- Digital Asset Links e `assetlinks.json`;
- assinatura;
- domínio associado;
- publicação Google Play;
- identidade do aplicativo;
- Firebase compartilhado, regras ou dados de produção;
- secrets;
- fluxo funcional comprovadamente estável.

## Memória oficial

Não confie apenas na conversa. A fonte de verdade é:

1. código atual dos dois repositórios;
2. Constituição de Engenharia;
3. ADRs vigentes;
4. documentação técnica;
5. Status, Plano, Diário e relatórios versionados.

Se a documentação mestre estiver indisponível ou não puder ser lida, não inicie uma grande alteração. Registre o bloqueio.