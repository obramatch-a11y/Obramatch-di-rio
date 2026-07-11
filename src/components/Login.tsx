import React, { useState } from 'react';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { motion } from 'motion/react';
import { Construction, Mail, Lock, LogIn, UserPlus, AlertTriangle } from 'lucide-react';
import ObraMatchSoftPromo from './ObraMatchSoftPromo';
import InstallButton from './InstallButton';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está sendo utilizado. Toque em "Entre aqui" para acessar sua conta.');
      } else if (err.code === 'auth/invalid-email') {
        setError('E-mail inválido. Confira se digitou corretamente.');
      } else if (err.code === 'auth/weak-password') {
        setError('Senha muito fraca. Use pelo menos 6 caracteres.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Cadastro por e-mail e senha indisponível no momento. Use o botão "Entrar com Google".');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Sem conexão com o servidor. Verifique sua internet e tente de novo.');
      } else {
        setError('Ocorreu um erro inesperado. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const [resetEnviado, setResetEnviado] = useState(false);

  const handleEsqueciSenha = async () => {
    setError(null);
    setResetEnviado(false);
    if (!email) {
      setError('Digite seu e-mail no campo acima e toque em "Esqueci minha senha" de novo.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetEnviado(true);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-email') {
        setError('E-mail inválido. Confira se digitou corretamente.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.');
      } else {
        // Por segurança o Firebase não confirma se o e-mail existe; mostramos sucesso genérico.
        setResetEnviado(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F4F4] p-4 relative overflow-hidden">
      <div className="w-full max-w-md flex flex-col gap-4 relative z-10 my-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full nb-card nb-shadow p-7"
        >
          <div className="flex flex-col items-center mb-7">
            <div className="w-16 h-16 bg-[#0A3D91] border-2 border-black rounded-xl nb-shadow-sm flex items-center justify-center mb-4">
              <Construction className="w-8 h-8 text-[#FFB347] stroke-[2.5]" />
            </div>
            <h1 className="text-3xl font-display font-black tracking-tight text-[#111] text-center">
              Obra<span className="text-[#FF6F00]">Match</span> <span className="text-[#0A3D91]">Diário</span>
            </h1>
            <p className="text-neutral-600 text-sm mt-1 font-medium">Diário de Obra Profissional</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3 bg-white border-2 border-black border-l-4 border-l-red-600 rounded-lg flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <span className="text-[#111] text-sm">{error}</span>
            </motion.div>
          )}

          {resetEnviado && !error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3 bg-white border-2 border-black border-l-4 border-l-emerald-600 rounded-lg"
            >
              <span className="text-[#111] text-sm">
                Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha. Confira sua caixa de entrada e o spam.
              </span>
            </motion.div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-display font-extrabold text-[#111] uppercase tracking-wider mb-2">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-[#0A3D91]" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@obramatch.com"
                  className="nb-input w-full pl-12 pr-4 py-3.5 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-senha" className="block text-xs font-display font-extrabold text-[#111] uppercase tracking-wider mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-[#0A3D91]" />
                <input
                  id="login-senha"
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha secreta"
                  className="nb-input w-full pl-12 pr-4 py-3.5 text-sm"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="nb-btn nb-btn-primary w-full py-3.5 px-4 flex items-center justify-center gap-2 mt-6 text-sm"
            >
              {isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
              {loading ? 'Aguarde...' : isSignUp ? 'Criar conta' : 'Entrar'}
            </button>
          </form>

          {!isSignUp && (
            <div className="text-right mt-3">
              <button
                type="button"
                onClick={handleEsqueciSenha}
                disabled={loading}
                className="text-[#0A3D91] hover:text-[#2E6DEB] text-xs font-display font-extrabold transition-colors cursor-pointer"
              >
                Esqueci minha senha
              </button>
            </div>
          )}

          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-[#D1D1D1]"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-neutral-500 font-semibold">Ou continuar com</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="nb-btn nb-btn-ghost w-full py-3.5 px-4 flex items-center justify-center gap-3 text-sm"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.14-5.136 4.14a5.95 5.95 0 0 1-5.95-5.95a5.95 5.95 0 0 1 5.95-5.95c1.502 0 2.863.56 3.91 1.48l3.123-3.123C18.847 2.844 15.772 1.8 12.24 1.8A10.2 10.2 0 0 0 2.04 12a10.2 10.2 0 0 0 10.2 10.2c5.695 0 9.927-3.9 9.927-9.6a9.55 9.55 0 0 0-.21-2.315H12.24z"
              />
            </svg>
            Entrar com Google
          </button>

          {/* PWA Installation Button - only visible when installable */}
          <InstallButton variant="login" className="mt-6 pt-6 border-t-2 border-[#D1D1D1]" />

          <div className="text-center mt-7">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[#0A3D91] hover:text-[#2E6DEB] text-sm font-display font-extrabold transition-colors cursor-pointer"
            >
              {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Cadastre-se agora'}
            </button>
          </div>
        </motion.div>

        {/* Bloco promocional único da tela de login: institucional ObraMatch */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full"
        >
          <ObraMatchSoftPromo variant="login" />
        </motion.div>

        <p className="text-center text-[10px] text-neutral-500 mt-2">
          Ao entrar você concorda com os{' '}
          <a href="/termos-de-uso.html" target="_blank" rel="noopener" className="underline font-semibold text-[#0A3D91]">Termos de Uso</a>{' '}e a{' '}
          <a href="/politica-de-privacidade.html" target="_blank" rel="noopener" className="underline font-semibold text-[#0A3D91]">Política de Privacidade</a>.
        </p>
      </div>
    </div>
  );
}
