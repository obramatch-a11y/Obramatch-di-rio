import { comprimirFoto } from '../lib/comprimirFoto';
import { useEffect, useState } from 'react';
import { ArrowLeft, Camera, CheckCircle2, ClipboardList, Loader2, Undo2 } from 'lucide-react';
import { auth } from '../firebase';
import { useApp } from '../context/AppContext';
import { corrigirDiarioDeOrigem, localizarDiarioDeOrigem } from '../lib/origemDiario';
import {
  aceitarRdoDaCentral, detalharRdoDaCentral, devolverRdoDaCentral, fotoRdoDaCentral, listarRdosDaCentral,
  marcarAvisoComoLido, reenviarRdoDaCentral, reenviarRdoDoDiario,
  type DetalheRdoCentral, type RdoDaCentral, type RdoParaCentral,
} from '../lib/central';
import type { Obra } from '../types';

const ROTULO_STATUS: Record<string, string> = {
  submitted: 'Aguardando revisão',
  needs_correction: 'Devolvido para correção',
  resubmitted: 'Reenviado',
  accepted: 'Aceito',
  accepted_documentally: 'Aceito',
  document_accepted: 'Aceito',
  finalized: 'Finalizado',
};
const rotulo = (status: string) => ROTULO_STATUS[status] || 'Em andamento';
const tom = (status: string) => (status === 'needs_correction' ? 'aviso' : status.startsWith('accepted') || status === 'finalized' ? 'ok' : 'info');
const dataDoRdo = (r: { data?: string; submittedAt?: string }) => (r.data || r.submittedAt || '').slice(0, 10);

const formatarData = (v?: string) => (v ? v.replace(/^(\d{4})-(\d{2})-(\d{2}).*$/, '$3/$2/$1') : 'Sem data');
const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

const SECOES: [string, string][] = [
  ['atividades', 'Atividades'], ['equipe', 'Equipe'], ['materiais', 'Materiais'],
  ['ocorrencias', 'Ocorrências'], ['observacoes', 'Observações'],
];

export default function RelatoriosEmpresa({ obra, rdoInicial, onVoltar }: { obra: Obra; rdoInicial?: string; onVoltar: () => void }) {
  const empresa = obra.empresa!;
  const [rdos, setRdos] = useState<RdoDaCentral[] | null>(null);
  const [erro, setErro] = useState('');
  const [aberto, setAberto] = useState<string | null>(rdoInicial ?? null);
  const [editando, setEditando] = useState<Record<string, string> | null>(null);
  const [motivo, setMotivo] = useState('');
  const [decidindo, setDecidindo] = useState<'' | 'devolver' | 'aceitar'>('');
  const [processando, setProcessando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const meuUid = auth.currentUser?.uid ?? '';
  const { obras: minhasObras } = useApp();
  const [detalhe, setDetalhe] = useState<DetalheRdoCentral | null>(null);
  const [erroDetalhe, setErroDetalhe] = useState('');
  const [fotos, setFotos] = useState<Record<string, string>>({});
  // Fotos do relatório em correção: as já enviadas + as novas (a Central recebe a lista completa).
  const [fotosEdicao, setFotosEdicao] = useState<{ url: string; legenda: string }[] | null>(null);
  const [erroFotos, setErroFotos] = useState('');
  const [preparandoFotos, setPreparandoFotos] = useState(false);
  const [carregandoFotos, setCarregandoFotos] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    const c = new AbortController();
    setRdos(null); setErro('');
    listarRdosDaCentral(empresa.empresaId, empresa.obraId, c.signal)
      .then((lista) => setRdos([...lista].sort((a, b) => String(b.data || b.submittedAt).localeCompare(String(a.data || a.submittedAt)))))
      .catch((e: unknown) => { if (!c.signal.aborted) setErro(e instanceof Error ? e.message : 'Não foi possível carregar os relatórios.'); });
    return () => c.abort();
  }, [empresa.empresaId, empresa.obraId, tentativa]);

  useEffect(() => {
    if (!aberto) return;
    const c = new AbortController();
    setDetalhe(null); setErroDetalhe(''); setFotos({});
    setEditando(null); setDecidindo(''); setMotivo(''); setMensagem('');
    detalharRdoDaCentral(empresa.empresaId, empresa.obraId, aberto, c.signal)
      .then((d) => {
        setDetalhe(d);
        // Melhor esforço: o aviso deixa de aparecer como "novo".
        const status = d.rdo.status;
        if (status === 'needs_correction' && d.rdo.submittedBy === meuUid) void marcarAvisoComoLido(empresa.empresaId, obra.empresa!.obraId, d.rdo.id, d.version, 'needs_correction').catch(() => {});
        if (status === 'submitted' && empresa.podeRevisar && d.rdo.submittedBy !== meuUid) void marcarAvisoComoLido(empresa.empresaId, obra.empresa!.obraId, d.rdo.id, d.version, 'submitted').catch(() => {});
      })
      .catch((e: unknown) => { if (!c.signal.aborted) setErroDetalhe(e instanceof Error ? e.message : 'Não foi possível abrir o relatório.'); });
    return () => c.abort();
  }, [aberto, empresa.empresaId, empresa.obraId]);

  const carregarFotos = async () => {
    if (!detalhe || !aberto) return;
    setCarregandoFotos(true);
    try {
      for (const f of detalhe.photos) {
        if (fotos[f.id]) continue;
        const url = await fotoRdoDaCentral(empresa.empresaId, empresa.obraId, aberto, f.id, detalhe.version);
        setFotos((atual) => ({ ...atual, [f.id]: url }));
      }
    } catch (e) {
      setErroDetalhe(e instanceof Error ? e.message : 'Não foi possível carregar as fotos.');
    } finally { setCarregandoFotos(false); }
  };

  const voltar = () => { if (aberto) { setAberto(null); if (rdoInicial) onVoltar(); } else onVoltar(); };

  const concluir = async (acao: () => Promise<unknown>, textoOk: string) => {
    setProcessando(true); setErroDetalhe(''); setMensagem('');
    try {
      await acao();
      setMensagem(textoOk);
      setAberto(null); setEditando(null); setDecidindo(''); setMotivo('');
      setTentativa((n) => n + 1);
    } catch (e) {
      setErroDetalhe(e instanceof Error ? e.message : 'Não foi possível concluir.');
    } finally { setProcessando(false); }
  };

  const iniciarCorrecao = async () => {
    if (!detalhe) return;
    setErroFotos(''); setFotosEdicao(null);
    if (detalhe.rdo.sourceType === 'campo') {
      setPreparandoFotos(true);
      try {
        const lista: { url: string; legenda: string }[] = [];
        for (const f of detalhe.photos) {
          const url = fotos[f.id] || await fotoRdoDaCentral(empresa.empresaId, empresa.obraId, detalhe.rdo.id, f.id, detalhe.version);
          lista.push({ url, legenda: f.legenda || '' });
        }
        setFotosEdicao(lista);
      } catch (e) {
        setErroFotos(e instanceof Error ? e.message : 'Não foi possível carregar as fotos atuais.');
      } finally { setPreparandoFotos(false); }
    }
    const g = (k: string) => (typeof detalhe.snapshot[k] === 'string' ? (detalhe.snapshot[k] as string) : '');
    setEditando({ atividades: g('atividades'), equipe: g('equipe'), materiais: g('materiais'), ocorrencias: g('ocorrencias'), observacoes: g('observacoes') });
  };

  const adicionarFotosCorrecao = async (event: import('react').ChangeEvent<HTMLInputElement>) => {
    const arquivos = Array.from(event.target.files ?? []) as File[];
    event.target.value = '';
    if (arquivos.length === 0 || !fotosEdicao) return;
    setErroFotos(''); setPreparandoFotos(true);
    try {
      const novas: { url: string; legenda: string }[] = [];
      for (const arq of arquivos.slice(0, Math.max(0, 10 - fotosEdicao.length))) novas.push({ url: await comprimirFoto(arq), legenda: '' });
      if (arquivos.length > novas.length) setErroFotos('O relatório aceita até 10 fotos.');
      setFotosEdicao((atual) => [...(atual ?? []), ...novas]);
    } catch (e) {
      setErroFotos(e instanceof Error ? e.message : 'Não foi possível preparar a foto.');
    } finally { setPreparandoFotos(false); }
  };

  const reenviar = () => {
    if (!detalhe || !editando) return;
    const g = (k: string) => (typeof detalhe.snapshot[k] === 'string' ? (detalhe.snapshot[k] as string) : '');
    const relatorio: RdoParaCentral = {
      data: g('data') || detalhe.rdo.data || '', horario: g('horario'), clima: g('clima'),
      condicaoTrabalho: g('condicaoTrabalho') || undefined, assinatura: g('assinatura') || undefined,
      gps: (detalhe.snapshot.gps as RdoParaCentral['gps']) ?? null,
      equipe: editando.equipe, atividades: editando.atividades, materiais: editando.materiais,
      ocorrencias: editando.ocorrencias, observacoes: editando.observacoes,
    };
    if (detalhe.rdo.sourceType === 'campo') {
      void concluir(() => reenviarRdoDaCentral(empresa.empresaId, empresa.obraId, detalhe.rdo.id, detalhe.version, relatorio, fotosEdicao ?? undefined), 'Relatório corrigido e reenviado para a revisão.');
      return;
    }
    // Enviado do Diário pessoal: corrige o RDO original e reenvia a nova versão.
    void concluir(async () => {
      const origem = await localizarDiarioDeOrigem(meuUid, minhasObras, typeof detalhe.snapshot.hashIntegridadeOrigem === 'string' ? detalhe.snapshot.hashIntegridadeOrigem : '');
      if (!origem) throw new Error('Não encontrei o RDO original no Diário desta conta. Abra o Diário onde ele foi criado para corrigir.');
      await corrigirDiarioDeOrigem(origem, {
        atividades: editando.atividades, equipe: editando.equipe, materiais: editando.materiais,
        ocorrencias: editando.ocorrencias, observacoes: editando.observacoes,
      });
      await reenviarRdoDoDiario(empresa.empresaId, empresa.obraId, detalhe.rdo.id);
    }, 'Relatório corrigido e reenviado para a revisão.');
  };

  return (
    <div className="app-shell">
      <header className="app-shell-header">
        <div className="app-shell-header-inner">
          <button type="button" className="app-brand" onClick={voltar} aria-label="Voltar">
            <span className="app-brand-mark" aria-hidden="true"><ArrowLeft size={22} /></span>
            <span>{aberto ? 'Relatório' : 'Relatórios'} <strong>{obra.nome}</strong></span>
          </button>
        </div>
      </header>
      <main className="app-dashboard campo-web-dashboard" style={{ paddingBottom: 90 }}>
        <p className="campo-web-escolher-obra">Empresa · {empresa.empresaNome}</p>
        {mensagem && <p role="status" className="campo-web-escolher-obra" style={{ fontWeight: 700 }}>{mensagem}</p>}

        {!aberto && (
          <>
            {erro && <p role="alert" className="campo-web-escolher-obra">{erro} <button type="button" style={{ textDecoration: 'underline', fontWeight: 700 }} onClick={() => setTentativa((n) => n + 1)}>Tentar de novo</button></p>}
            {!erro && rdos === null && <p role="status" className="campo-web-escolher-obra"><Loader2 size={16} /> Carregando relatórios…</p>}
            {rdos && rdos.length === 0 && <div className="app-empty-state app-empty-bordered"><ClipboardList size={42} /><h3>Nenhum relatório ainda</h3><p>Os relatórios desta obra aparecerão aqui.</p></div>}
            {rdos && rdos.length > 0 && (
              <div className="app-works-list">
                {rdos.map((r) => (
                  <article key={r.id} className="app-work-card" style={{ cursor: 'pointer' }} onClick={() => setAberto(r.id)}>
                    <span className="app-work-icon" aria-hidden="true"><ClipboardList size={21} /></span>
                    <div className="app-work-copy">
                      <div className="app-work-title">
                        <h3>RDO {formatarData(dataDoRdo(r))}</h3>
                      </div>
                      <div style={{ marginTop: 8 }}><span className={`rel-chip ${tom(r.status)}`}>{rotulo(r.status)}</span></div>
                      {r.submittedByName && <div className="app-work-meta"><span><small>Enviado por</small><strong>{r.submittedByName}</strong></span></div>}
                      {r.status === 'needs_correction' && r.lastReason && <p className="rel-motivo" style={{ margin: '10px 0 0' }}>Motivo: {r.lastReason}</p>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        {aberto && (
          <section aria-label="Detalhe do relatório" style={{ display: 'grid', gap: 12 }}>
            {erroDetalhe && <p role="alert" className="campo-web-escolher-obra">{erroDetalhe}</p>}
            {!detalhe && !erroDetalhe && <p role="status" className="campo-web-escolher-obra"><Loader2 size={16} /> Abrindo relatório…</p>}
            {detalhe && (
              <>
                <div className="rel-hero">
                  <small>Relatório diário de obra</small>
                  <h2>RDO {formatarData(texto(detalhe.snapshot.data) || dataDoRdo(detalhe.rdo))}</h2>
                  <div className="rel-chips">
                    <span className="rel-chip">{rotulo(detalhe.rdo.status)}</span>
                    {texto(detalhe.snapshot.horario) && <span className="rel-chip">{texto(detalhe.snapshot.horario)}</span>}
                    {texto(detalhe.snapshot.clima) && <span className="rel-chip">{texto(detalhe.snapshot.clima)}</span>}
                    {texto(detalhe.snapshot.condicaoTrabalho) && <span className="rel-chip">{texto(detalhe.snapshot.condicaoTrabalho)}</span>}
                  </div>
                  {detalhe.rdo.submittedByName && <p style={{ margin: '12px 0 0', color: '#cfe0ff', fontSize: 13 }}>Enviado por {detalhe.rdo.submittedByName}</p>}
                </div>
                {detalhe.rdo.status === 'needs_correction' && detalhe.rdo.lastReason && <p className="rel-motivo">Motivo da devolução: {detalhe.rdo.lastReason}</p>}
                {detalhe.rdo.status === 'needs_correction' && detalhe.rdo.submittedBy === meuUid && !editando && (
                  <button type="button" className="campo-web-record" style={{ minHeight: 56 }} onClick={iniciarCorrecao}>Corrigir e reenviar</button>
                )}
                {editando && (
                  <div className="rel-acoes">
                    <h3>Corrigir relatório</h3>
                    {SECOES.map(([chave, titulo]) => (
                      <label key={chave}>{titulo}
                        <textarea value={editando[chave]} rows={chave === 'atividades' ? 6 : 3} onChange={(e) => setEditando({ ...editando, [chave]: e.target.value })} />
                      </label>
                    ))}
                    {detalhe.rdo.sourceType === 'campo' ? (
                      <div style={{ display: 'grid', gap: 10 }}>
                        <h3 style={{ margin: 0 }}><Camera size={16} style={{ verticalAlign: '-3px' }} /> Fotos {fotosEdicao ? `(${fotosEdicao.length}/10)` : ''}</h3>
                        {fotosEdicao && fotosEdicao.length > 0 && (
                          <div className="campo-web-anexos-grade">
                            {fotosEdicao.map((f, i) => (
                              <div key={`${i}-${f.url.length}`} className="campo-web-anexo">
                                <img src={f.url} alt={`Foto ${i + 1}`} />
                                <button type="button" aria-label={`Remover foto ${i + 1}`} onClick={() => setFotosEdicao((atual) => (atual ?? []).filter((_, k) => k !== i))}>×</button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="rel-fotos-botoes">
                          <label className="campo-web-photo-control">
                            <Camera size={22} aria-hidden="true" /> Tirar foto
                            <input type="file" accept="image/*" capture="environment" disabled={!fotosEdicao || preparandoFotos || fotosEdicao.length >= 10} onChange={adicionarFotosCorrecao} />
                          </label>
                          <label className="campo-web-photo-control">
                            <Camera size={22} aria-hidden="true" /> Escolher foto
                            <input type="file" accept="image/*" multiple disabled={!fotosEdicao || preparandoFotos || fotosEdicao.length >= 10} onChange={adicionarFotosCorrecao} />
                          </label>
                        </div>
                        {preparandoFotos && <p role="status" style={{ margin: 0, fontSize: 13 }}><Loader2 size={14} /> Preparando fotos…</p>}
                        {erroFotos && <p role="alert" style={{ margin: 0, fontSize: 13, color: '#b42318', fontWeight: 700 }}>{erroFotos}</p>}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: 12, color: '#666' }}>Para mudar fotos deste relatório, corrija-o no Diário onde ele foi criado.</p>
                    )}
                    <button type="button" className="campo-web-record" disabled={processando || preparandoFotos || (detalhe.rdo.sourceType === 'campo' && !fotosEdicao) || !(editando.atividades.trim() || editando.ocorrencias.trim() || editando.observacoes.trim())} onClick={reenviar}>{processando ? 'Enviando…' : 'Reenviar para a revisão'}</button>
                    <button type="button" className="campo-web-manual" disabled={processando} onClick={() => { setEditando(null); setFotosEdicao(null); setErroFotos(''); }}>Cancelar</button>
                  </div>
                )}
                {detalhe.rdo.status === 'submitted' && empresa.podeRevisar && detalhe.rdo.submittedBy !== meuUid && (
                  <div className="rel-acoes">
                    <h3>Sua decisão</h3>
                    {decidindo === 'devolver' && (
                      <>
                        <label>Motivo da devolução (mínimo 10 letras)
                          <textarea value={motivo} rows={4} onChange={(e) => setMotivo(e.target.value)} />
                        </label>
                        <button type="button" className="campo-web-record" disabled={processando || motivo.trim().length < 10}
                          onClick={() => void concluir(() => devolverRdoDaCentral(empresa.empresaId, empresa.obraId, detalhe.rdo.id, detalhe.version, motivo.trim()), 'Relatório devolvido para correção.')}>
                          <Undo2 size={22} /> {processando ? 'Enviando…' : 'Devolver para correção'}
                        </button>
                        <button type="button" className="campo-web-manual" disabled={processando} onClick={() => setDecidindo('')}>Cancelar</button>
                      </>
                    )}
                    {decidindo === 'aceitar' && (
                      <>
                        <p style={{ margin: 0 }}>Aceitar este relatório? A decisão fica registrada com o seu nome.</p>
                        <button type="button" className="campo-web-record" disabled={processando}
                          onClick={() => void concluir(() => aceitarRdoDaCentral(empresa.empresaId, empresa.obraId, detalhe.rdo.id, detalhe.version), 'Relatório aceito.')}>
                          <CheckCircle2 size={22} /> {processando ? 'Enviando…' : 'Confirmar aceite'}
                        </button>
                        <button type="button" className="campo-web-manual" disabled={processando} onClick={() => setDecidindo('')}>Cancelar</button>
                      </>
                    )}
                    {!decidindo && (
                      <div style={{ display: 'grid', gap: 8 }}>
                        <button type="button" className="campo-web-record" onClick={() => setDecidindo('aceitar')}><CheckCircle2 size={22} /> Aceitar</button>
                        <button type="button" className="campo-web-manual" onClick={() => setDecidindo('devolver')}><Undo2 size={20} /> Devolver para correção</button>
                      </div>
                    )}
                  </div>
                )}
                {SECOES.map(([chave, titulo]) => texto(detalhe.snapshot[chave]) && (
                  <section key={chave} className="rel-secao">
                    <h3>{titulo}</h3>
                    <p>{texto(detalhe.snapshot[chave])}</p>
                  </section>
                ))}
                {detalhe.photos.length > 0 && (
                  <section className="rel-secao">
                    <h3><Camera size={16} style={{ verticalAlign: '-3px' }} /> Fotos ({detalhe.photos.length})</h3>
                    {Object.keys(fotos).length < detalhe.photos.length && (
                      <button type="button" className="campo-web-manual" disabled={carregandoFotos} onClick={carregarFotos}>{carregandoFotos ? 'Carregando fotos…' : 'Ver fotos'}</button>
                    )}
                    <div className="rel-fotos">
                      {detalhe.photos.map((f) => fotos[f.id] && (
                        <figure key={f.id}>
                          <img src={fotos[f.id]} alt={f.legenda || 'Foto do relatório'} />
                          {f.legenda && <figcaption>{f.legenda}</figcaption>}
                        </figure>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
