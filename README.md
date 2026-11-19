# ObraMatch Diário

## 🛡️ Proteção do aplicativo da Google Play — estratégia Web-first

**[PLANO DE PROTEÇÃO DO CAMPO/TWA — congelamento funcional e integração mínima posterior](docs/PLANO-PROTECAO-CAMPO-TWA-WEB-FIRST-2026-11.md)**

**[Estratégia de orquestração no repositório WEB](https://github.com/obramatch-a11y/Landing_page_diario/blob/main/docs/16-ESTRATEGIA-ORQUESTRACAO-WEB-FIRST-2026-11.md)** (privado).

Primeiro evoluir o **site/Central** e preservar código, identidade, manifesto e publicação **TWA**. Campo e site compartilham dados Firebase; compatibilidade deve ser testada.

---


## 🧭 Identificação rápida — CAMPO / TWA

**ESTE REPOSITÓRIO É O OBRAMATCH CAMPO:** aplicação React/Vite/PWA utilizada pela **Trusted Web Activity Android**. Contém a experiência de campo, registro de RDO, voz/IA e integrações pertinentes. **Não é o site/Central empresarial.**

📄 **[Abrir proposta de reformulação do Campo — UX amigável, TWA, obras e envio](docs/PROPOSTA-CAMPO-TWA-UX-2026-11.md)**

🔗 **Site e futura Central:** [`Landing_page_diario`](https://github.com/obramatch-a11y/Landing_page_diario) (repositório privado). **Documentação mestre e regras oficiais estão lá.**

> **Status:** proposta documental para auditoria, não implementação. Antes de mexer no TWA/Google Play, ler `AGENTS.md` e a documentação mestre. Não alterar manifestos, assinatura, domínio, assetlinks ou código de produção sem autorização.

---


Diário de Obra (RDO) por app e por **Telegram com IA** — parte do ecossistema [ObraMatch](https://obramatch.com.br).

**Diferenciais:**
- 🎙 **Registro por áudio no Telegram** (@diariomatchbot): a IA transcreve e estrutura o RDO — nada é salvo sem confirmação
- 🌤 **Clima de fonte oficial** (Open-Meteo) preenchido automaticamente pelo GPS da obra
- 🔒 **Código SHA-256** para verificar a consistência do conteúdo atual do RDO; não comprova autoria nem histórico de alterações
- 📋 **RDO numerado** com PDF padrão de mercado (assinaturas RT e cliente)
- 🏗 Ponte com o marketplace ObraMatch (selo "Profissional que documenta")

## Stack (custo zero, sem VPS)
React 19 + Vite + Tailwind 4 (PWA) · Firebase Auth/Firestore · Cloudflare Pages + Pages Functions · Gemini (nível gratuito) · Supabase Storage · Open-Meteo

## Deploy — Cloudflare Pages
1. Conecte este repositório na Cloudflare Pages — build `npm run build`, saída `dist`
2. Configure as variáveis de ambiente (Settings → Environment variables):

| Variável | O que é |
|---|---|
| `GEMINI_API_KEY` | Chave gratuita do Google AI Studio |
| `TELEGRAM_BOT_TOKEN` | Token do bot (@BotFather) |
| `TELEGRAM_SECRET` | Senha longa inventada por você (protege o webhook) |
| `FIREBASE_SERVICE_ACCOUNT` | JSON completo da credencial de serviço (Firebase → Contas de serviço) |
| `FIREBASE_WEB_API_KEY` | Chave web pública do projeto Firebase |
| `FIREBASE_DB_ID` | ID do banco Firestore (veja `firebase-applet-config.json`; em projeto próprio: `(default)`) |
| `SUPABASE_URL` | URL do projeto Supabase (fotos) |
| `SUPABASE_SERVICE_KEY` | Service role key do Supabase |

Frontend (opcional, para fotos direto do app): `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

3. Publique as regras do `firestore.rules` no Console do Firebase
4. Crie o bucket público `diario-fotos` no Supabase
5. Ative o webhook do bot abrindo uma vez: `https://SEU-DOMINIO/api/setup-webhook?secret=SEU_TELEGRAM_SECRET`

## Endpoints (Pages Functions)
- `POST /api/ia` — IA do app (ditar diário / melhorar texto), autenticada, limite 20/dia por usuário
- `POST /api/telegram` — webhook do bot
- `GET /api/setup-webhook?secret=` — registra o webhook
- `GET /api/perfil-publico?uid=` — resumo público para o marketplace

## Desenvolvimento
```bash
npm install
npm run dev        # app local
npm run typecheck  # verificação de tipos
npm run build      # build de produção
```

