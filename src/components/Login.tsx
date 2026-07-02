import React, { useState, useEffect } from 'react';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { motion } from 'motion/react';
import { Construction, Mail, Lock, LogIn, UserPlus, AlertTriangle, Check, X, Info, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installStatus, setInstallStatus] = useState<string | null>(null);

  // PWA Diagnostic States
  const [swSupported, setSwSupported] = useState<boolean | null>(null);
  const [swController, setSwController] = useState<boolean | null>(null);
  const [swReady, setSwReady] = useState<boolean | null>(null);
  const [manifestLoaded, setManifestLoaded] = useState<boolean | null>(null);
  const [beforeinstallpromptFired, setBeforeinstallpromptFired] = useState<boolean>(false);
  const [displayMode, setDisplayMode] = useState<string>('');
  const [userAgentStr, setUserAgentStr] = useState<string>('');
  const [icon192, setIcon192] = useState<boolean | null>(null);
  const [icon512, setIcon512] = useState<boolean | null>(null);
  const [iconMaskable, setIconMaskable] = useState<boolean | null>(null);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState<boolean>(true); // Open by default for mobile debugging

  // Advanced diagnostic states
  const [isIframe, setIsIframe] = useState<boolean>(false);
  const [hasBeforeInstallPromptEvent, setHasBeforeInstallPromptEvent] = useState<boolean | null>(null);
  const [installedAppsStatus, setInstalledAppsStatus] = useState<string>('Não verificado');
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState<boolean>(false);
  const [isChrome, setIsChrome] = useState<boolean>(false);
  const [manifestHref, setManifestHref] = useState<string>('');

  // Real-time globally captured states
  const [hasWindowDeferredPrompt, setHasWindowDeferredPrompt] = useState<boolean>(false);
  const [appInstalledEventFired, setAppInstalledEventFired] = useState<boolean>(false);
  const [appInstalledEventTime, setAppInstalledEventTime] = useState<string>('');

  // Run diagnostics function
  const runDiagnostics = () => {
    // 1. Service Worker Support
    const supported = 'serviceWorker' in navigator;
    setSwSupported(supported);

    // 2. Service Worker Controller
    setSwController(supported ? !!navigator.serviceWorker.controller : false);

    // 3. Service Worker Ready
    if (supported) {
      navigator.serviceWorker.ready
        .then(() => setSwReady(true))
        .catch(() => setSwReady(false));
    } else {
      setSwReady(false);
    }

    // 4. Manifest Loading
    fetch('/manifest.json')
      .then((res) => setManifestLoaded(res.ok))
      .catch(() => setManifestLoaded(false));

    // 5. Current Display Mode
    const mode = window.matchMedia('(display-mode: standalone)').matches
      ? 'standalone'
      : window.matchMedia('(display-mode: minimal-ui)').matches
      ? 'minimal-ui'
      : 'browser';
    setDisplayMode(mode);

    // 6. User Agent
    const ua = navigator.userAgent;
    setUserAgentStr(ua);
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);
    setIsAndroid(/Android/.test(ua));
    setIsInAppBrowser(/FBAN|FBAV|Instagram|Snapchat|FBIOS|Messenger|WhatsApp|Line|SBrowser|MiuiBrowser/.test(ua));
    setIsChrome(/Chrome|CriOS|HeadlessChrome/.test(ua) && !/Edge|Edg|OPR|OPiOS|Vivaldi|YaBrowser|Silk/.test(ua));

    // 7. Check PWA Icons
    const checkIcon = (src: string, callback: (ok: boolean) => void) => {
      const img = new Image();
      img.src = src;
      img.onload = () => callback(true);
      img.onerror = () => callback(false);
    };
    checkIcon('/icon-192.png', setIcon192);
    checkIcon('/icon-512.png', setIcon512);
    checkIcon('/icon-512-maskable.png', setIconMaskable);

    // 8. Extra audits
    setIsIframe(window.self !== window.top);
    setHasBeforeInstallPromptEvent('BeforeInstallPromptEvent' in window);

    // 9. Installed Related Apps
    if ('getInstalledRelatedApps' in navigator) {
      (navigator as any).getInstalledRelatedApps()
        .then((apps: any[]) => {
          setInstalledAppsStatus(apps && apps.length > 0 ? `Sim (${apps.map((a: any) => a.id || a.platform).join(', ')})` : 'Não');
        })
        .catch((err: any) => {
          setInstalledAppsStatus(`Erro: ${err.message || err}`);
        });
    } else {
      setInstalledAppsStatus('Não suportado pelo navegador');
    }

    // 10. Manifest link check
    const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    setManifestHref(link ? link.href : 'Não encontrado');
  };

  useEffect(() => {
    // Função para checar as propriedades globais no window de forma reativa
    const checkWindowPWAProperties = () => {
      const hasPrompt = !!(window as any).__deferredPrompt;
      setHasWindowDeferredPrompt(hasPrompt);
      if (hasPrompt) {
        setDeferredPrompt((window as any).__deferredPrompt);
        setBeforeinstallpromptFired(true);
      }
      
      const isInstalled = !!(window as any).__appInstalled;
      if (isInstalled) {
        setAppInstalledEventFired(true);
      }
    };

    // Checa inicialmente ao montar o componente
    checkWindowPWAProperties();

    // Ouvintes para os eventos globais customizados disparados por main.tsx
    const handleGlobalPrompt = (e: any) => {
      console.log('beforeinstallprompt recebido (evento global em Login.tsx)', e.detail);
      setHasWindowDeferredPrompt(true);
      setDeferredPrompt(e.detail || (window as any).__deferredPrompt);
      setBeforeinstallpromptFired(true);
    };

    const handleGlobalInstalled = () => {
      console.log('appinstalled recebido (evento global em Login.tsx)');
      setAppInstalledEventFired(true);
      setAppInstalledEventTime(new Date().toLocaleTimeString());
    };

    window.addEventListener('beforeinstallprompt_global_received', handleGlobalPrompt as any);
    window.addEventListener('appinstalled_global_received', handleGlobalInstalled);

    // Ouvintes padrão locais para redundância direta
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__deferredPrompt = e;
      setDeferredPrompt(e);
      setBeforeinstallpromptFired(true);
      setHasWindowDeferredPrompt(true);
      console.log('beforeinstallprompt recebido (redundância local em Login.tsx)');
    };

    const handleAppInstalledLocal = () => {
      (window as any).__appInstalled = true;
      setAppInstalledEventFired(true);
      setAppInstalledEventTime(new Date().toLocaleTimeString());
      console.log('appinstalled recebido (redundância local em Login.tsx)');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalledLocal);

    // Execução inicial dos diagnósticos
    runDiagnostics();

    // Polling de atualização periódica para status ativos e reativos
    const interval = setInterval(() => {
      if ('serviceWorker' in navigator) {
        setSwController(!!navigator.serviceWorker.controller);
      }
      // Re-audita propriedades globais caso tenham sido modificadas em background
      checkWindowPWAProperties();
    }, 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt_global_received', handleGlobalPrompt as any);
      window.removeEventListener('appinstalled_global_received', handleGlobalInstalled);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalledLocal);
      clearInterval(interval);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      setInstallStatus('Instalação ainda não disponível. Abra no Chrome, aguarde alguns segundos e tente novamente.');
      return;
    }
    
    setInstallStatus(null);
    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setDeferredPrompt(null);
      setInstallStatus('Instalando aplicativo...');
    } else {
      console.log('User dismissed the install prompt');
      setInstallStatus('Instalação cancelada pelo usuário.');
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/network-request-failed') {
        setError('Erro de conexão ou serviço de autenticação inativo. Se estiver no visualizador do AI Studio, abra o aplicativo em uma nova guia para evitar bloqueios de iframe e garanta que o provedor "Google" esteja ativado no console do Firebase (Authentication).');
      } else {
        setError('Erro ao fazer login com o Google. Verifique sua conexão.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está sendo utilizado.');
      } else if (err.code === 'auth/invalid-email') {
        setError('E-mail inválido.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Erro de rede ou conexão rejeitada pelo Firebase. Certifique-se de que o método "E-mail/Senha" esteja ativado na guia "Authentication" do seu console do Firebase.');
      } else {
        setError('Ocorreu um erro inesperado. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Dynamic background accents */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-slate-500/10 blur-[120px]" />

      <div className="w-full max-w-md flex flex-col gap-6 relative z-10 my-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4">
              <Construction className="w-8 h-8 text-slate-950 stroke-[2.5]" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans text-center">
              Obra<span className="text-amber-400">Match</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">Diário de Obra Profissional</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span className="text-red-300 text-sm">{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@obramatch.com"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-950/50 border border-slate-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 rounded-2xl text-white placeholder-slate-600 outline-none transition-all text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha secreta"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-950/50 border border-slate-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 rounded-2xl text-white placeholder-slate-600 outline-none transition-all text-sm"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-amber-500/10 hover:shadow-amber-500/25 mt-6 text-sm"
            >
              {isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
              {loading ? 'Aguarde...' : isSignUp ? 'Criar Conta' : 'Entrar'}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-4 text-slate-500 font-medium">Ou continuar com</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-3 cursor-pointer transition-all text-sm"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.14-5.136 4.14a5.95 5.95 0 0 1-5.95-5.95a5.95 5.95 0 0 1 5.95-5.95c1.502 0 2.863.56 3.91 1.48l3.123-3.123C18.847 2.844 15.772 1.8 12.24 1.8A10.2 10.2 0 0 0 2.04 12a10.2 10.2 0 0 0 10.2 10.2c5.695 0 9.927-3.9 9.927-9.6a9.55 9.55 0 0 0-.21-2.315H12.24z"
              />
            </svg>
            Google
          </button>

          {/* PWA Installation Section */}
          <div className="mt-6 pt-6 border-t border-slate-800/60">
            {deferredPrompt ? (
              <button
                onClick={handleInstallClick}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-extrabold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-amber-500/15 text-sm"
              >
                <Construction className="w-5 h-5 animate-bounce" />
                Instalar Aplicativo
              </button>
            ) : (
              <div className="flex flex-col items-center text-center bg-slate-950/40 border border-slate-800/50 p-4 rounded-2xl">
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  Instalação ainda não disponível. Abra no Chrome, aguarde alguns segundos e tente novamente.
                </p>
              </div>
            )}

            {installStatus && (
              <p className="text-xs text-amber-400 font-medium text-center mt-2.5">
                {installStatus}
              </p>
            )}
          </div>

          <div className="text-center mt-8">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-amber-400 hover:text-amber-300 text-sm font-semibold transition-all"
            >
              {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Cadastre-se agora'}
            </button>
          </div>
        </motion.div>

        {/* Painel de Diagnóstico PWA */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full bg-slate-900/85 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl"
        >
          <button 
            onClick={() => setIsDiagnosticOpen(!isDiagnosticOpen)}
            className="w-full flex items-center justify-between font-bold text-sm text-slate-300 hover:text-white transition-all outline-none"
          >
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-500" />
              <span>Painel de Diagnóstico PWA</span>
            </div>
            {isDiagnosticOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {isDiagnosticOpen && (
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">User Agent:</span>
                <span className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]" title={userAgentStr}>
                  {userAgentStr || 'Carregando...'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 bg-slate-950/40 border border-slate-800/40 p-3 rounded-2xl">
                {/* 1. serviceWorkerSupported */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Service Worker Suportado:</span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    {swSupported === null ? (
                      <span className="text-slate-500">?</span>
                    ) : swSupported ? (
                      <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> SIM</span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1"><X className="w-3.5 h-3.5" /> NÃO</span>
                    )}
                  </span>
                </div>

                {/* 2. serviceWorkerController */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Service Worker Ativo (Controller):</span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    {swController === null ? (
                      <span className="text-slate-500">?</span>
                    ) : swController ? (
                      <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> SIM</span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1"><X className="w-3.5 h-3.5" /> NÃO (Pendente)</span>
                    )}
                  </span>
                </div>

                {/* 3. serviceWorkerReady */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Service Worker Pronto (Ready):</span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    {swReady === null ? (
                      <span className="text-slate-500">?</span>
                    ) : swReady ? (
                      <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> SIM</span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1"><X className="w-3.5 h-3.5" /> NÃO</span>
                    )}
                  </span>
                </div>

                {/* 4. manifestLoaded */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Manifesto Carregado (manifest.json):</span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    {manifestLoaded === null ? (
                      <span className="text-slate-500">?</span>
                    ) : manifestLoaded ? (
                      <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> SIM</span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1"><X className="w-3.5 h-3.5" /> ERRO</span>
                    )}
                  </span>
                </div>

                {/* Link do Manifesto */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Caminho do Manifesto:</span>
                  <span className="text-slate-300 font-mono text-[10px] truncate max-w-[180px]" title={manifestHref}>
                    {manifestHref || 'Não verificado'}
                  </span>
                </div>

                {/* 5. beforeinstallpromptFired */}
                <div className="flex items-center justify-between border-t border-slate-800/40 pt-2 mt-1">
                  <span className="text-slate-300 font-medium">Evento de Instalação Recebido:</span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    {beforeinstallpromptFired ? (
                      <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> SIM (Disparado)</span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1"><X className="w-3.5 h-3.5" /> NÃO</span>
                    )}
                  </span>
                </div>

                {/* window.__deferredPrompt existe? */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">window.__deferredPrompt existe?</span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    {hasWindowDeferredPrompt ? (
                      <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> SIM</span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1"><X className="w-3.5 h-3.5" /> NÃO</span>
                    )}
                  </span>
                </div>

                {/* Evento appinstalled recebido */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Evento appinstalled Ocorreu?</span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    {appInstalledEventFired ? (
                      <span className="text-emerald-400 flex items-center gap-1" title={appInstalledEventTime}>
                        <Check className="w-3.5 h-3.5" /> SIM {appInstalledEventTime && `(${appInstalledEventTime})`}
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1"><X className="w-3.5 h-3.5" /> NÃO</span>
                    )}
                  </span>
                </div>

                {/* Suporte nativo ao BeforeInstallPromptEvent */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Suporte Native Prompt API:</span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    {hasBeforeInstallPromptEvent === null ? (
                      <span className="text-slate-500">?</span>
                    ) : hasBeforeInstallPromptEvent ? (
                      <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> SIM (Chrome/Android)</span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1"><X className="w-3.5 h-3.5" /> NÃO (iOS/Safari/Firefox)</span>
                    )}
                  </span>
                </div>

                {/* Rodando em IFrame */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Rodando em IFrame:</span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    {isIframe ? (
                      <span className="text-rose-400 flex items-center gap-1"><X className="w-3.5 h-3.5" /> SIM (Instalação Bloqueada)</span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> NÃO (OK)</span>
                    )}
                  </span>
                </div>

                {/* Aplicativo já Instalado (getInstalledRelatedApps) */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">PWA já Instalado no Disp.:</span>
                  <span className={`flex items-center gap-1.5 font-semibold ${installedAppsStatus.includes('Sim') ? 'text-amber-400' : 'text-slate-400'}`}>
                    {installedAppsStatus}
                  </span>
                </div>

                {/* 6. currentDisplayMode */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Modo de Exibição Atual:</span>
                  <span className="text-amber-400 font-mono font-semibold uppercase">{displayMode || 'Carregando...'}</span>
                </div>

                {/* Detecção de Plataforma */}
                <div className="flex items-center justify-between border-t border-slate-800/40 pt-2 mt-1 text-[11px]">
                  <span className="text-slate-400">Plataforma Detectada:</span>
                  <span className="text-slate-300 font-medium font-mono">
                    {isIOS ? 'iOS (Apple)' : isAndroid ? 'Android' : 'Desktop/Outros'}
                    {isInAppBrowser && ' + In-App WebView'}
                    {isChrome && ' + Chrome Browser'}
                  </span>
                </div>

                {/* 7. icon192Loaded */}
                <div className="flex items-center justify-between border-t border-slate-800/60 pt-2 mt-1">
                  <span className="text-slate-400 font-medium">Ícone 192x192 PNG:</span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    {icon192 === null ? (
                      <span className="text-slate-500">?</span>
                    ) : icon192 ? (
                      <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> OK</span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1"><X className="w-3.5 h-3.5" /> FALHA</span>
                    )}
                  </span>
                </div>

                {/* 8. icon512Loaded */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Ícone 512x512 PNG:</span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    {icon512 === null ? (
                      <span className="text-slate-500">?</span>
                    ) : icon512 ? (
                      <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> OK</span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1"><X className="w-3.5 h-3.5" /> FALHA</span>
                    )}
                  </span>
                </div>

                {/* 9. iconMaskableLoaded */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Ícone Maskable PNG:</span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    {iconMaskable === null ? (
                      <span className="text-slate-500">?</span>
                    ) : iconMaskable ? (
                      <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> OK</span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1"><X className="w-3.5 h-3.5" /> FALHA</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Dicas de resolução baseadas no status */}
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl flex gap-2">
                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-slate-300 text-[11px] leading-relaxed space-y-1">
                  {/* 1. Sem suporte a SW */}
                  {!swSupported && (
                    <p className="text-rose-400 font-medium">
                      Este navegador não suporta PWA/Service Workers. Use o Google Chrome no Android ou Safari no iOS.
                    </p>
                  )}

                  {/* 2. SW não ativo */}
                  {swSupported && !swController && (
                    <p className="text-amber-400">
                      O Service Worker está registrado, mas ainda não está ativo. Experimente recarregar a página (F5) para ativá-lo.
                    </p>
                  )}

                  {/* 3. Rodando em IFrame */}
                  {isIframe && (
                    <p className="text-rose-400">
                      <strong>Bloqueado por IFrame:</strong> Você está vendo o site de dentro de um iframe (ex: visualizador do AI Studio). Navegadores proíbem disparar o prompt de instalação dentro de iframes por segurança. Abra o site em uma aba separada!
                    </p>
                  )}

                  {/* 4. In-App Browser */}
                  {isInAppBrowser && (
                    <p className="text-rose-400">
                      <strong>Bloqueado por In-App WebView:</strong> Você abriu o site dentro de um aplicativo como WhatsApp, Instagram ou Facebook. Esses aplicativos usam WebViews internas que não permitem instalar PWAs. Toque nas configurações do topo (três pontinhos) e selecione <strong>"Abrir no Chrome"</strong> ou <strong>"Abrir no navegador"</strong>.
                    </p>
                  )}

                  {/* 5. Sem suporte à API (Safari/iOS) */}
                  {swSupported && swController && !hasBeforeInstallPromptEvent && !isIframe && !isInAppBrowser && (
                    <p className="text-amber-400">
                      <strong>Limitação do Navegador (iOS/Safari):</strong> Seu dispositivo/navegador não suporta a API de instalação direta em tela. 
                      {isIOS ? (
                        <span> No iPhone/iPad, para instalar, toque no botão <strong>"Compartilhar"</strong> (ícone de seta pra cima no Safari) e depois selecione <strong>"Adicionar à Tela de Início"</strong>.</span>
                      ) : (
                        <span> Use o Google Chrome no Android ou PC para instalação de um clique.</span>
                      )}
                    </p>
                  )}

                  {/* 6. Já instalado */}
                  {swSupported && swController && (displayMode === 'standalone' || installedAppsStatus.includes('Sim')) && (
                    <p className="text-emerald-400 font-medium">
                      O aplicativo já está instalado no seu dispositivo ou rodando em modo Standalone! Verifique sua tela de início ou lista de aplicativos.
                    </p>
                  )}

                  {/* 7. Chrome suporta mas não disparou (Cooldown / Engajamento) */}
                  {swSupported && swController && hasBeforeInstallPromptEvent && !beforeinstallpromptFired && !isIframe && !isInAppBrowser && !installedAppsStatus.includes('Sim') && displayMode !== 'standalone' && (
                    <div className="space-y-1.5">
                      <p className="text-amber-400 font-medium">
                        Requisitos técnicos validados perfeitamente! Por que o Chrome não disparou o prompt?
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[10.5px]">
                        <li>
                          <strong>Supressão por Rejeição (Cooldown):</strong> Se você já clicou em "Cancelar" ou fechou o prompt de instalação anteriormente neste site, o Chrome bloqueia novos disparos temporariamente (cooldown de semanas a meses) para evitar spam.
                        </li>
                        <li>
                          <strong>Falta de Engajamento:</strong> O Chrome exige uma interação real na página (toque na tela, rolagem, cliques) antes de disparar o evento.
                        </li>
                        <li>
                          <strong>Como testar e forçar:</strong> Abra o site em uma <strong>Aba Anônima</strong>, ou limpe totalmente o cache e cookies do site nas configurações do Chrome, depois faça um clique/toque na tela para o Chrome disparar o prompt instantaneamente!
                        </li>
                      </ul>
                    </div>
                  )}

                  {/* 8. Sucesso completo */}
                  {beforeinstallpromptFired && (
                    <p className="text-emerald-400 font-medium">
                      Tudo validado! O botão "Instalar Aplicativo" no topo do painel principal já está ativo. Clique nele para realizar a instalação.
                    </p>
                  )}
                </div>
              </div>

              <button 
                onClick={runDiagnostics}
                className="w-full flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 py-2.5 rounded-xl font-semibold transition-all text-xs outline-none cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Atualizar Diagnósticos
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
