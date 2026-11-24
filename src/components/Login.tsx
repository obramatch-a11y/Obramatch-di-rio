import React, { useState } from 'react';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { Eye, EyeOff } from 'lucide-react';
import ObraMatchSoftPromo from './ObraMatchSoftPromo';
import InstallButton from './InstallButton';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      // Fechar a janela do Google de propósito não é um erro.
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request' || err.code === 'auth/user-cancelled') return;
      console.error(err);
      if (err.code === 'auth/network-request-failed') {
        setError('Sem conexão com a internet. Verifique o sinal e tente de novo.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('O navegador bloqueou a janela do Google. Permita janelas deste site e tente de novo.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.');
      } else {
        setError('Não foi possível entrar com o Google. Tente de novo ou use e-mail e senha.');
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

  const trocarModo = (cadastro: boolean) => { setIsSignUp(cadastro); setError(null); setResetEnviado(false); };

  return (
    <main className="auth-page-v4 app-login-shell">
      <div className="app-login-hero">
        <img src="/icon-512.png" alt="" width="64" height="64" />
        <div><strong>Obra<span>Match</span></strong><small>DIÁRIO</small></div>
      </div>

      <div className="nb-card auth-card-v4">
        <nav className="auth-tabs-v4" aria-label="Entrar ou criar conta">
          <button type="button" aria-current={!isSignUp ? 'page' : undefined} onClick={() => trocarModo(false)}>Entrar</button>
          <button type="button" aria-current={isSignUp ? 'page' : undefined} onClick={() => trocarModo(true)}>Criar conta</button>
        </nav>
        <span className="auth-eyebrow-v4">Área do profissional</span>
        <h2>{isSignUp ? 'Crie sua conta' : 'Bem-vindo!'}</h2>
        <p>{isSignUp ? 'Cadastre-se para registrar RDOs e organizar suas obras.' : 'Entre para registrar RDOs e consultar suas obras.'}</p>

        {error && <div className="auth-feedback-v4 auth-feedback-error-v4" role="alert">{error}</div>}
        {resetEnviado && !error && (
          <div className="auth-feedback-v4" role="status">Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha. Confira sua caixa de entrada e o spam.</div>
        )}

        <button type="button" onClick={handleGoogleLogin} disabled={loading} className="nb-btn nb-btn-ghost auth-google-v4">
          <svg width="18" height="18" aria-hidden="true" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.14-5.136 4.14a5.95 5.95 0 0 1-5.95-5.95a5.95 5.95 0 0 1 5.95-5.95c1.502 0 2.863.56 3.91 1.48l3.123-3.123C18.847 2.844 15.772 1.8 12.24 1.8A10.2 10.2 0 0 0 2.04 12a10.2 10.2 0 0 0 10.2 10.2c5.695 0 9.927-3.9 9.927-9.6a9.55 9.55 0 0 0-.21-2.315H12.24z"
              />
            </svg>
          {isSignUp ? 'Cadastrar com o Google' : 'Entrar com o Google'}
        </button>

        <div className="auth-divider-v4"><span>ou use seu e-mail</span></div>

        <form onSubmit={handleEmailAuth} className="auth-form-v4">
          <div>
            <label htmlFor="login-email">E-mail</label>
            <input id="login-email" type="email" required autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false}
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seuemail@exemplo.com" />
          </div>
          <div>
            <label htmlFor="login-senha">Senha</label>
            <div className="password-field-v4">
              <input id="login-senha" type={mostrarSenha ? 'text' : 'password'} required autoCapitalize="none" spellCheck={false}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isSignUp ? 'Mínimo de 6 caracteres' : 'Digite sua senha'} />
              <button type="button" className="password-toggle-v4" onClick={() => setMostrarSenha((v) => !v)}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={mostrarSenha}>
                {mostrarSenha ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
              </button>
            </div>
          </div>
          {!isSignUp && (
            <div className="auth-link-row-v4">
              <button type="button" onClick={handleEsqueciSenha} disabled={loading}>Esqueceu sua senha?</button>
            </div>
          )}
          <button type="submit" disabled={loading} className="nb-btn nb-btn-primary auth-primary-v4">
            {loading ? 'Aguarde...' : isSignUp ? 'Criar conta' : 'Entrar'}
          </button>
        </form>
      </div>

      <div className="app-login-extra">
        <InstallButton variant="login" className="" />
        <ObraMatchSoftPromo variant="login" />
        <p className="app-login-terms">
          Ao entrar você concorda com os{' '}
          <a href="/termos-de-uso.html" target="_blank" rel="noopener">Termos de Uso</a>{' '}e a{' '}
          <a href="/politica-de-privacidade.html" target="_blank" rel="noopener">Política de Privacidade</a>.
        </p>
      </div>
    </main>
  );
}
