# App: PDF único e regras de edição (2026-11-24)

- O PDF do RDO no app (detalhe e exportação de vários) usa o mesmo gerador da web (`src/lib/pdfRdo.ts`, jsPDF) via `src/lib/documentoRdo.ts`. "Gerar PDF" baixa; "Compartilhar PDF" usa o compartilhamento nativo (ou baixa se o aparelho não permitir). O modelo antigo de impressão (`RdoPrintBlock`, `window.print`) foi removido.
- Relatórios de obra da empresa: antes da validação (enviado ou devolvido) o autor pode editar, gerando nova versão (a anterior fica guardada). Depois de validado o servidor recusa edição (Landing, `api/_lib/centralRdos.ts`). Não há exclusão de relatório enviado.
- Limite: relatórios particulares (não enviados) continuam editáveis/apagáveis pelo dono.
