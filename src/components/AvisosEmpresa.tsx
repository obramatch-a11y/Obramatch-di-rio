import { useCallback, useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { listarAvisosDaCentral, type AvisoDaCentral, type ObraDaEmpresa } from '../lib/central';

export interface AvisoComObra { obra: ObraDaEmpresa; rdo: AvisoDaCentral; tipo: 'devolvido' | 'revisar' }

const formatarData = (v?: string) => (v ? v.replace(/^(\d{4})-(\d{2})-(\d{2}).*$/, '$3/$2/$1') : 'sem data');

/** Avisos do executante (RDO devolvido) e do revisor (RDO aguardando análise), das obras da empresa. */
export default function AvisosEmpresa({ obras, onAbrir }: { obras: ObraDaEmpresa[]; onAbrir: (aviso: AvisoComObra) => void }) {
  const [avisos, setAvisos] = useState<AvisoComObra[]>([]);

  const atualizar = useCallback(async (signal?: AbortSignal) => {
    if (obras.length === 0 || !navigator.onLine) return;
    const consultas = obras.flatMap((obra) => {
      const itens: Promise<AvisoComObra[]>[] = [
        listarAvisosDaCentral(obra.empresaId, obra.obraId, 'needs_correction', signal)
          .then((l) => l.map((rdo) => ({ obra, rdo, tipo: 'devolvido' as const }))),
      ];
      if (obra.capabilities?.canReview) {
        itens.push(listarAvisosDaCentral(obra.empresaId, obra.obraId, 'submitted', signal)
          .then((l) => l.map((rdo) => ({ obra, rdo, tipo: 'revisar' as const }))));
      }
      return itens;
    });
    const resultados = await Promise.allSettled(consultas);
    if (signal?.aborted) return;
    setAvisos(resultados.flatMap((r) => (r.status === 'fulfilled' ? r.value : [])));
  }, [obras]);

  useEffect(() => {
    const c = new AbortController();
    void atualizar(c.signal);
    const aoVoltar = () => { if (document.visibilityState === 'visible') void atualizar(c.signal); };
    document.addEventListener('visibilitychange', aoVoltar);
    const timer = window.setInterval(aoVoltar, 60_000);
    return () => { c.abort(); document.removeEventListener('visibilitychange', aoVoltar); window.clearInterval(timer); };
  }, [atualizar]);

  if (avisos.length === 0) return null;
  const devolvidos = avisos.filter((a) => a.tipo === 'devolvido');
  const revisar = avisos.filter((a) => a.tipo === 'revisar');

  const lista = (titulo: string, itens: AvisoComObra[]) => itens.length > 0 && (
    <section className="rdo-alertas" aria-label={titulo}>
      <h2><BellRing size={20} aria-hidden="true" /> {titulo}</h2>
      <ul>
        {itens.map(({ obra, rdo, tipo }) => (
          <li key={`${obra.empresaId}:${obra.obraId}:${rdo.id}:${tipo}`}>
            <div className="rdo-alerta-cabecalho">
              <strong>{obra.obraNome} · RDO {formatarData(rdo.data)}</strong>
              <span className={rdo.alertRead ? 'rdo-alerta-lido' : 'rdo-alerta-nao-lido'}>{rdo.alertRead ? 'Lido' : 'Novo'}</span>
            </div>
            <span>{tipo === 'devolvido' ? (rdo.lastReason || 'Veja o motivo informado pelo revisor.') : `Enviado por ${rdo.submittedByName || 'um colega'}.`}</span>
            <div className="rdo-alerta-acoes">
              <button type="button" onClick={() => onAbrir({ obra, rdo, tipo })}>{tipo === 'devolvido' ? 'Corrigir' : 'Revisar'}</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );

  return <>{lista('Relatórios devolvidos para correção', devolvidos)}{lista('Relatórios aguardando sua revisão', revisar)}</>;
}
