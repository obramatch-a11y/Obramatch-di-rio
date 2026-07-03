import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  MapPin, 
  Sun, 
  Cloud, 
  CloudRain, 
  CloudLightning,
  Camera, 
  User, 
  Wrench, 
  Truck, 
  AlertTriangle, 
  Plus, 
  Check, 
  X,
  Smile,
  FileText,
  Save,
  Compass,
  FileQuestion,
  Eraser,
  Sparkles,
  Bot,
  BookOpen,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { getContextualRecommendations } from '../lib/ecosystemData';
import ObraMatchSoftPromo from './ObraMatchSoftPromo';

const CLIMA_OPTIONS = [
  { value: 'Ensolarado', label: 'Ensolarado', icon: Sun, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { value: 'Nublado', label: 'Nublado', icon: Cloud, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  { value: 'Chuvoso', label: 'Chuvoso', icon: CloudRain, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { value: 'Instável', label: 'Instável', icon: CloudLightning, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
];

export default function DiarioForm() {
  const { selectedObra, createDiario, editingDiario, updateDiario, setView, openAgentesModal } = useApp();

  const isEditing = !!editingDiario;

  // Success modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedReport, setSavedReport] = useState<any>(null);

  // Form Fields
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  const [clima, setClima] = useState('Ensolarado');
  const [equipe, setEquipe] = useState('');
  const [atividades, setAtividades] = useState('');
  const [materiais, setMateriais] = useState('');
  const [ocorrencias, setOcorrencias] = useState('');
  const [observacoes, setObservacoes] = useState('');
  
  // GPS Coordinates
  const [gps, setGps] = useState<{ latitude: number; longitude: number } | null>(null);
  const [requestingGps, setRequestingGps] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'success' | 'denied' | 'error'>('idle');

  // Photo uploads
  const [uploadedPhotos, setUploadedPhotos] = useState<{ url: string; legenda: string; gps?: { latitude: number; longitude: number } | null }[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Load defaults or edit values
  useEffect(() => {
    if (isEditing && editingDiario) {
      setData(editingDiario.data);
      setHorario(editingDiario.horario);
      setClima(editingDiario.clima || 'Ensolarado');
      setEquipe(editingDiario.equipe || '');
      setAtividades(editingDiario.atividades || '');
      setMateriais(editingDiario.materiais || '');
      setOcorrencias(editingDiario.ocorrencias || '');
      setObservacoes(editingDiario.observacoes || '');
      setGps(editingDiario.gps || null);
      if (editingDiario.gps) setGpsStatus('success');
      
      // Load signature if present
      if (editingDiario.assinatura) {
        setHasSignature(true);
        // We'll draw the image back on the canvas once mounted
        setTimeout(() => {
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const img = new Image();
              img.src = editingDiario.assinatura!;
              img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
              };
            }
          }
        }, 300);
      }
    } else {
      // Automatic values
      const now = new Date();
      setData(now.toISOString().split('T')[0]);
      setHorario(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      
      // Auto trigger GPS on create
      handleRequestGps();
    }
  }, [isEditing, editingDiario]);

  // Handle GPS request
  const handleRequestGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }

    setRequestingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGps({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setGpsStatus('success');
        setRequestingGps(false);
      },
      (error) => {
        console.warn('GPS error:', error);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsStatus('denied');
        } else {
          setGpsStatus('error');
        }
        setRequestingGps(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // Image upload and client-side compression
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);

    Array.from(files).forEach((file: any) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          // Compress using canvas to ensure base64 is lightweight (~200KB)
          const canvas = document.createElement('canvas');
          const max_width = 800;
          const max_height = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > max_width) {
              height *= max_width / width;
              width = max_width;
            }
          } else {
            if (height > max_height) {
              width *= max_height / height;
              height = max_height;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            
            // Generate photo metadata
            const compressedUrl = canvas.toDataURL('image/jpeg', 0.7);
            
            setUploadedPhotos(prev => [
              ...prev,
              {
                url: compressedUrl,
                legenda: '',
                gps: gps || null
              }
            ]);
          }
        };
      };
      reader.readAsDataURL(file);
    });

    setUploadingImage(false);
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const updatePhotoLegend = (index: number, val: string) => {
    setUploadedPhotos(prev => prev.map((photo, i) => i === index ? { ...photo, legenda: val } : photo));
  };

  // Canvas Drawing Logic
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#f8fafc'; // White ink for dark card styling
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Submit report
  const handleSaveReport = async () => {
    if (!atividades) return;

    // Capture signature if drawn
    let signatureUrl = '';
    if (hasSignature) {
      signatureUrl = canvasRef.current?.toDataURL() || '';
    }

    const reportData = {
      data,
      horario,
      clima,
      equipe,
      atividades,
      materiais,
      ocorrencias,
      observacoes,
      gps,
      assinatura: signatureUrl || undefined,
    };

    try {
      if (isEditing && editingDiario) {
        await updateDiario(editingDiario.id, reportData, uploadedPhotos);
        const completeReport = { id: editingDiario.id, ...editingDiario, ...reportData, fotos: uploadedPhotos };
        setSavedReport(completeReport);
        setShowSuccessModal(true);
      } else {
        const id = await createDiario(reportData, uploadedPhotos);
        const completeReport = { id, ...reportData, fotos: uploadedPhotos };
        setSavedReport(completeReport);
        setShowSuccessModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-16">
      {/* Top Navbar */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between w-full">
          <button
            onClick={() => setView('obra-dashboard', selectedObra)}
            className="flex items-center gap-2 text-slate-400 hover:text-white font-semibold transition-all cursor-pointer text-sm"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar para Obra</span>
          </button>

          <span className="text-sm font-extrabold text-white">
            {isEditing ? 'Editar Diário' : 'Novo Diário'}
          </span>

          <button
            onClick={handleSaveReport}
            disabled={!atividades}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all text-xs"
          >
            <Save className="w-4 h-4" />
            Salvar
          </button>
        </div>
      </header>

      {/* Form Area */}
      <main className="max-w-4xl mx-auto px-4 w-full pt-8 flex-1">
        <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 sm:p-8 space-y-6">
          
          {/* Section: Metadata (Data, Hora, Clima, GPS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 border-b border-slate-900">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Data do Registro
                  </label>
                  <input
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 focus:border-amber-500/50 rounded-2xl text-white outline-none transition-all text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={horario}
                    onChange={(e) => setHorario(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 focus:border-amber-500/50 rounded-2xl text-white outline-none transition-all text-sm font-semibold"
                  />
                </div>
              </div>

              {/* GPS Tracker */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Coordenadas GPS
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRequestGps}
                    disabled={requestingGps}
                    className="py-3 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-semibold rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all text-xs"
                  >
                    <MapPin className="w-4 h-4 text-amber-500" />
                    {requestingGps ? 'Buscando GPS...' : 'Atualizar Localização'}
                  </button>
                  <div className="flex-1 px-4 py-3 bg-slate-950/30 rounded-2xl border border-slate-900 text-xs font-mono text-slate-400">
                    {gpsStatus === 'success' && gps ? (
                      <span>📍 {gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)}</span>
                    ) : gpsStatus === 'denied' ? (
                      <span className="text-red-400 font-semibold">Sem permissão de GPS</span>
                    ) : gpsStatus === 'error' ? (
                      <span className="text-amber-500">Erro de sinal GPS</span>
                    ) : (
                      <span>Não capturado</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Clima Selection */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Condições do Clima
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CLIMA_OPTIONS.map((item) => {
                  const Icon = item.icon;
                  const isSelected = clima === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setClima(item.value)}
                      className={`flex items-center gap-2.5 p-3.5 border rounded-2xl font-semibold cursor-pointer text-xs transition-all ${
                        isSelected 
                          ? 'border-amber-400 text-amber-400 bg-amber-500/10' 
                          : 'border-slate-800 text-slate-400 hover:text-slate-200 bg-slate-950/20'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section: Main details */}
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Atividades Executadas (Progresso do Dia) *
              </label>
              <textarea
                required
                rows={4}
                value={atividades}
                onChange={(e) => setAtividades(e.target.value)}
                placeholder="Ex: Concretagem de vigas concluída. Alvenaria do 2º pavimento iniciada."
                className="w-full px-4 py-3.5 bg-slate-950/50 border border-slate-800 focus:border-amber-500/50 rounded-2xl text-white placeholder-slate-600 outline-none transition-all text-sm leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Equipe e Mão de Obra Presente
                </label>
                <textarea
                  rows={2}
                  value={equipe}
                  onChange={(e) => setEquipe(e.target.value)}
                  placeholder="Ex: 2 Pedreiros, 4 Serventes, 1 Mestre de Obras."
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 focus:border-amber-500/50 rounded-2xl text-white placeholder-slate-600 outline-none transition-all text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Materiais Recebidos ou Entregues
                </label>
                <textarea
                  rows={2}
                  value={materiais}
                  onChange={(e) => setMateriais(e.target.value)}
                  placeholder="Ex: 50 sacos de cimento CP-II, 2m³ de areia grossa."
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 focus:border-amber-500/50 rounded-2xl text-white placeholder-slate-600 outline-none transition-all text-sm resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Ocorrências / Imprevistos / Acidentes
                </label>
                <textarea
                  rows={2}
                  value={ocorrencias}
                  onChange={(e) => setOcorrencias(e.target.value)}
                  placeholder="Ex: Chuva intensa no período da tarde paralisou trabalhos por 2 horas."
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 focus:border-amber-500/50 rounded-2xl text-white placeholder-slate-600 outline-none transition-all text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Observações Gerais
                </label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Informações adicionais relevantes para o diário..."
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 focus:border-amber-500/50 rounded-2xl text-white placeholder-slate-600 outline-none transition-all text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section: Photographs */}
          <div className="pt-6 border-t border-slate-900 space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-500" />
                Fotografias de Registro
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Capture fotos diretamente pela câmera ou faça upload da galeria do seu celular/computador.
              </p>
            </div>

            {/* Upload Zone */}
            <div className="flex items-center gap-4">
              <label className="py-3 px-5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-amber-500/10 text-xs">
                <Camera className="w-4 h-4 stroke-[2.5]" />
                Capturar ou Anexar Fotos
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageFile}
                  className="hidden"
                />
              </label>
            </div>

            {/* Photo Preview Grid */}
            {uploadedPhotos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {uploadedPhotos.map((photo, index) => (
                  <div key={index} className="bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden p-3 relative flex flex-col justify-between">
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all cursor-pointer z-10"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    
                    <div className="aspect-video w-full overflow-hidden rounded-xl bg-slate-900 relative">
                      <img src={photo.url} alt="Uploaded" className="w-full h-full object-cover" />
                    </div>

                    <input
                      type="text"
                      placeholder="Legenda da foto..."
                      value={photo.legenda}
                      onChange={(e) => updatePhotoLegend(index, e.target.value)}
                      className="w-full mt-3 px-3 py-1.5 bg-slate-900 border border-slate-800 focus:border-amber-500/30 rounded-xl text-white placeholder-slate-600 outline-none transition-all text-xs"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Assinatura Opcional */}
          <div className="pt-6 border-t border-slate-900 space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                Assinatura do Responsável Técnico
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Utilize seu dedo ou mouse na área abaixo para assinar este relatório diário.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 flex flex-col items-center max-w-md mx-auto relative overflow-hidden">
              <canvas
                ref={canvasRef}
                width={380}
                height={150}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="bg-slate-900 border border-slate-800 rounded-xl cursor-crosshair max-w-full touch-none"
              />
              <div className="flex justify-between items-center w-full mt-3 text-xs text-slate-400">
                <span>{hasSignature ? '✓ Assinado' : 'Toque acima para assinar'}</span>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-900 rounded-xl text-red-400 hover:text-red-300 font-semibold cursor-pointer transition-all text-[11px]"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  Limpar Assinatura
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Save Button - Ensures there is a Save button right before the support block */}
          <div className="pt-6 border-t border-slate-900 flex justify-end">
            <button
              type="button"
              onClick={handleSaveReport}
              disabled={!atividades}
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold py-3.5 px-8 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-amber-500/10 hover:shadow-amber-500/25 text-sm"
            >
              <Save className="w-5 h-5" />
              <span>Salvar Diário de Obra</span>
            </button>
          </div>

        </div>
      </main>

      <AnimatePresence>
        {showSuccessModal && savedReport && (() => {
          const recommendations = getContextualRecommendations(savedReport.atividades);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
              />

              {/* Modal Body */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
              >
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4 shadow-xl shadow-emerald-500/10">
                    <Check className="w-8 h-8 stroke-[2.5]" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white font-sans">
                    Diário Registrado com Sucesso!
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">
                    O relatório foi consolidado e armazenado na nuvem de forma segura.
                  </p>
                </div>

                {recommendations && (
                  <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-5 mb-6 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
                      <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                      <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest">
                        Recomendações para a Próxima Etapa
                      </h4>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      Identificamos que sua obra está na fase de <span className="font-bold text-amber-400">{recommendations.stageName}</span>. Veja estas sugestões úteis do ecossistema ObraMatch:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      
                      {/* Blog Post */}
                      <div className="bg-slate-900/50 border border-slate-850 rounded-xl p-4 flex flex-col justify-between group">
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-extrabold text-blue-400 uppercase tracking-wider block">
                            Blog Recomendado
                          </span>
                          <h5 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                            {recommendations.article.title}
                          </h5>
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {recommendations.article.summary}
                          </p>
                        </div>
                        <a
                          href={recommendations.article.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-amber-400 hover:text-amber-300 mt-3 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>Ler no Blog</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      {/* Specialist Agent */}
                      <div className="bg-slate-900/50 border border-slate-850 rounded-xl p-4 flex flex-col justify-between group">
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-extrabold text-purple-400 uppercase tracking-wider block">
                            Suporte de Especialista
                          </span>
                          <h5 className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors">
                            {recommendations.agent.name}
                          </h5>
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {recommendations.agent.description}
                          </p>
                        </div>
                        <a
                          href="https://agentes.obramatch.com.br/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-amber-400 hover:text-amber-300 mt-3 flex items-center gap-1 cursor-pointer transition-colors text-left"
                        >
                          <span>Acessar Agente</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                      </div>

                    </div>
                  </div>
                )}

                {/* Single, discrete promotion after save */}
                <ObraMatchSoftPromo variant="diario" className="my-4" />

                {/* Navigation Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setView('obra-dashboard', selectedObra)}
                    className="w-full sm:flex-1 py-3 px-4 border border-slate-800 hover:bg-slate-850 text-slate-300 hover:text-white font-semibold rounded-xl transition-all cursor-pointer text-xs"
                  >
                    Voltar para Obra
                  </button>
                  <button
                    onClick={() => setView('diario-detail', selectedObra, savedReport)}
                    className="w-full sm:flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 px-4 rounded-xl transition-all cursor-pointer text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10"
                  >
                    <FileText className="w-4 h-4" />
                    Ver Detalhes & PDF
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
