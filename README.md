# ObraMatch Diário

Diário de Obra (RDO) por app e por **Telegram com IA** — parte do ecossistema [ObraMatch](https://obramatch.com.br).

**Diferenciais:**
- 🎙 **Registro por áudio no Telegram** (@diariomatchbot): a IA transcreve e estrutura o RDO — nada é salvo sem confirmação
- 🌤 **Clima de fonte oficial** (Open-Meteo) preenchido automaticamente pelo GPS da obra
- 🔒 **Código de integridade SHA-256** em cada RDO + verificação no app — valor probatório em perícias
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
