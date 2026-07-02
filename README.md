# ObraMatch Diário 🚧

Aplicação moderna para controle diário de obras e relatórios de acompanhamento, com suporte offline (PWA) e integração direta com Firebase (Authentication e Firestore).

## 🚀 Como Hospedar Grátis (Vercel, Netlify ou Cloudflare Pages)

Esta aplicação foi configurada para funcionar perfeitamente em qualquer plataforma de hospedagem de aplicações estáticas (Single Page Applications - SPA).

### Configurações de Deploy Recomendadas

- **Framework Preset**: Vite / React (ou `Other`)
- **Build Command**: `npm run build`
- **Publish / Output Directory**: `dist`
- **Node.js Version**: 18 ou superior

---

## ☁️ Plataformas de Deploy Gratuito

### 1. Vercel (Recomendado)
1. Conecte sua conta do GitHub na [Vercel](https://vercel.com).
2. Clique em **Add New** > **Project** e selecione este repositório.
3. Certifique-se de que o diretório de saída está definido como `dist`.
4. Clique em **Deploy**.
5. No painel do projeto, vá em **Settings** > **Domains** e adicione o domínio: `diario.obramatch.com.br`.

### 2. Netlify
1. Conecte sua conta do GitHub no [Netlify](https://netlify.com).
2. Clique em **Add new site** > **Import an existing project** e selecione este repositório do GitHub.
3. Configure o diretório de saída como `dist`.
4. Clique em **Deploy site**.
5. O arquivo `public/_redirects` já está incluso para garantir que o roteamento de páginas (SPA fallback) funcione perfeitamente.
6. Vá em **Domain settings** e adicione seu domínio personalizado: `diario.obramatch.com.br`.

### 3. Cloudflare Pages
1. Conecte seu GitHub no painel do [Cloudflare Pages](https://pages.cloudflare.com).
2. Selecione este repositório e configure o framework preset como **Vite**.
3. Defina o build command como `npm run build` e o diretório de saída como `dist`.
4. Salve e implante.
5. Em **Custom Domains**, adicione o domínio `diario.obramatch.com.br` e siga as instruções DNS da Cloudflare.

---

## 🛠️ Tecnologias Utilizadas

- **React 18** & **Vite**
- **TypeScript**
- **Tailwind CSS** (Estilização Moderna)
- **Firebase Authentication** (Controle de Acesso)
- **Firebase Firestore** (Banco de Dados em Tempo Real)
- **PWA (Progressive Web App)** (Instalável e Offline com Service Workers)
