import { useEffect, useState } from 'react';
import { ArrowLeft, Camera, ClipboardList, Loader2 } from 'lucide-react';
import {
  detalharRdoDaCentral, fotoRdoDaCentral, listarRdosDaCentral,
  type DetalheRdoCentral, type RdoDaCentral,
} from '../lib/central';
import type { Obra } from '../types';

const ROTULO_STATUS: Record<string, string> = {
  submitted: 'Enviado, aguardando revisão',
  needs_correction: 'Devolvido para correção',
  resubmitted: 'Reenviado',
  accepted: 'Aceito',
  document_accepted: 'Aceito',
  finalized: 'Finalizado',
};

const formatarData = (v?: string) => (v ? v.replace(/^(\d{4})-(\d{2})-(\d{2}).*$/, '$3/$2/$1') : 'Sem data');
const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

const SECOES: [string, string][] = [
  ['atividades', 'Atividades'], ['equipe', 'Equipe'], ['materiais', 'Materiais'],
  ['ocorrencias', 'Ocorrências'], ['observacoes', 'Observações'],
];

export default function RelatoriosEmpresa({ obra, onVoltar }: { obra: Obra; onVoltar: () => void }) {
  const empresa = obra.empresa!;
  const [rdos, setRdos] = useState<RdoDaCentral[] | null>(null);
  const [erro, setErro] = useState('');
  const [aberto, setAberto] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<DetalheRdoCentral | null>(null);
  const [erroDetalhe, setErroDetalhe] = useState('');
  const [fotos, setFotos] = useState<Record<string, string>>({});
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
    detalharRdoDaCentral(empresa.empresaId, empresa.obraId, aberto, c.signal)
      .then(setDetalhe)
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

  const voltar = () => (aberto ? setAberto(null) : onVoltar());

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
                        <h3>RDO {formatarData(r.data)}</h3>
                        <span className={r.status === 'needs_correction' ? 'is-muted' : 'is-active'}>{ROTULO_STATUS[r.status] || r.status}</span>
                      </div>
                      <div className="app-work-meta">
                        <span><small>Enviado por</small><strong>{r.submittedByName || 'Equipe'}</strong></span>
                      </div>
                      {r.status === 'needs_correction' && r.lastReason && <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 700 }}>Motivo: {r.lastReason}</p>}
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
                <div className="nb-card" style={{ padding: 16 }}>
                  <h2 style={{ margin: 0 }}>RDO {formatarData(texto(detalhe.snapshot.data) || detalhe.rdo.data)}</h2>
                  <p style={{ margin: '6px 0 0' }}>{ROTULO_STATUS[detalhe.rdo.status] || detalhe.rdo.status}{detalhe.rdo.submittedByName ? ` · ${detalhe.rdo.submittedByName}` : ''}</p>
                  {detalhe.rdo.status === 'needs_correction' && detalhe.rdo.lastReason && <p style={{ marginTop: 8, fontWeight: 700 }}>Motivo da devolução: {detalhe.rdo.lastReason}</p>}
                  {(texto(detalhe.snapshot.horario) || texto(detalhe.snapshot.clima)) && <p style={{ marginTop: 8, color: '#555' }}>{[texto(detalhe.snapshot.horario), texto(detalhe.snapshot.clima)].filter(Boolean).join(' · ')}</p>}
                </div>
                {SECOES.map(([chave, titulo]) => texto(detalhe.snapshot[chave]) && (
                  <div key={chave} className="nb-card" style={{ padding: 16 }}>
                    <h3 style={{ margin: '0 0 6px' }}>{titulo}</h3>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{texto(detalhe.snapshot[chave])}</p>
                  </div>
                ))}
                {detalhe.photos.length > 0 && (
                  <div className="nb-card" style={{ padding: 16 }}>
                    <h3 style={{ margin: '0 0 8px' }}><Camera size={18} /> Fotos ({detalhe.photos.length})</h3>
                    {Object.keys(fotos).length < detalhe.photos.length && (
                      <button type="button" className="campo-web-manual" disabled={carregandoFotos} onClick={carregarFotos}>{carregandoFotos ? 'Carregando fotos…' : 'Ver fotos'}</button>
                    )}
                    <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                      {detalhe.photos.map((f) => fotos[f.id] && (
                        <figure key={f.id} style={{ margin: 0 }}>
                          <img src={fotos[f.id]} alt={f.legenda || 'Foto do relatório'} style={{ width: '100%', borderRadius: 12 }} />
                          {f.legenda && <figcaption style={{ fontSize: 13, color: '#555' }}>{f.legenda}</figcaption>}
                        </figure>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
