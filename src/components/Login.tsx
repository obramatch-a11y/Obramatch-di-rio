import React, { useState, useEffect } from 'react';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { motion } from 'motion/react';
import { Construction, Mail, Lock, LogIn, UserPlus, AlertTriangle } from 'lucide-react';
import ObraMatchSoftPromo from './ObraMatchSoftPromo';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installStatus, setInstallStatus] = useState<string | null>(null);

  useEffect(() => {
    // Check if prompt was already captured globally
    const checkWindowPWAProperties = () => {
      const hasPrompt = (window as any).__deferredPrompt;
      if (hasPrompt) {
        setDeferredPrompt(hasPrompt);
      }
    };

    checkWindowPWAProperties();

    // Listen for custom global event from main.tsx
    const handleGlobalPrompt = (e: any) => {
      setDeferredPrompt(e.detail || (window as any).__deferredPrompt);
    };

    window.addEventListener('beforeinstallprompt_global_received', handleGlobalPrompt as any);

    // Standard local listener as fallback
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__deferredPrompt = e;
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Periodic check to keep in sync
    const interval = setInterval(() => {
      checkWindowPWAProperties();
    }, 1500);

    return () => {
      window.removeEventListener('beforeinstallprompt_global_received', handleGlobalPrompt as any);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearInterval(interval);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    setInstallStatus(null);
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        (window as any).__deferredPrompt = null;
        setInstallStatus('Instalando aplicativo...');
      } else {
        setInstallStatus('Instalação cancelada pelo usuário.');
      }
    } catch (err) {
      console.error(err);
      setInstallStatus('Ocorreu um erro ao abrir o instalador.');
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
        setError('Erro de conexão com o Firebase. Abra o aplicativo em uma nova guia se estiver no visualizador do AI Studio.');
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
        setError('Erro de rede ou conexão rejeitada pelo Firebase. Garanta que o método E-mail/Senha esteja ativo no console.');
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

          {/* PWA Installation Button - only visible when deferredPrompt exists */}
          {deferredPrompt && (
            <div className="mt-6 pt-6 border-t border-slate-800/60">
              <button
                onClick={handleInstallClick}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-extrabold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-amber-500/15 text-sm"
              >
                <Construction className="w-5 h-5 animate-bounce" />
                Instalar Aplicativo
              </button>

              {installStatus && (
                <p className="text-xs text-amber-400 font-medium text-center mt-2.5">
                  {installStatus}
                </p>
              )}
            </div>
          )}

          <div className="text-center mt-8">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-amber-400 hover:text-amber-300 text-sm font-semibold transition-all"
            >
              {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Cadastre-se agora'}
            </button>
          </div>
        </motion.div>

        {/* Ecosystem promo block required by step 3 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full"
        >
          <ObraMatchSoftPromo variant="login" />
        </motion.div>
      </div>
    </div>

  );
}
