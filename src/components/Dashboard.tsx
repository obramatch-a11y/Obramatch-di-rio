import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Obra } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  MapPin, 
  User, 
  Calendar, 
  FileText, 
  LogOut, 
  CloudOff, 
  CheckCircle2, 
  ChevronRight,
  HardHat,
  X,
  FileSpreadsheet,
  Download,
  Smartphone,
  Check,
  Bot,
  Sparkles,
  BookOpen,
  Star,
  ArrowRight
} from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import AdSenseBlock from './AdSenseBlock';
import ObraMatchSoftPromo from './ObraMatchSoftPromo';

const ECOSYSTEM_SLIDES = [
  {
    type: 'blog',
    title: 'Blog ObraMatch',
    tagline: 'Cura do Concreto: Evitar Fissuras',
    description: 'Procedimentos fundamentais de hidratação e proteção para concretagem perfeita de lajes.',
    actionLabel: 'Acessar Blog Oficial',
    link: 'https://obramatchof.blogspot.com/',
    icon: BookOpen,
    color: 'border-blue-500/20 bg-blue-500/5 text-blue-400'
  },
  {
    type: 'agent',
    title: 'Agentes Match AI',
    tagline: 'Fale com o especialista de NBR',
    description: 'Dúvidas rápidas sobre normas reguladoras da ABNT, incluindo NBR 15575 e acessibilidade.',
    actionLabel: 'Abrir Agentes Match',
    link: 'https://agentes.obramatch.com.br/',
    icon: Bot,
    color: 'border-amber-500/20 bg-amber-500/5 text-amber-400'
  },
  {
    type: 'pro',
    title: 'Profissional em Destaque',
    tagline: 'Marcos Roberto Santos • 5.0 ★',
    description: 'Mestre de obras especializado em fundações residenciais e leitura de sondagem SPT.',
    actionLabel: 'Conhecer Site Oficial',
    link: 'https://obramatch.com.br/',
    icon: Star,
    color: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
  },
  {
    type: 'news',
    title: 'Novidades do Ecossistema',
    tagline: 'Laudos de Patologias',
    description: 'Gere relatórios completos de vistorias técnicas integrados com as fotos do diário de obra.',
    actionLabel: 'Conhecer Soluções',
    link: 'https://obramatch.com.br/',
    icon: Sparkles,
    color: 'border-purple-500/20 bg-purple-500/5 text-purple-400'
  }
];

export default function Dashboard() {
  const { obras, createObra, setView, online, user, openAgentesModal } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto rotate ecosystem card
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % ECOSYSTEM_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Form states
  const [nome, setNome] = useState('');
  const [cliente, setCliente] = useState('');
  const [endereco, setEndereco] = useState('');
  const [responsavelTecnico, setResponsavelTecnico] = useState('');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);

  // Connection offline transition states
  const [wasOffline, setWasOffline] = useState(!online);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  useEffect(() => {
    if (online) {
      if (wasOffline) {
        setShowSyncSuccess(true);
        const timer = setTimeout(() => {
          setShowSyncSuccess(false);
        }, 5000);
        setWasOffline(false);
        return () => clearTimeout(timer);
      }
    } else {
      setWasOffline(true);
      setShowSyncSuccess(false);
    }
  }, [online, wasOffline]);

  // PWA states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPwaBanner, setShowPwaBanner] = useState(true);

  useEffect(() => {
    const checkWindowPWAProperties = () => {
      const hasPrompt = (window as any).__deferredPrompt;
      if (hasPrompt) {
        setDeferredPrompt(hasPrompt);
      }
    };

    checkWindowPWAProperties();

    const handleGlobalPrompt = (e: any) => {
      setDeferredPrompt(e.detail || (window as any).__deferredPrompt);
    };

    window.addEventListener('beforeinstallprompt_global_received', handleGlobalPrompt as any);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      (window as any).__deferredPrompt = e;
      setDeferredPrompt(e);
      console.log('beforeinstallprompt event captured');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true ||
        (window as any).__appInstalled === true;
      setIsStandalone(isStandaloneMode);
    };

    const detectIOS = () => {
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      setIsIOS(isIOSDevice);
    };

    checkStandalone();
    detectIOS();

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      (window as any).__deferredPrompt = null;
      console.log('App successfully installed!');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    const interval = setInterval(() => {
      checkWindowPWAProperties();
      checkStandalone();
    }, 1500);

    return () => {
      window.removeEventListener('beforeinstallprompt_global_received', handleGlobalPrompt as any);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearInterval(interval);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        (window as any).__deferredPrompt = null;
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !cliente || !responsavelTecnico) return;

    setLoading(true);
    try {
      await createObra({
        nome,
        cliente,
        endereco,
        responsavelTecnico,
        dataInicio,
        observacoes,
      });
      // Clear form and close modal
      setNome('');
      setCliente('');
      setEndereco('');
      setResponsavelTecnico('');
      setDataInicio(new Date().toISOString().split('T')[0]);
      setObservacoes('');
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredObras = obras.filter(obra => 
    obra.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obra.cliente.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-12">
      {/* Top Navbar */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/10">
              <HardHat className="w-6 h-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white font-sans">
                Obra<span className="text-amber-400">Match</span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">Diário de Obra</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {!online && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-xs font-semibold">
                <CloudOff className="w-3.5 h-3.5" />
                Offline
              </div>
            )}
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-slate-200">{user?.email?.split('@')[0] || 'Usuário'}</span>
              <span className="text-xs text-slate-500">{user?.email}</span>
            </div>
            <button 
              onClick={handleSignOut}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 w-full pt-8">
        {/* Connection Status Banners */}
        <AnimatePresence mode="popLayout">
          {!online && (
            <motion.div
              key="offline-banner"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 bg-slate-900 border border-amber-500/20 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4 overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-amber-500/5 rounded-full blur-xl" />
              <div className="flex items-start sm:items-center gap-3.5 relative z-10">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl shrink-0">
                  <CloudOff className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    Modo Offline Ativo
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Você está navegando sem internet. O ObraMatch salvará todos os diários e fotos localmente no seu dispositivo e sincronizará automaticamente com a nuvem assim que a conexão retornar.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {showSyncSuccess && (
            <motion.div
              key="online-success-banner"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 bg-slate-900 border border-emerald-500/20 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4 overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl" />
              <div className="flex items-start sm:items-center gap-3.5 relative z-10">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    Conexão Restaurada!
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Sua conexão com a internet foi restabelecida. Seus dados estão sincronizados e seguros na nuvem do ObraMatch.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSyncSuccess(false)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer relative z-10"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PWA Install Banner */}
        <AnimatePresence>
          {showPwaBanner && !isStandalone && (deferredPrompt || isIOS) && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 bg-slate-900 border border-amber-500/30 rounded-3xl p-5 shadow-2xl relative overflow-hidden"
            >
              {/* Subtle accent background glow */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl" />
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl shrink-0">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      Instalar ObraMatch Diário
                      <span className="text-xs bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full">PWA</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                      {isIOS 
                        ? "Para instalar no seu iPhone ou iPad, toque no ícone de Compartilhar no navegador Safari e selecione 'Adicionar à Tela de Início'."
                        : "Instale o aplicativo na sua tela inicial para acesso instantâneo de alta performance e funcionamento offline completo!"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto self-end sm:self-center shrink-0">
                  {!isIOS && deferredPrompt && (
                    <button
                      onClick={handleInstallClick}
                      className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all text-xs"
                    >
                      <Download className="w-4 h-4" />
                      Instalar Agora
                    </button>
                  )}
                  <button
                    onClick={() => setShowPwaBanner(false)}
                    className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer shrink-0 ml-auto"
                    title="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Single-column Layout for Obras & ObraMatch Ecosystem underneath */}
        <div className="space-y-8">
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
                  Minhas Obras
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Selecione uma obra para gerenciar ou registrar o diário de hoje.
                </p>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 px-5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-amber-500/10 hover:shadow-amber-500/25 text-sm"
              >
                <Plus className="w-5 h-5" />
                Nova Obra
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
              <input
                type="text"
                placeholder="Pesquisar por nome da obra ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-900 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 rounded-2xl text-white placeholder-slate-500 outline-none transition-all text-sm"
              />
            </div>

            {/* Obras Grid */}
            {filteredObras.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 border border-dashed border-slate-900 rounded-3xl text-center px-4">
                <FileSpreadsheet className="w-16 h-16 text-slate-700 stroke-[1.5] mb-4" />
                <h3 className="text-lg font-bold text-slate-300">Nenhuma obra cadastrada</h3>
                <p className="text-slate-500 text-sm mt-1 max-w-sm">
                  {searchTerm ? 'Nenhuma obra corresponde aos termos pesquisados.' : 'Comece cadastrando sua primeira obra clicando no botão "Nova Obra".'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredObras.map((obra) => {
                  // Format last update or set placeholder
                  const lastUpdated = obra.updatedAt 
                    ? new Date(obra.updatedAt.seconds * 1000).toLocaleDateString('pt-BR') 
                    : 'Não disponível';

                  return (
                    <motion.div
                      key={obra.id}
                      whileHover={{ y: -4 }}
                      onClick={() => setView('obra-dashboard', obra)}
                      className="bg-slate-900/50 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 rounded-3xl p-6 shadow-xl shadow-slate-950/20 cursor-pointer flex flex-col justify-between transition-all group"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-4">
                          <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                            Ativa
                          </span>
                          <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                        </div>

                        <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                          {obra.nome}
                        </h3>
                        <p className="text-slate-400 text-sm mt-1 mb-4 flex items-center gap-1.5">
                          <User className="w-4 h-4 text-slate-600" />
                          Cliente: {obra.cliente}
                        </p>

                        <div className="space-y-2 pt-4 border-t border-slate-900/50">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate">{obra.endereco || 'Sem endereço registrado'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Início: {new Date(obra.dataInicio).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-900/50 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>Atualizado: {lastUpdated}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Single, non-repetitive ObraMatch promo block below the main list as requested */}
          <ObraMatchSoftPromo variant="dashboard" className="mt-8" />
        </div>
      </main>

      {/* Slide-over Modal for New Obra */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Content Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl z-10 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-extrabold tracking-tight text-white font-sans">
                  Cadastrar Nova Obra
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Nome da Obra *
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Residencial Bella Vista - Bloco A"
                    className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 rounded-2xl text-white placeholder-slate-600 outline-none transition-all text-sm"
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
                      placeholder="Nome do Proprietário/Empresa"
                      className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 rounded-2xl text-white placeholder-slate-600 outline-none transition-all text-sm"
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
                      placeholder="Eng. João Silva (CREA/CAU)"
                      className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 rounded-2xl text-white placeholder-slate-600 outline-none transition-all text-sm"
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
                    placeholder="Rua das Flores, 123 - Centro"
                    className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 rounded-2xl text-white placeholder-slate-600 outline-none transition-all text-sm"
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
                    placeholder="Notas ou detalhes iniciais do contrato..."
                    className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 rounded-2xl text-white placeholder-slate-600 outline-none transition-all text-sm resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 px-4 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-300 hover:text-white font-semibold rounded-2xl transition-all cursor-pointer text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold py-3 px-4 rounded-2xl transition-all cursor-pointer shadow-lg shadow-amber-500/10 text-sm"
                  >
                    {loading ? 'Adicionando...' : 'Salvar Obra'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
