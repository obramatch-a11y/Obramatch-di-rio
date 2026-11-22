import React from 'react';

interface Estado { erro: Error | null }

// Rede de segurança: se alguma tela falhar, mostra um aviso com saída em vez de tela branca.
export default class LimiteDeErro extends React.Component<{ children: React.ReactNode }, Estado> {
  state: Estado = { erro: null };
  static getDerivedStateFromError(erro: Error): Estado { return { erro }; }
  componentDidCatch(erro: Error) { console.error('Falha de tela:', erro); }
  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div role="alert" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f5f7fb', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ maxWidth: 360 }}>
          <h1 style={{ color: '#0a3d91', fontSize: 22 }}>Algo deu errado nesta tela</h1>
          <p style={{ color: '#3f4859', lineHeight: 1.5 }}>Seu relatório não foi enviado. Toque abaixo para voltar e tentar de novo.</p>
          <button type="button" onClick={() => this.setState({ erro: null })} style={{ width: '100%', minHeight: 52, border: 0, borderRadius: 14, background: '#ff6f00', color: '#fff', fontWeight: 800, fontSize: 16 }}>Tentar de novo</button>
          <button type="button" onClick={() => window.location.reload()} style={{ width: '100%', minHeight: 48, marginTop: 10, border: '1px solid #cbd4e2', borderRadius: 14, background: '#fff', color: '#0a3d91', fontWeight: 800 }}>Recarregar o aplicativo</button>
          <p style={{ color: '#8a93a3', fontSize: 11, marginTop: 14, overflowWrap: 'anywhere' }}>{String(this.state.erro.message || '').slice(0, 160)}</p>
        </div>
      </div>
    );
  }
}
