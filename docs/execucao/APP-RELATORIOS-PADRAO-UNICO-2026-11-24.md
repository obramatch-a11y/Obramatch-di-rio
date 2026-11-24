# App: relatórios no mesmo padrão e acesso direto (2026-11-24)

- `DiarioDetail` (detalhe do RDO próprio/arquivado) e `ObraDashboard` (lista de relatórios da obra) trocaram o modelo antigo laranja/preto pelo padrão de `RelatoriosEmpresa` (`rel-hero`, `rel-secao`, `rel-chip`, `app-work-card`). Lógica preservada: PDF/imprimir, compartilhar, integridade, editar, excluir, assinatura, fotos, exportar, bloqueio de obra arquivada.
- Acesso direto: tocar numa obra da empresa abre seus relatórios; obra própria (ativa ou arquivada) já abria a lista. A aba "Relatórios" não exige obra selecionada: abre a obra atual ou leva à lista de obras.
- Verificação: tsc, build, test:authoritative-flows. Sem teste em aparelho.
