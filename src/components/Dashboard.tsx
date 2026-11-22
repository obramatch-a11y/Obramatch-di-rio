import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useDialog } from './dialog/dialogContext';
import { Obra, LIMITES_PLANO } from '../types';
import {
  Archive, ArchiveRestore, Bot, ChevronDown, ChevronRight, ClipboardList, CloudOff, CreditCard,
  FilePlus2, HardHat, Home, LogOut, Menu, MoreVertical, Search, Settings, Trash2, X,
} from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import PerfilBadge from './PerfilBadge';
import TelegramConnect from './TelegramConnect';
import NovaObraModal from './NovaObraModal';
import PlanoUsoCard from './PlanoUsoCard';
import GravarAgora from './GravarAgora';
import { listarObrasDaEmpresa, type ObraDaEmpresa } from '../lib/central';
import '../styles/campo/app-dashboard-v3.css';
import '../styles/campo/campo-web.css';
import '../styles/campo/rdo-alertas.css';

type FiltroObras = 'ativas' | 'arquivadas' | 'todas';

const formatarDataObra = (data?: string) =>
  data?.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1') || 'Não informada';

export default function Dashboard() {
  const dialog = useDialog();
  const { obras, createObra, deleteObra, arquivarObra, setView, online, user, carregandoObras, limiteObrasAtingido, plano, selectedObra } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroObras, setFiltroObras] = useState<FiltroObras>('ativas');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLimiteModal, setShowLimiteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [contaAberta, setContaAberta] = useState(false);
  const [obraEmAtualizacao, setObraEmAtualizacao] = useState<string | null>(null);
  const [obraEscolhida, setObraEscolhida] = useState(() => {
    try { return localStorage.getItem('om_obra_atual') || ''; } catch { return ''; }
  });

  const [obrasEmpresa, setObrasEmpresa] = useState<ObraDaEmpresa[]>([]);
  const [erroEmpresa, setErroEmpresa] = useState('');
  const [consultandoEmpresa, setConsultandoEmpresa] = useState(false);
  const [tentativaEmpresa, setTentativaEmpresa] = useState(0);
  useEffect(() => {
    if (!user || !online) return;
    const controle = new AbortController();
    setErroEmpresa('');
    setConsultandoEmpresa(true);
    listarObrasDaEmpresa(controle.signal)
      .then((obras) => { setObrasEmpresa(obras); setConsultandoEmpresa(false); })
      .catch((e: unknown) => {
        if (controle.signal.aborted) return;
        setConsultandoEmpresa(false);
        setErroEmpresa(e instanceof Error ? e.message : 'Não foi possível consultar as obras da empresa.');
      });
    return () => controle.abort();
    // uid em vez do objeto user: o objeto pode ser recriado e cancelaria a consulta.
  }, [user?.uid, online, tentativaEmpresa]);
  // Obras da empresa viram "obras" do App para o executante: mesma escolha, mesmo botão de gravar.
  const obrasDaEmpresa: Obra[] = obrasEmpresa
    .filter((o) => o.capabilities?.canRegister !== false)
    .map((o) => ({
      id: `empresa:${o.empresaId}:${o.obraId}`, nome: o.obraNome, cliente: o.empresaNome, endereco: '',
      responsavelTecnico: '', dataInicio: '', observacoes: '', ownerId: user?.uid ?? '', createdAt: null, updatedAt: null,
      empresa: { empresaId: o.empresaId, empresaNome: o.empresaNome, obraId: o.obraId },
    }));

  const nome = user?.email?.split('@')[0] || 'Profissional';
  const obrasAtivas = obras.filter((o) => !o.arquivada);
  const obrasArquivadas = obras.filter((o) => o.arquivada);
  const obrasParaRdo = [...obrasAtivas, ...obrasDaEmpresa];
  const obraAtual: Obra | undefined = obrasParaRdo.length === 1
    ? obrasParaRdo[0]
    : obrasParaRdo.find((o) => o.id === (obraEscolhida || selectedObra?.id));

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuAberto(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  const escolher = (id: string) => {
    setObraEscolhida(id);
    try { localStorage.setItem('om_obra_atual', id); } catch { /* sem armazenamento */ }
  };

  const sair = async () => {
    setMenuAberto(false);
    // Limpa resíduo de cache antigo do navegador para nunca reaparecerem obras já apagadas.
    try {
      const bancos = await (indexedDB as any).databases?.();
      if (bancos) for (const b of bancos) if (b.name && b.name.includes('firestore')) indexedDB.deleteDatabase(b.name);
    } catch { /* navegador sem suporte */ }
    await signOut(auth);
  };

  const criarObra = async (data: {
    nome: string; cliente: string; responsavelTecnico: string; endereco: string;
    gps: { latitude: number; longitude: number } | null; dataInicio: string; observacoes: string;
  }) => {
    setLoading(true);
    try {
      await createObra({ nome: data.nome, cliente: data.cliente, endereco: data.endereco, responsavelTecnico: data.responsavelTecnico, dataInicio: data.dataInicio, observacoes: data.observacoes, gps: data.gps });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const novaObra = () => (limiteObrasAtingido ? setShowLimiteModal(true) : setShowAddModal(true));

  const abrirObra = (obra: Obra) => {
    if ((obra as any).lockedByPlan) {
      void dialog.alert('Esta obra está bloqueada pelo limite do plano Free. Renove o Plano Pro para desbloqueá-la ou exclua-a pelo menu da obra.', 'Obra bloqueada');
      return;
    }
    setView('obra-dashboard', obra);
  };

  const alternarArquivada = async (event: React.MouseEvent, obra: Obra) => {
    event.stopPropagation();
    if (obraEmAtualizacao) return;
    const arquivar = !obra.arquivada;
    const ok = await dialog.confirm({
      title: arquivar ? 'Arquivar obra?' : 'Reativar obra?',
      message: arquivar
        ? `Arquivar a obra “${obra.nome}”? Os RDOs, fotos e PDFs serão preservados, mas novos registros ficam bloqueados até a reativação.`
        : `Reativar a obra “${obra.nome}”? Ela voltará a permitir novos RDOs e edições.`,
      confirmLabel: arquivar ? 'Arquivar' : 'Reativar',
    });
    if (!ok) return;
    setObraEmAtualizacao(obra.id);
    try { await arquivarObra(obra.id, arquivar); } catch (e) { console.error(e); } finally { setObraEmAtualizacao(null); }
  };

  const excluir = async (event: React.MouseEvent, obra: Obra) => {
    event.stopPropagation();
    if (obraEmAtualizacao) return;
    const ok = await dialog.confirmTyping({
      title: 'Excluir obra definitivamente?',
      message: `Todos os RDOs e fotos da obra “${obra.nome}” serão apagados. Esta ação não poderá ser desfeita.`,
      expected: obra.nome, confirmLabel: 'Excluir obra', danger: true,
    });
    if (!ok) return;
    setObraEmAtualizacao(obra.id);
    try { await deleteObra(obra.id); } catch (e) { console.error(e); } finally { setObraEmAtualizacao(null); }
  };

  const lista = obras.filter((o) => {
    const status = filtroObras === 'todas' || (filtroObras === 'ativas' ? !o.arquivada : Boolean(o.arquivada));
    const termo = searchTerm.trim().toLowerCase();
    return status && (!termo || o.nome.toLowerCase().includes(termo) || (o.cliente || '').toLowerCase().includes(termo));
  });

  const abrirManual = () => { if (obraAtual) setView('diario-form', obraAtual, null); };
  const irParaObras = () => document.getElementById('campo-obras')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="app-shell">
      <header className="app-shell-header">
        <div className="app-shell-header-inner">
          <button type="button" className="app-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="ObraMatch Diário, ir para minhas obras">
            <span className="app-brand-mark" aria-hidden="true"><HardHat size={22} /></span>
            <span>ObraMatch <strong>Diário</strong></span>
          </button>
          <div className="app-shell-user app-desktop-actions">
            <span><small>Conta conectada</small><strong>{nome}</strong></span>
            <button type="button" onClick={sair}><LogOut size={18} /> Sair</button>
          </div>
          <button type="button" className="app-mobile-menu" aria-label="Abrir menu" aria-expanded={menuAberto} onClick={() => setMenuAberto(true)}>
            <Menu size={25} />
          </button>
        </div>
      </header>

      {menuAberto && (
        <div className="app-drawer-backdrop" onClick={() => setMenuAberto(false)}>
          <aside className="app-drawer" role="dialog" aria-modal="true" aria-label="Menu do aplicativo" onClick={(e) => e.stopPropagation()}>
            <div className="app-drawer-heading">
              <span><small>Conta conectada</small><strong>{nome}</strong></span>
              <button type="button" aria-label="Fechar menu" onClick={() => setMenuAberto(false)}><X size={22} /></button>
            </div>
            <nav>
              <button type="button" onClick={() => { setMenuAberto(false); irParaObras(); }}><HardHat size={20} /> Minhas obras</button>
              <button type="button" onClick={() => { setMenuAberto(false); window.open('/planos.html', '_blank', 'noopener'); }}><CreditCard size={20} /> Plano e assinatura</button>
              <button type="button" onClick={() => { setMenuAberto(false); setContaAberta(true); setTimeout(() => document.getElementById('conta-limites')?.scrollIntoView({ behavior: 'smooth' }), 50); }}><Settings size={20} /> Conta e limites</button>
              <button type="button" onClick={() => { setMenuAberto(false); setContaAberta(true); }}><Bot size={20} /> Assistente Telegram</button>
            </nav>
            <button type="button" className="app-drawer-logout" onClick={sair}><LogOut size={20} /> Sair</button>
          </aside>
        </div>
      )}

      <main className="app-dashboard campo-web-dashboard" id="campo-inicio">
        <section className="app-dashboard-intro">
          <div>
            <div className="campo-web-welcome">
              <div>
                <h1>ObraMatch Campo</h1>
                <p>Registre por áudio e revise o RDO antes de salvar.</p>
              </div>
              <img className="campo-web-mascot" src="/img/campo-web-mascote.webp" width="320" height="320" alt="" />
            </div>

            <p role="status" className="campo-web-escolher-obra" style={{ margin: '8px 0 0' }}>
              {consultandoEmpresa ? 'Consultando obras da empresa…'
                : erroEmpresa ? erroEmpresa
                : obrasEmpresa.length > 0 ? `Obras da empresa: ${obrasEmpresa.length}`
                : 'Nenhuma obra de empresa atribuída a esta conta.'}{' '}
              {!consultandoEmpresa && online && <button type="button" onClick={() => setTentativaEmpresa((n) => n + 1)} style={{ textDecoration: 'underline', fontWeight: 700 }}>Atualizar</button>}
            </p>

            {!online && (
              <p role="status" className="campo-web-escolher-obra"><CloudOff size={16} aria-hidden="true" /> Sem internet. Os registros aguardam a conexão voltar.</p>
            )}

            {!carregandoObras && obrasParaRdo.length === 0 && (
              <section className="campo-web-start-guide" aria-labelledby="campo-guia-titulo">
                <h2 id="campo-guia-titulo">Por onde começar?</h2>
                <ul>
                  <li>
                    <strong>Cadastre sua primeira obra</strong>
                    <span>Depois é só tocar em gravar e falar o que foi feito no dia. O App organiza o relatório e você confere antes de salvar.</span>
                    <button type="button" onClick={novaObra}>Cadastrar minha obra</button>
                  </li>
                </ul>
              </section>
            )}

            {!carregandoObras && obrasParaRdo.length > 0 && (
              <form className="campo-web-entry" onSubmit={(e) => { e.preventDefault(); abrirManual(); }}>
                {obrasParaRdo.length === 1 && obraAtual && (
                  <p className="campo-web-current">
                    <HardHat size={22} aria-hidden="true" />
                    <span><small>Obra atual</small><strong>{obraAtual.nome}</strong>{obraAtual.empresa && <small>Empresa · {obraAtual.empresa.empresaNome}</small>}</span>
                  </p>
                )}
                {obrasParaRdo.length > 1 && (
                  <label htmlFor="campo-web-obra">Obra atual
                    <select id="campo-web-obra" value={obraAtual?.id ?? ''} onChange={(e) => escolher(e.target.value)} required>
                      <option value="">Selecione a obra</option>
                      {obrasAtivas.length > 0 && <optgroup label="Minhas obras">{obrasAtivas.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}</optgroup>}
                      {obrasDaEmpresa.length > 0 && <optgroup label="Obras da empresa">{obrasDaEmpresa.map((o) => <option key={o.id} value={o.id}>{o.nome} · {o.empresa?.empresaNome}</option>)}</optgroup>}
                    </select>
                  </label>
                )}
                {!obraAtual && <p className="campo-web-escolher-obra">Escolha a obra para começar a gravação.</p>}
                <div className="campo-web-actions">
                  <GravarAgora disabled={!obraAtual} onGravar={() => obraAtual && setView('diario-form', obraAtual, null)} />
                  <button type="submit" className="campo-web-manual" disabled={!obraAtual}>
                    <FilePlus2 size={19} aria-hidden="true" /> Escrever RDO
                  </button>
                </div>
                <div className="campo-web-shortcuts" role="group" aria-label="Relatórios">
                  <button type="button" disabled={!obraAtual || Boolean(obraAtual.empresa)} onClick={() => obraAtual && setView('obra-dashboard', obraAtual)}>
                    <ClipboardList size={22} aria-hidden="true" /> Meus relatórios
                  </button>
                </div>
              </form>
            )}
          </div>
          <div className="app-dashboard-summary" aria-label="Resumo das obras">
            <span><strong>{carregandoObras ? '—' : obrasAtivas.length}</strong><small>ativas</small></span>
            <span><strong>{carregandoObras ? '—' : obrasArquivadas.length}</strong><small>arquivadas</small></span>
          </div>
        </section>

        <div className="app-dashboard-grid">
          <section className="app-works-panel" id="campo-obras" aria-labelledby="works-title">
            <div className="app-works-heading">
              <div><span className="app-section-label">Canteiros</span><h2 id="works-title">Minhas obras</h2></div>
              <button type="button" className="campo-web-manual" onClick={novaObra}>Nova obra</button>
            </div>
            {limiteObrasAtingido && filtroObras !== 'arquivadas' && (
              <p className="campo-web-escolher-obra">Limite de obras ativas do plano atingido. Arquive uma obra concluída para liberar espaço.</p>
            )}
            <div className="app-search-field">
              <Search size={20} aria-hidden="true" />
              <input type="search" placeholder="Pesquisar obra..." aria-label="Pesquisar obra" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="app-filter-chips" aria-label="Filtrar obras">
              {([['ativas', `Ativas ${obrasAtivas.length}`], ['arquivadas', `Arquivadas ${obrasArquivadas.length}`], ['todas', `Todas ${obras.length}`]] as [FiltroObras, string][]).map(([v, l]) => (
                <button key={v} type="button" className={filtroObras === v ? 'is-active' : ''} aria-pressed={filtroObras === v} onClick={() => setFiltroObras(v)}>{l}</button>
              ))}
            </div>

            {obrasDaEmpresa.length > 0 && filtroObras !== 'arquivadas' && (
              <section aria-labelledby="obras-empresa-titulo">
                <div className="app-works-heading"><h3 id="obras-empresa-titulo">Obras da empresa</h3></div>
                <div className="app-works-list">
                  {obrasDaEmpresa.map((o) => (
                    <article key={o.id} className="app-work-card" onClick={() => { escolher(o.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ cursor: 'pointer' }}>
                      <span className="app-work-icon" aria-hidden="true"><HardHat size={21} /></span>
                      <div className="app-work-copy">
                        <div className="app-work-title"><h3>{o.nome}</h3></div>
                        <div className="app-work-meta"><span><small>Empresa</small><strong>{o.empresa?.empresaNome}</strong></span></div>
                      </div>
                      <button type="button" className="campo-web-open" aria-label={`Usar obra ${o.nome}`}><ChevronRight size={22} aria-hidden="true" /></button>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {carregandoObras ? (
              <div className="app-empty-state" role="status">Carregando obras...</div>
            ) : lista.length === 0 ? (
              <div className="app-empty-state app-empty-bordered"><HardHat size={42} /><h3>Nenhuma obra aqui</h3><p>{searchTerm ? 'Nenhuma obra corresponde à busca.' : 'Cadastre uma obra para começar.'}</p></div>
            ) : (
              <div className="app-works-list">
                {lista.map((obra) => {
                  const atualizando = obraEmAtualizacao === obra.id;
                  return (
                    <article key={obra.id} className={`app-work-card ${obra.arquivada ? 'is-archived' : ''}`} onClick={() => abrirObra(obra)} style={{ opacity: atualizando ? 0.65 : 1, cursor: 'pointer' }}>
                      <span className="app-work-icon" aria-hidden="true"><HardHat size={21} /></span>
                      <div className="app-work-copy">
                        <div className="app-work-title">
                          <h3>{obra.nome}</h3>
                          <span className={obra.arquivada ? 'is-muted' : 'is-active'}>{obra.arquivada ? 'Arquivada' : 'Ativa'}</span>
                        </div>
                        <div className="app-work-meta"><span><small>Cliente</small><strong>{obra.cliente || 'Não informado'}</strong></span><span><small>Início</small><strong>{formatarDataObra(obra.dataInicio)}</strong></span></div>
                      </div>
                      <div className="app-work-actions">
                        <details onClick={(e) => e.stopPropagation()}>
                          <summary aria-label={`Mais opções para ${obra.nome}`}><MoreVertical size={20} /></summary>
                          <div>
                            <button type="button" onClick={(e) => alternarArquivada(e, obra)} disabled={Boolean(obraEmAtualizacao)}>
                              {obra.arquivada ? <ArchiveRestore size={17} /> : <Archive size={17} />}{obra.arquivada ? 'Reativar obra' : 'Arquivar obra'}
                            </button>
                            <button type="button" className="danger" onClick={(e) => excluir(e, obra)} disabled={Boolean(obraEmAtualizacao)}><Trash2 size={17} /> Excluir obra</button>
                          </div>
                        </details>
                        <button type="button" className="campo-web-open" aria-label={`Abrir obra ${obra.nome}`} onClick={(e) => { e.stopPropagation(); abrirObra(obra); }}>
                          <ChevronRight size={22} aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <section id="conta-limites" className={`app-mobile-account ${contaAberta ? 'is-open' : ''}`}>
          <button type="button" aria-expanded={contaAberta} onClick={() => setContaAberta((o) => !o)}>
            <span className="app-mobile-account-icon"><Settings size={20} /></span>
            <span><strong>Conta e limites</strong><small>Plano {plano.plano.toUpperCase()}, IA, Telegram e perfil.</small></span>
            <ChevronDown size={20} />
          </button>
          {contaAberta && (
            <div className="app-mobile-account-content" style={{ display: 'grid', gap: 12 }}>
              <PlanoUsoCard />
              <PerfilBadge />
              <TelegramConnect />
            </div>
          )}
        </section>

        <footer style={{ padding: '16px 0 84px', textAlign: 'center', fontSize: 11, color: '#777' }}>
          <a href="/termos-de-uso.html" target="_blank" rel="noopener">Termos</a> · <a href="/politica-de-privacidade.html" target="_blank" rel="noopener">Privacidade</a> · <a href="/politica-de-ia.html" target="_blank" rel="noopener">IA</a> · <a href="/excluir-conta.html" target="_blank" rel="noopener">Excluir conta</a>
        </footer>
      </main>

      <nav className="campo-web-bottom" aria-label="Navegação do Campo">
        <a href="#campo-inicio"><Home size={21} aria-hidden="true" /> Início</a>
        <a href="#campo-obras"><HardHat size={21} aria-hidden="true" /> Obras</a>
        <button type="button" disabled={!obraAtual} onClick={() => obraAtual && setView('obra-dashboard', obraAtual)}><ClipboardList size={21} aria-hidden="true" /> Relatórios</button>
        <button type="button" aria-expanded={menuAberto} onClick={() => setMenuAberto(true)}><MoreVertical size={21} aria-hidden="true" /> Mais</button>
      </nav>

      <NovaObraModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={criarObra} loading={loading} />

      {showLimiteModal && (
        <div className="app-drawer-backdrop" onClick={() => setShowLimiteModal(false)}>
          <aside className="app-drawer" role="dialog" aria-modal="true" aria-label="Limite de obras" onClick={(e) => e.stopPropagation()} style={{ padding: 20, display: 'grid', gap: 12, alignContent: 'start' }}>
            <h2 style={{ margin: 0 }}>Limite de obras atingido</h2>
            <p>O plano {plano.plano === 'pro' ? 'PRO' : 'Gratuito'} permite {LIMITES_PLANO[plano.plano].obrasAtivas} obras ativas ao mesmo tempo. Para criar outra, <strong>arquive uma obra concluída</strong>. Nenhum dado é perdido.</p>
            <button type="button" className="campo-web-manual" onClick={() => { setShowLimiteModal(false); setFiltroObras('ativas'); irParaObras(); }}>Entendi, vou arquivar uma</button>
            <button type="button" onClick={() => setShowLimiteModal(false)}>Fechar</button>
          </aside>
        </div>
      )}
    </div>
  );
}
