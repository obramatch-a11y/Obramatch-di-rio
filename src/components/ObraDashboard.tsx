import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Diario } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Plus, 
  Calendar, 
  Camera, 
  TrendingUp, 
  FileText, 
  Settings, 
  Trash2, 
  Edit, 
  User, 
  MapPin, 
  X,
  Share2,
  Printer,
  ChevronRight,
  Clock,
  ExternalLink,
  Sparkles,
  Info,
  BookOpen,
  Star,
  Bot,
  FileDown
} from 'lucide-react';
import { getContextualRecommendations } from '../lib/ecosystemData';
import ObraMatchSoftPromo from './ObraMatchSoftPromo';
import { dataLocalISO } from '../lib/dataLocal';

export default function ObraDashboard() {
  const { 
    selectedObra, 
    diarios, 
    fotos, 
    setView, 
    updateObra, 
    deleteObra, 
    deleteDiario,
    openAgentesModal,
    arquivarObra
  } = useApp();

  const [activeTab, setActiveTab] = useState<'diarios' | 'fotos' | 'timeline'>('diarios');
  const [showEditObraModal, setShowEditObraModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit states
  const [nome, setNome] = useState(selectedObra?.nome || '');
  const [cliente, setCliente] = useState(selectedObra?.cliente || '');
  const [endereco, setEndereco] = useState(selectedObra?.endereco || '');
  const [responsavelTecnico, setResponsavelTecnico] = useState(selectedObra?.responsavelTecnico || '');
  const [dataInicio, setDataInicio] = useState(selectedObra?.dataInicio || '');
  const [observacoes, setObservacoes] = useState(selectedObra?.observacoes || '');
  const [loading, setLoading] = useState(false);

  if (!selectedObra) return null;

  // Contextual Recommendations based on current diary or obra details
  const latestDiaryText = diarios[0]?.atividades || '';
  const scanText = `${selectedObra.nome} ${selectedObra.observacoes || ''} ${latestDiaryText}`;
  const recommendations = getContextualRecommendations(scanText);

  const handleEditObra = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateObra(selectedObra.id, {
        nome,
        cliente,
        endereco,
        responsavelTecnico,
        dataInicio,
        observacoes,
      });
      setShowEditObraModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteObra = async () => {
    setDeleting(true);
    try {
      await deleteObra(selectedObra.id);
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  };

  // Helper: Calculate streak of consecutive diary entries (unique dates)
  const calculateStreak = (): number => {
    if (diarios.length === 0) return 0;
    
    // Extract unique dates sorted descending
    const dates = Array.from(new Set(diarios.map(d => d.data))).sort((a, b) => (b as string).localeCompare(a as string));
    
    let streak = 0;
    const todayStr = dataLocalISO();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = dataLocalISO(yesterday);
    
    // If the most recent entry is not today or yesterday, streak is 0
    if (dates[0] !== todayStr && dates[0] !== yesterdayStr) {
      return 0;
    }
    
    streak = 1;
    for (let i = 0; i < dates.length - 1; i++) {
      const current = new Date(dates[i] as string);
      const next = new Date(dates[i + 1] as string);
      const diffTime = Math.abs(current.getTime() - next.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        streak++;
      } else if (diffDays > 1) {
        break; // Streak broken
      }
    }
    
    return streak;
  };

  const streak = calculateStreak();
  const lastUpdated = diarios.length > 0 
    ? new Date(diarios[0].data + 'T' + diarios[0].horario).toLocaleDateString('pt-BR') 
    : 'Nenhum registro';

  return (
    <div className="app-shell">
      <header className="app-shell-header">
        <div className="app-shell-header-inner">
          <button type="button" className="app-brand" onClick={() => setView('dashboard')} aria-label="Voltar para o início">
            <span className="app-brand-mark" aria-hidden="true"><ArrowLeft size={22} /></span>
            <span>Relatórios <strong>{selectedObra.nome}</strong></span>
          </button>
          <button type="button" className="app-mobile-menu" style={{ display: 'grid' }} onClick={() => setShowEditObraModal(true)} aria-label="Configurações da obra" title="Configurações da obra">
            <Settings size={22} />
          </button>
        </div>
      </header>

      <main className="app-dashboard campo-web-dashboard" style={{ paddingBottom: 90, display: 'grid', gap: 12 }}>
        <div className="rel-hero">
          <small>{selectedObra.cliente || 'Obra'}</small>
          <h2>{selectedObra.nome}</h2>
          <div className="rel-chips">
            <span className="rel-chip">{diarios.length} {diarios.length === 1 ? 'relatório' : 'relatórios'}</span>
            <span className="rel-chip">{fotos.length} {fotos.length === 1 ? 'foto' : 'fotos'}</span>
            {streak > 1 && <span className="rel-chip">{streak} dias seguidos</span>}
            {lastUpdated && diarios.length > 0 && <span className="rel-chip">Último: {lastUpdated}</span>}
            {selectedObra.arquivada && <span className="rel-chip">Arquivada</span>}
          </div>
          {selectedObra.endereco && <p style={{ margin: '12px 0 0', color: '#cfe0ff', fontSize: 13 }}>{selectedObra.endereco}</p>}
        </div>

        {selectedObra.arquivada ? (
          <p className="rel-motivo">Obra arquivada: somente leitura. Reative a obra para registrar novos RDOs.</p>
        ) : (
          <button type="button" className="campo-web-record" style={{ minHeight: 56 }} onClick={() => setView('diario-form', selectedObra)}>
            <Plus size={22} aria-hidden="true" /> Novo relatório
          </button>
        )}
        {diarios.length > 0 && (
          <button type="button" className="campo-web-manual" onClick={() => setView('exportar-rdos', selectedObra)}>
            <FileDown size={19} aria-hidden="true" /> Exportar vários RDOs em PDF
          </button>
        )}

        <div className="app-filter-chips" aria-label="Ver">
          <button type="button" className={activeTab !== 'fotos' ? 'is-active' : ''} aria-pressed={activeTab !== 'fotos'} onClick={() => setActiveTab('diarios')}>Relatórios {diarios.length}</button>
          <button type="button" className={activeTab === 'fotos' ? 'is-active' : ''} aria-pressed={activeTab === 'fotos'} onClick={() => setActiveTab('fotos')}>Fotos {fotos.length}</button>
        </div>

        {activeTab !== 'fotos' && (
          diarios.length === 0 ? (
            <div className="app-empty-state app-empty-bordered"><FileText size={42} /><h3>Nenhum relatório ainda</h3><p>Grave ou escreva o primeiro RDO desta obra.</p></div>
          ) : (
            <div className="app-works-list">
              {diarios.map((diario) => {
                const qtdFotos = fotos.filter((f) => f.diarioId === diario.id).length;
                const primeira = (diario.atividades || '').split('\n')[0];
                return (
                  <article key={diario.id} className="app-work-card" style={{ cursor: 'pointer' }} onClick={() => setView('diario-detail', selectedObra, diario)}>
                    <span className="app-work-icon" aria-hidden="true"><FileText size={21} /></span>
                    <div className="app-work-copy">
                      <div className="app-work-title">
                        <h3>RDO {new Date(diario.data + 'T12:00:00').toLocaleDateString('pt-BR')}{diario.numeroRdo ? ` · Nº ${String(diario.numeroRdo).padStart(3, '0')}` : ''}</h3>
                      </div>
                      <div className="rel-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {diario.clima && <span className="rel-chip info">{diario.clima}</span>}
                        {diario.ocorrencias && <span className="rel-chip aviso">Ocorrência</span>}
                        {qtdFotos > 0 && <span className="rel-chip info">{qtdFotos} {qtdFotos === 1 ? 'foto' : 'fotos'}</span>}
                      </div>
                      {primeira && <div className="app-work-meta"><span><small>Atividades</small><strong style={{ fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{primeira}</strong></span></div>}
                    </div>
                    <button type="button" className="campo-web-open" aria-label={`Abrir relatório de ${new Date(diario.data + 'T12:00:00').toLocaleDateString('pt-BR')}`} onClick={(e) => { e.stopPropagation(); setView('diario-detail', selectedObra, diario); }}>
                      <ChevronRight size={22} aria-hidden="true" />
                    </button>
                  </article>
                );
              })}
            </div>
          )
        )}

        {activeTab === 'fotos' && (
          fotos.length === 0 ? (
            <div className="app-empty-state app-empty-bordered"><Camera size={42} /><h3>Nenhuma foto salva</h3><p>As fotos anexadas aos relatórios aparecem aqui.</p></div>
          ) : (
            <section className="rel-secao">
              <h3><Camera size={16} style={{ verticalAlign: '-3px' }} /> Fotos da obra ({fotos.length})</h3>
              <div className="rel-fotos">
                {fotos.map((foto) => (
                  <figure key={foto.id}>
                    <img src={foto.url} alt={foto.legenda || 'Foto da obra'} />
                    <figcaption>{new Date(foto.data + 'T12:00:00').toLocaleDateString('pt-BR')}{foto.legenda ? ` · ${foto.legenda}` : ''}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )
        )}
      </main>

      {/* Edit Obra Modal */}
      <AnimatePresence>
        {showEditObraModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditObraModal(false)}
              className="absolute inset-0 bg-black/40"
            />

            {/* Content Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white border border-[#D1D1D1] rounded-xl p-6 z-10 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-extrabold tracking-tight text-[#111111] font-sans flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#FF6F00]" />
                  Configurações da Obra
                </h3>
                <button
                  onClick={() => setShowEditObraModal(false)}
                  className="p-1.5 hover:bg-[#ECECEC] rounded-xl text-neutral-600 hover:text-[#111111] transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!showDeleteConfirm ? (
                <form onSubmit={handleEditObra} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">
                      Nome da Obra *
                    </label>
                    <input
                      type="text"
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full px-4 py-3 nb-input focus:ring-1 focus:ring-[#FF6F00]/40   text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">
                        Cliente *
                      </label>
                      <input
                        type="text"
                        required
                        value={cliente}
                        onChange={(e) => setCliente(e.target.value)}
                        className="w-full px-4 py-3 nb-input focus:ring-1 focus:ring-[#FF6F00]/40   text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">
                        Responsável Técnico *
                      </label>
                      <input
                        type="text"
                        required
                        value={responsavelTecnico}
                        onChange={(e) => setResponsavelTecnico(e.target.value)}
                        className="w-full px-4 py-3 nb-input focus:ring-1 focus:ring-[#FF6F00]/40   text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">
                      Endereço
                    </label>
                    <input
                      type="text"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      className="w-full px-4 py-3 nb-input focus:ring-1 focus:ring-[#FF6F00]/40   text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">
                      Data de Início
                    </label>
                    <input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="w-full px-4 py-3 nb-input focus:ring-1 focus:ring-[#FF6F00]/40   text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">
                      Observações
                    </label>
                    <textarea
                      rows={3}
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      className="w-full px-4 py-3 nb-input focus:ring-1 focus:ring-[#FF6F00]/40   text-sm resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-6 border-t border-[#D1D1D1]">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="py-3 px-4 border border-red-500 text-red-600 hover:bg-red-50 font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir Obra
                    </button>

                    <button
                      type="button"
                      onClick={async () => { await arquivarObra(selectedObra.id, !selectedObra.arquivada); setView('dashboard'); }}
                      className="py-3 px-4 nb-btn nb-btn-ghost text-xs"
                    >
                      {selectedObra.arquivada ? 'Desarquivar obra' : 'Arquivar obra'}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowEditObraModal(false)}
                        className="py-3 px-4 bg-[#F4F4F4] hover:bg-[#ECECEC] text-[#222222] hover:text-[#111111] font-semibold rounded-xl transition-all cursor-pointer text-xs"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={loading || selectedObra.arquivada}
                        title={selectedObra.arquivada ? 'Desarquive a obra para editar os dados' : undefined}
                        className="bg-[#FF6F00] hover:bg-[#e86500] disabled:opacity-50 text-white font-bold py-3 px-5 rounded-xl transition-all cursor-pointer text-xs"
                      >
                        {loading ? 'Salvando...' : 'Atualizar Dados'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="py-6 text-center">
                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-[#111111] mb-2">Tem certeza que deseja excluir?</h4>
                  <p className="text-neutral-600 text-sm max-w-sm mx-auto mb-6">
                    Esta ação é irreversível e excluirá permanentemente a obra <strong>{selectedObra.nome}</strong> e todos os seus diários e fotografias registrados.
                  </p>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-3 px-4 bg-[#F4F4F4] hover:bg-[#ECECEC] text-[#222222] font-semibold rounded-xl transition-all cursor-pointer text-sm"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteObra}
                      disabled={deleting}
                      className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all cursor-pointer text-sm shadow-red-500/10"
                    >
                      {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
