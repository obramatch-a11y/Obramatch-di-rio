import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Diario } from '../types';
import { ArrowLeft, FileDown, AlertTriangle, WifiOff } from 'lucide-react';
import { montarDocumentoRdo, entregarPdfRdo } from '../lib/documentoRdo';
import { dataLocalISO } from '../lib/dataLocal';

function intervaloDoPeriodo(p: string, de: string, ate: string): { de: string; ate: string } | null {
  const hoje = new Date();
  const iso = (d: Date) => dataLocalISO(d);
  if (p === 'este-mes') return { de: iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), ate: iso(hoje) };
  if (p === 'mes-anterior') return { de: iso(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)), ate: iso(new Date(hoje.getFullYear(), hoje.getMonth(), 0)) };
  if (p === 'personalizado' && de && ate) return { de, ate };
  return null; // 'todos'
}

export default function ExportarRdos() {
  const { selectedObra, diarios, fotos, setView, online, plano } = useApp();
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [periodo, setPeriodo] = useState<'todos' | 'este-mes' | 'mes-anterior' | 'personalizado'>('todos');
  const [dataDe, setDataDe] = useState('');
  const [dataAte, setDataAte] = useState('');
  const [preparando, setPreparando] = useState(false);

  if (!selectedObra) return null;

  const faixa = intervaloDoPeriodo(periodo, dataDe, dataAte);
  const diariosFiltrados = faixa
    ? diarios.filter(d => d.data >= faixa.de && d.data <= faixa.ate)
    : diarios;

  // Limpar seleção fora da faixa quando período muda
  useEffect(() => {
    setSelecionados(prev => {
      const filtradosIds = new Set(diariosFiltrados.map(d => d.id));
      const novos = new Set([...prev].filter(id => filtradosIds.has(id)));
      if (novos.size !== prev.size) return novos;
      return prev;
    });
  }, [periodo, dataDe, dataAte]);

  const diariosParaExportar = diarios
    .filter(d => selecionados.has(d.id))
    .sort((a, b) => String(a.data).localeCompare(String(b.data)) || String(a.horario ?? '').localeCompare(String(b.horario ?? '')));

  const totalFotos = diariosParaExportar.reduce((s, d) => s + fotos.filter(f => f.diarioId === d.id).length, 0);

  const periodoReal = diariosParaExportar.length > 0
    ? `${new Date(diariosParaExportar[0].data + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(diariosParaExportar[diariosParaExportar.length - 1].data + 'T12:00:00').toLocaleDateString('pt-BR')}`
    : '';

  const toggleSelecionado = (id: string) => {
    setSelecionados(prev => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  };

  const selecionarTodos = () => {
    setSelecionados(new Set(diariosFiltrados.map(d => d.id)));
  };

  const desmarcarTodos = () => {
    setSelecionados(new Set());
  };

  const [erroPdf, setErroPdf] = useState('');
  const gerarPdf = async () => {
    if (diariosParaExportar.length === 0 || preparando) return;
    setPreparando(true); setErroPdf('');
    try {
      const docs = diariosParaExportar.map((d) => montarDocumentoRdo(selectedObra, d, fotos.filter((f) => f.diarioId === d.id), { semRodapeObraMatch: plano.plano !== 'free' }));
      await entregarPdfRdo(docs, 'baixar');
    } catch (err) {
      setErroPdf(err instanceof Error ? err.message : 'Não foi possível gerar o PDF.');
    } finally {
      setPreparando(false);
    }
  };

  const chipClasses = (ativo: boolean) =>
    `py-2 px-4 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
      ativo
        ? 'bg-[#FF6F00]/10 border-[#FF6F00] text-[#FF6F00]'
        : 'bg-white border-[#D1D1D1] text-neutral-600 hover:bg-[#F4F4F4]'
    }`;

  return (
    <div className="min-h-screen bg-[#F4F4F4] text-[#111111] flex flex-col pb-16 relative">

      {/* SCREEN UI (HIDDEN DURING PRINT) */}
      <div className="print:hidden flex flex-col w-full flex-1">
        {/* Topbar */}
        <header className="nb-topbar sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between w-full">
            <button
              onClick={() => setView('obra-dashboard', selectedObra)}
              className="flex items-center gap-2 text-blue-100 hover:text-[#FFB347] font-semibold transition-all cursor-pointer text-sm"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Painel da Obra</span>
            </button>
            <h2 className="text-white font-bold text-sm">Exportar RDOs</h2>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 w-full pt-6 flex-1">
          {/* Chips de período */}
          <div className="flex flex-wrap gap-2 mb-4">
            {([
              { key: 'todos', label: 'Todos' },
              { key: 'este-mes', label: 'Este mês' },
              { key: 'mes-anterior', label: 'Mês anterior' },
              { key: 'personalizado', label: 'Personalizado' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriodo(key)}
                className={chipClasses(periodo === key)}
                aria-pressed={periodo === key}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Inputs de data personalizado */}
          {periodo === 'personalizado' && (
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className="text-xs font-bold text-neutral-600 block mb-1">De</label>
                <input
                  type="date"
                  value={dataDe}
                  onChange={e => setDataDe(e.target.value)}
                  className="nb-input w-full"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-neutral-600 block mb-1">Até</label>
                <input
                  type="date"
                  value={dataAte}
                  onChange={e => setDataAte(e.target.value)}
                  className="nb-input w-full"
                />
              </div>
            </div>
          )}

          {/* Ações */}
          {diariosFiltrados.length > 0 && (
            <div className="flex gap-2 mb-4">
              <button onClick={selecionarTodos} className="nb-btn nb-btn-ghost text-xs py-1.5 px-3 cursor-pointer">
                Selecionar todos
              </button>
              <button onClick={desmarcarTodos} className="nb-btn nb-btn-ghost text-xs py-1.5 px-3 cursor-pointer">
                Desmarcar todos
              </button>
            </div>
          )}

          {/* Lista de RDOs */}
          {diarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white border border-dashed border-[#D1D1D1] rounded-xl text-center px-4">
              <FileDown className="w-12 h-12 text-[#222222] mb-3" />
              <h4 className="text-base font-bold text-neutral-600">Nenhum RDO nesta obra ainda</h4>
              <p className="text-neutral-500 text-xs mt-1 max-w-xs">
                Crie o primeiro diário para poder exportar.
              </p>
            </div>
          ) : diariosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white border border-dashed border-[#D1D1D1] rounded-xl text-center px-4">
              <FileDown className="w-12 h-12 text-[#222222] mb-3" />
              <h4 className="text-base font-bold text-neutral-600">Nenhum RDO no período selecionado</h4>
            </div>
          ) : (
            <div className="space-y-2">
              {diariosFiltrados.map(d => {
                const dFotos = fotos.filter(f => f.diarioId === d.id);
                const checked = selecionados.has(d.id);
                return (
                  <div
                    key={d.id}
                    onClick={() => toggleSelecionado(d.id)}
                    className={`nb-card-quiet p-4 flex items-center gap-3 cursor-pointer transition-all ${checked ? 'ring-2 ring-[#FF6F00] bg-[#FF6F00]/5' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="w-5 h-5 accent-[#FF6F00] flex-shrink-0"
                      checked={checked}
                      readOnly
                      aria-label={`Selecionar RDO ${String(d.numeroRdo || 0).padStart(3, '0')}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[#111111]">
                          RDO Nº {String(d.numeroRdo || 0).padStart(3, '0')}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {d.condicaoTrabalho && (
                          <span className="text-[10px] text-neutral-500">{d.condicaoTrabalho}</span>
                        )}
                        {d.ocorrencias && (
                          <span className="text-[10px] text-orange-600 font-bold">⚠ Ocorrência</span>
                        )}
                        <span className="text-[10px] text-neutral-500">{dFotos.length} foto{dFotos.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Aviso de volume */}
          {(diariosParaExportar.length > 31 || totalFotos > 60) && (
            <div className="mt-4 p-3 rounded-xl bg-[#FF6F00]/10 border border-[#FF6F00] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[#FF6F00] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#FF6F00] font-semibold">
                Documento grande ({diariosParaExportar.length} RDOs, {totalFotos} fotos). Em celulares mais simples a geração pode demorar ou falhar. Se possível, exporte por períodos menores.
              </p>
            </div>
          )}

          {/* Aviso offline */}
          {!online && totalFotos > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-neutral-100 border border-neutral-300 flex items-start gap-2">
              <WifiOff className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-neutral-600 font-semibold">
                Você está offline. Fotos que ainda estão na nuvem podem aparecer como indisponíveis no documento.
              </p>
            </div>
          )}
        </main>

        {/* Rodapé fixo */}
        <div className="sticky bottom-0 bg-white border-t-2 border-black p-4 z-30">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <p className="text-xs text-neutral-600 flex-1 min-w-0 truncate">
              {selecionados.size > 0
                ? `${selecionados.size} RDO${selecionados.size > 1 ? 's' : ''} selecionado${selecionados.size > 1 ? 's' : ''} · ${totalFotos} foto${totalFotos !== 1 ? 's' : ''}${periodoReal ? ` · ${periodoReal}` : ''}`
                : 'Selecione os RDOs para exportar'}
            </p>
            {erroPdf && <p role="alert" className="text-xs font-bold text-red-600">{erroPdf}</p>}
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setView('obra-dashboard', selectedObra)}
                className="nb-btn nb-btn-ghost py-2.5 px-4 text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={gerarPdf}
                disabled={diariosParaExportar.length === 0 || preparando}
                className="nb-btn nb-btn-primary py-2.5 px-4 text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileDown className="w-4 h-4" />
                {preparando ? 'Gerando PDF…' : 'Gerar PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
