# Página /planos do app atualizada — 2026-11-24

**Problema:** `public/planos.html` (aberta no app) tinha limites e texto fixos de julho/2026 (Free 2 obras, Pro 10 obras...), sem Equipe/Empresa e sem refletir o catálogo editado no admin.

**Mudança:**
- Worker: rota pública `GET /api/comercial` que lê o catálogo da plataforma (`/api/obras/dispatcher?scope=public&action=commercial`) no servidor (sem CORS), cache de 30 s.
- `planos.html`: seção "Planos vigentes" montada com os planos visíveis na vitrine (limites, recursos, usuários, preço do Pro com promoção de lançamento, "Sob consulta" + WhatsApp para Equipe/Empresa). Se a leitura falhar, mostra aviso e o WhatsApp do comercial. Seções antigas 1 e 2 (números fixos) substituídas.
- Mantidas as seções 3 a 12 (franquias, cobrança, reembolso...). 

**Pendente de decisão do André:** as seções 5 e 9 dizem que no Android a cobrança é pela Google Play. Isso conflita com "Mercado Pago é o único gateway". Texto jurídico não foi alterado sem aval.
**Testes:** tsc; renderização com dados de exemplo em Chrome headless (390 px). Não validado com o catálogo real em produção.
