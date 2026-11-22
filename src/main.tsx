import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

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
    <App />
  </StrictMode>,
);


// Rede de segurança: se a tela continuar branca (ex.: atualização do aplicativo em andamento), recarrega uma única vez.
window.setTimeout(() => {
  const raiz = document.getElementById('root');
  if (raiz && raiz.childElementCount === 0) {
    try {
      if (sessionStorage.getItem('om_recarga_tela_branca') === '1') return;
      sessionStorage.setItem('om_recarga_tela_branca', '1');
    } catch { /* sem armazenamento */ }
    window.location.reload();
  }
}, 6000);
