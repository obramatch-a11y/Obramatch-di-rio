import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import LimiteDeErro from './components/LimiteDeErro';

// Registra listeners de PWA no nível mais alto do sistema (antes do React iniciar)
window.addEventListener('beforeinstallprompt', (e) => {
  console.log("beforeinstallprompt recebido", e);
  // Previne o comportamento padrão para podermos adiar e usar nosso próprio botão
  e.preventDefault();
  (window as any).__deferredPrompt = e;
  // Dispara um evento customizado para notificar componentes React se já estiverem montados
  window.dispatchEvent(new CustomEvent('beforeinstallprompt_global_received', { detail: e }));
});

window.addEventListener('appinstalled', (e) => {
  console.log("appinstalled recebido", e);
  (window as any).__appInstalled = true;
  window.dispatchEvent(new CustomEvent('appinstalled_global_received'));
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LimiteDeErro>
      <App />
    </LimiteDeErro>
  </StrictMode>,
);


// Rede de segurança: se a tela continuar branca (ex.: atualização do aplicativo em andamento), limpa o cache antigo e recarrega.
// Até 3 tentativas por sessão; o contador zera quando o app aparece normalmente.
const CHAVE_BRANCA = 'om_tentativas_tela_branca';
window.setTimeout(async () => {
  const raiz = document.getElementById('root');
  try {
    if (raiz && raiz.childElementCount > 0) { sessionStorage.removeItem(CHAVE_BRANCA); return; }
    const n = Number(sessionStorage.getItem(CHAVE_BRANCA) || '0');
    if (n >= 3) return;
    sessionStorage.setItem(CHAVE_BRANCA, String(n + 1));
  } catch { /* sem armazenamento */ }
  try {
    const nomes = await caches.keys();
    await Promise.all(nomes.map((nome) => caches.delete(nome)));
  } catch { /* melhor esforço */ }
  window.location.reload();
}, 5000);
