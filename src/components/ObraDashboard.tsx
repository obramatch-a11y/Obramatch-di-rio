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
  Bot
} from 'lucide-react';
import { getContextualRecommendations } from '../lib/ecosystemData';
import ObraMatchSoftPromo from './ObraMatchSoftPromo';

export default function ObraDashboard() {
  const { 
    selectedObra, 
    diarios, 
    fotos, 
    setView, 
    updateObra, 
    deleteObra, 
    deleteDiario,
    openAgentesModal
  } = useApp();

  const [activeTab, setActiveTab] = useState<'diarios' | 'fotos' | 'timeline'>('diarios');
  const [showEditObraModal, setShowEditObraModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    try {
      await deleteObra(selectedObra.id);
    } catch (err) {
      console.error(err);
    }
  };

  // Helper: Calculate streak of consecutive diary entries (unique dates)
  const calculateStreak = (): number => {
    if (diarios.length === 0) return 0;
    
    // Extract unique dates sorted descending
    const dates = Array.from(new Set(diarios.map(d => d.data))).sort((a, b) => (b as string).localeCompare(a as string));
    
    let streak = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-16">
      {/* Navbar */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={() => setView('dashboard')}
            className="flex items-center gap-2 text-slate-400 hover:text-white font-semibold transition-all cursor-pointer text-sm"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Minhas Obras</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditObraModal(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title="Configurações da Obra"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-6 flex-1">
        {/* Obra Header Info Card */}
        <div className="bg-gradient-to-tr from-slate-900 to-slate-900/40 border border-slate-900 rounded-3xl p-6 sm:p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[120%] rounded-full bg-amber-500/5 blur-[80px]" />
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                {selectedObra.cliente}
              </span>
              <h1 className="text-3xl font-extrabold text-white mt-3 font-sans tracking-tight">
                {selectedObra.nome}
              </h1>
              
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mt-4 text-sm text-slate-400">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span>{selectedObra.endereco || 'Sem endereço'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-500" />
                  <span>RT: {selectedObra.responsavelTecnico}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setView('diario-form', selectedObra)}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-amber-500/15 w-full md:w-auto text-sm"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              Novo Diário de Obra
            </button>
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400">Total de Diários</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono">{diarios.length}</span>
              <FileText className="w-4 h-4 text-amber-500" />
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400">Fotos Registradas</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono">{fotos.length}</span>
              <Camera className="w-4 h-4 text-amber-500" />
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400">Dias Consecutivos</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono">{streak}</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400">Último Registro</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-sm font-bold text-white font-sans truncate max-w-full">
                {lastUpdated}
              </span>
              <Calendar className="w-4 h-4 text-amber-500" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-900 mb-6 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('diarios')}
            className={`py-3 px-4 font-bold text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'diarios' 
                ? 'border-amber-400 text-amber-400' 
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Diários de Obra
          </button>
          <button
            onClick={() => setActiveTab('fotos')}
            className={`py-3 px-4 font-bold text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'fotos' 
                ? 'border-amber-400 text-amber-400' 
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Galeria de Fotos
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 px-4 font-bold text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'timeline' 
                ? 'border-amber-400 text-amber-400' 
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Linha do Tempo (Timeline)
          </button>
        </div>

        {/* Tab Contents */}
        <div className="min-h-[300px]">
          {/* DIARIOS TAB */}
          {activeTab === 'diarios' && (
            <div className="space-y-4">
              {diarios.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-slate-900/20 border border-dashed border-slate-900 rounded-3xl text-center px-4">
                  <FileText className="w-12 h-12 text-slate-700 mb-3" />
                  <h4 className="text-base font-bold text-slate-400">Nenhum diário registrado</h4>
                  <p className="text-slate-500 text-xs mt-1 max-w-xs">
                    Inicie registrando as atividades diárias de execução da obra de hoje.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {diarios.map((diario) => {
                    const dPhotos = fotos.filter(f => f.diarioId === diario.id);
                    return (
                      <motion.div
                        key={diario.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-900/30 hover:bg-slate-900/50 border border-slate-900 rounded-2xl p-5 cursor-pointer flex flex-col justify-between transition-all group"
                        onClick={() => setView('diario-detail', selectedObra, diario)}
                      >
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2 text-xs text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{new Date(diario.data + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{diario.horario}</span>
                            </div>
                          </div>

                          <h4 className="text-base font-extrabold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                            {(diario.atividades || '').split('\n')[0] || 'Registro Diário'}
                          </h4>
                          <p className="text-slate-400 text-xs mt-2 line-clamp-2 leading-relaxed">
                            {diario.atividades}
                          </p>

                          {diario.ocorrencias && (
                            <div className="mt-3 p-2 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs text-amber-300 line-clamp-1">
                              ⚠️ Ocorrência: {diario.ocorrencias}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-900/30 text-xs text-slate-500">
                          <span className="flex items-center gap-1 font-semibold text-slate-400">
                            <Camera className="w-3.5 h-3.5" />
                            {dPhotos.length} {dPhotos.length === 1 ? 'Foto' : 'Fotos'}
                          </span>
                          <span className="text-amber-400 group-hover:translate-x-1 transition-all flex items-center gap-1 font-bold">
                            Ver Diário Completo
                            <ChevronRight className="w-4 h-4" />
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* FOTOS TAB */}
          {activeTab === 'fotos' && (
            <div>
              {fotos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-slate-900/20 border border-dashed border-slate-900 rounded-3xl text-center px-4">
                  <Camera className="w-12 h-12 text-slate-700 mb-3" />
                  <h4 className="text-base font-bold text-slate-400">Nenhuma fotografia salva</h4>
                  <p className="text-slate-500 text-xs mt-1 max-w-xs">
                    Fotos anexadas aos diários de obra aparecerão nesta galeria integrada.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {fotos.map((foto) => (
                    <div 
                      key={foto.id} 
                      className="bg-slate-900/50 border border-slate-900 rounded-2xl overflow-hidden shadow-lg group relative flex flex-col justify-between"
                    >
                      <div className="aspect-square w-full overflow-hidden bg-slate-950 relative">
                        <img 
                          src={foto.url} 
                          alt={foto.legenda || 'Foto da obra'} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-slate-950/80 backdrop-blur-md rounded-lg text-[10px] text-slate-300 font-bold border border-slate-800">
                          {new Date(foto.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-white font-medium line-clamp-1 italic">
                          {foto.legenda || 'Sem legenda'}
                        </p>
                        <div className="flex justify-between items-center mt-2 text-[10px] text-slate-500">
                          <span>Hora: {foto.horario}</span>
                          {foto.gps && (
                            <span className="text-amber-500 font-mono">📍 GPS Ativo</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TIMELINE TAB */}
          {activeTab === 'timeline' && (
            <div className="max-w-3xl mx-auto py-4">
              {diarios.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-slate-900/20 border border-dashed border-slate-900 rounded-3xl text-center px-4">
                  <TrendingUp className="w-12 h-12 text-slate-700 mb-3" />
                  <h4 className="text-base font-bold text-slate-400">Sem histórico de progresso</h4>
                  <p className="text-slate-500 text-xs mt-1 max-w-xs">
                    A linha do tempo cronológica será gerada a partir dos seus diários de obra.
                  </p>
                </div>
              ) : (
                <div className="relative border-l border-slate-800 ml-4 pl-6 space-y-8">
                  {diarios.map((diario, index) => (
                    <motion.div 
                      key={diario.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative"
                    >
                      {/* Timeline dot */}
                      <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 border-4 border-slate-950"></span>

                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mb-2">
                        <div className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 w-max">
                          {new Date(diario.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono font-bold">
                          REGISTRO #{diarios.length - index}
                        </span>
                      </div>

                      <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-4">
                        <h5 className="font-bold text-white text-sm">
                          {(diario.atividades || '').split('\n')[0] || 'Progresso Diário'}
                        </h5>
                        <p className="text-slate-400 text-xs mt-2 leading-relaxed whitespace-pre-wrap">
                          {diario.atividades}
                        </p>

                        {(diario.equipe || diario.materiais || diario.ocorrencias) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-900/50 text-[11px] text-slate-400">
                            {diario.equipe && (
                              <div>
                                <span className="text-slate-500 font-semibold block">Equipe:</span>
                                <span className="line-clamp-1">{diario.equipe}</span>
                              </div>
                            )}
                            {diario.materiais && (
                              <div>
                                <span className="text-slate-500 font-semibold block">Materiais recebidos:</span>
                                <span className="line-clamp-1">{diario.materiais}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Contextual Recommendations & Ecosystem Integration */}
        {recommendations && (
          <div className="mt-12 border-t border-slate-900 pt-10 pb-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
              <h3 className="text-lg font-black text-white font-sans">
                Conteúdo Recomendado & Parceiros
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-6 max-w-2xl leading-relaxed">
              Com base nos registros recentes desta obra, selecionamos artigos do blog, suporte de especialistas e profissionais recomendados para a etapa atual.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* 1. Contextual Blog Article */}
              <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-5 flex flex-col justify-between group hover:border-blue-500/25 transition-all">
                <div className="space-y-3">
                  <span className="text-[10px] font-extrabold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider inline-block">
                    Blog ObraMatch
                  </span>
                  <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                    {recommendations.article.title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                    {recommendations.article.summary}
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-900/50 mt-4 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Leitura: {recommendations.article.readTime}
                  </span>
                  <a
                    href={recommendations.article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ler Artigo</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* 2. Specialty AI Support Agent */}
              <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-5 flex flex-col justify-between group hover:border-purple-500/25 transition-all">
                <div className="space-y-3">
                  <span className="text-[10px] font-extrabold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider inline-block">
                    Agente Match AI
                  </span>
                  <h4 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">
                    {recommendations.agent.name}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                    {recommendations.agent.description}
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-900/50 mt-4 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {recommendations.agent.specialty}
                  </span>
                  <a
                    href="https://agentes.obramatch.com.br/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5 text-amber-400" />
                    <span>Acessar Agente</span>
                  </a>
                </div>
              </div>

              {/* 3. Pre-vetted Professional */}
              <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-5 flex flex-col justify-between group hover:border-emerald-500/25 transition-all">
                <div className="space-y-3">
                  <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider inline-block">
                    Profissionais na Sua Região
                  </span>
                  <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {recommendations.professional.name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <span className="text-amber-400 font-bold">★ {recommendations.professional.rating.toFixed(1)}</span>
                    <span className="text-slate-500">({recommendations.professional.reviews} avaliações)</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                    {recommendations.professional.role} • {recommendations.professional.location}
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-900/50 mt-4 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Histórico Verificado
                  </span>
                  <a
                    href="https://obramatch.com.br/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Conectar</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

            </div>

            {/* Content recommended for your work required by step 3 */}
            <ObraMatchSoftPromo variant="obra" className="mt-8" />

          </div>
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
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Content Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl z-10 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-extrabold tracking-tight text-white font-sans flex items-center gap-2">
                  <Settings className="w-5 h-5 text-amber-400" />
                  Configurações da Obra
                </h3>
                <button
                  onClick={() => setShowEditObraModal(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!showDeleteConfirm ? (
                <form onSubmit={handleEditObra} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Nome da Obra *
                    </label>
                    <input
                      type="text"
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 rounded-2xl text-white outline-none transition-all text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Cliente *
                      </label>
                      <input
                        type="text"
                        required
                        value={cliente}
                        onChange={(e) => setCliente(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 rounded-2xl text-white outline-none transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Responsável Técnico *
                      </label>
                      <input
                        type="text"
                        required
                        value={responsavelTecnico}
                        onChange={(e) => setResponsavelTecnico(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 rounded-2xl text-white outline-none transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Endereço
                    </label>
                    <input
                      type="text"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 rounded-2xl text-white outline-none transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Data de Início
                    </label>
                    <input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 rounded-2xl text-white outline-none transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Observações
                    </label>
                    <textarea
                      rows={3}
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 rounded-2xl text-white outline-none transition-all text-sm resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-6 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="py-3 px-4 border border-red-500/20 text-red-400 hover:bg-red-500/10 font-semibold rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir Obra
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowEditObraModal(false)}
                        className="py-3 px-4 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold rounded-2xl transition-all cursor-pointer text-xs"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold py-3 px-5 rounded-2xl transition-all cursor-pointer text-xs shadow-lg shadow-amber-500/10"
                      >
                        {loading ? 'Salvando...' : 'Atualizar Dados'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="py-6 text-center">
                  <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">Tem certeza que deseja excluir?</h4>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">
                    Esta ação é irreversível e excluirá permanentemente a obra <strong>{selectedObra.nome}</strong> e todos os seus diários e fotografias registrados.
                  </p>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-3 px-4 bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold rounded-2xl transition-all cursor-pointer text-sm"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteObra}
                      className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl transition-all cursor-pointer text-sm shadow-lg shadow-red-500/10"
                    >
                      Confirmar Exclusão
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
