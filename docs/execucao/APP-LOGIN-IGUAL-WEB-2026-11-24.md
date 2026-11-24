# App: tela de login igual à web (2026-11-24)

- `src/components/Login.tsx` reescrito no padrão da web: fundo azul em degradê, marca ObraMatch DIÁRIO, cartão arredondado com abas Entrar/Criar conta, "Bem-vindo!", botão Google no topo, divisor "ou use seu e-mail", campos com mostrar/ocultar senha, "Esqueceu sua senha?" e botão laranja.
- A lógica de autenticação (Firebase: e-mail/senha, Google, recuperação de senha, mensagens de erro) permanece a mesma.
- Estilos: `src/styles/campo/login-web.css` (regras `auth-*-v4` copiadas da web, com as variáveis necessárias). Mantidos o botão Instalar aplicativo, o bloco institucional ObraMatch e os links de Termos e Privacidade.
- Verificação: tsc, build e captura em Chrome headless (390 px) das abas Entrar e Criar conta. Sem teste em aparelho.
