import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import AdSenseBlock from './AdSenseBlock';
import ObraMatchEcosystemCard from './ObraMatchEcosystemCard';
import { 
  ArrowLeft, 
  Printer, 
  Share2, 
  Edit, 
  Trash2, 
  Calendar, 
  Clock, 
  MapPin, 
  Sun, 
  Cloud, 
  CloudRain, 
  CloudLightning,
  User, 
  FileText,
  Mail,
  Camera,
  Info,
  CheckCircle,
  HardHat,
  Share
} from 'lucide-react';

const CLIMA_ICONS: { [key: string]: any } = {
  'Ensolarado': Sun,
  'Nublado': Cloud,
  'Chuvoso': CloudRain,
  'Instável': CloudLightning,
};

export default function DiarioDetail() {
  const { selectedObra, selectedDiario, deleteDiario, setView, fotos } = useApp();
  const [copied, setCopied] = useState(false);

  if (!selectedObra || !selectedDiario) return null;

  const dPhotos = fotos.filter(f => f.diarioId === selectedDiario.id);
  const ClimaIcon = CLIMA_ICONS[selectedDiario.clima || 'Ensolarado'] || Sun;

  const handleDelete = async () => {
    if (window.confirm('Tem certeza que deseja excluir permanentemente este diário de obra?')) {
      try {
        await deleteDiario(selectedDiario.id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const shareText = `Diário de Obra - ${selectedObra.nome}\nData: ${new Date(selectedDiario.data + 'T12:00:00').toLocaleDateString('pt-BR')}\nAtividades: ${selectedDiario.atividades}\nRT: ${selectedObra.responsavelTecnico}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Diário - ${selectedObra.nome}`,
          text: shareText,
          url: window.location.href
        });
      } catch (err) {
        console.warn('Share error:', err);
      }
    } else {
      // Fallback copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-16 relative">
      
      {/* SCREEN UI CONTROLS (HIDDEN DURING PRINT) */}
      <div className="print:hidden flex flex-col w-full flex-1">
        {/* Navbar */}
        <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between w-full">
            <button
              onClick={() => setView('obra-dashboard', selectedObra)}
              className="flex items-center gap-2 text-slate-400 hover:text-white font-semibold transition-all cursor-pointer text-sm"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Painel da Obra</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('diario-form', selectedObra, selectedDiario)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
                title="Editar Diário"
              >
                <Edit className="w-5 h-5" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
                title="Excluir Diário"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Details */}
        <main className="max-w-4xl mx-auto px-4 w-full pt-6 flex-1">
          {/* Action Header Card */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Relatório de Evolução</span>
              <h2 className="text-2xl font-black text-white mt-1">
                Diário de Obra — {new Date(selectedDiario.data + 'T12:00:00').toLocaleDateString('pt-BR')}
              </h2>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handlePrint}
                className="flex-1 sm:flex-initial bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-amber-500/10 text-xs"
              >
                <Printer className="w-4 h-4 stroke-[2.5]" />
                Gerar PDF / Imprimir
              </button>
              <button
                onClick={handleShare}
                className="flex-1 sm:flex-initial bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all text-xs"
              >
                <Share2 className="w-4 h-4" />
                {copied ? 'Copiado!' : 'Compartilhar'}
              </button>
            </div>
          </div>

          {/* Core Info Panels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-2 space-y-6">
              
              {/* Report Body */}
              <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-6 sm:p-8 space-y-6">
                
                {/* Atividades Executadas */}
                <div>
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-500" />
                    Atividades Executadas
                  </h3>
                  <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap bg-slate-950/40 border border-slate-900/50 rounded-2xl p-4">
                    {selectedDiario.atividades}
                  </p>
                </div>

                {/* Team & Materials Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedDiario.equipe && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Equipe Presente</h4>
                      <p className="text-slate-300 text-xs bg-slate-950/20 border border-slate-900/50 rounded-2xl p-3 leading-relaxed whitespace-pre-wrap">
                        {selectedDiario.equipe}
                      </p>
                    </div>
                  )}
                  {selectedDiario.materiais && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Materiais Recebidos</h4>
                      <p className="text-slate-300 text-xs bg-slate-950/20 border border-slate-900/50 rounded-2xl p-3 leading-relaxed whitespace-pre-wrap">
                        {selectedDiario.materiais}
                      </p>
                    </div>
                  )}
                </div>

                {/* Occurrences & General Notes */}
                {(selectedDiario.ocorrencias || selectedDiario.observacoes) && (
                  <div className="space-y-4 pt-4 border-t border-slate-900/50">
                    {selectedDiario.ocorrencias && (
                      <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Info className="w-4 h-4" />
                          Ocorrências Registradas
                        </h4>
                        <p className="text-amber-200 text-xs leading-relaxed whitespace-pre-wrap">
                          {selectedDiario.ocorrencias}
                        </p>
                      </div>
                    )}
                    {selectedDiario.observacoes && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Observações Gerais</h4>
                        <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap bg-slate-950/20 p-3 rounded-2xl">
                          {selectedDiario.observacoes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Photos Gallery */}
              {dPhotos.length > 0 && (
                <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-6">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-amber-500" />
                    Fotografias de Registro ({dPhotos.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {dPhotos.map((photo) => (
                      <div key={photo.id} className="bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden p-2.5">
                        <div className="aspect-video w-full overflow-hidden rounded-xl bg-slate-900">
                          <img src={photo.url} alt={photo.legenda} className="w-full h-full object-cover" />
                        </div>
                        {photo.legenda && (
                          <p className="text-xs text-slate-300 italic mt-2.5 px-1">{photo.legenda}</p>
                        )}
                        <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 px-1 font-semibold">
                          <span>Hora: {photo.horario}</span>
                          {photo.gps && (
                            <span className="text-amber-500 font-mono">📍 GPS Sincronizado</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Details & Signature */}
            <div className="space-y-6">
              
              {/* Weather & Location Summary */}
              <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-6 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detalhes do Registro</h3>
                
                <div className="flex items-center justify-between p-3 bg-slate-950/40 rounded-2xl border border-slate-900/50">
                  <span className="text-xs text-slate-400">Condições do Clima</span>
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <ClimaIcon className="w-4 h-4" />
                    {selectedDiario.clima || 'Ensolarado'}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-950/40 rounded-2xl border border-slate-900/50">
                  <span className="text-xs text-slate-400">Horário Local</span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Clock className="w-4 h-4 text-slate-500" />
                    {selectedDiario.horario}
                  </div>
                </div>

                {selectedDiario.gps && (
                  <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-900/50 space-y-1">
                    <span className="text-xs text-slate-400 block">Localização GPS</span>
                    <span className="text-[11px] font-mono font-bold text-slate-300 block">
                      Lat: {selectedDiario.gps.latitude.toFixed(6)}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-300 block">
                      Long: {selectedDiario.gps.longitude.toFixed(6)}
                    </span>
                  </div>
                )}
              </div>

              {/* Signature display */}
              {selectedDiario.assinatura && (
                <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-6 flex flex-col items-center">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 self-start">Assinatura Técnica</h3>
                  <div className="bg-slate-900 border border-slate-850 rounded-2xl p-3 w-full max-w-xs flex justify-center">
                    <img 
                      src={selectedDiario.assinatura} 
                      alt="Assinatura" 
                      className="max-h-24 object-contain invert hue-rotate-180 brightness-150" 
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 mt-3 block">
                    {selectedObra.responsavelTecnico}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Custom Promotional section required by step 3 & 7 */}
          <div className="mt-8 pt-8 border-t border-slate-900/50 space-y-6" id="diario-detail-ecosystem-footer">
            <div className="bg-slate-900/50 border border-slate-850 rounded-2xl p-6 text-center space-y-4">
              <h4 className="text-sm font-bold text-slate-300">
                Conheça mais soluções no ecossistema ObraMatch.
              </h4>
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold">
                <a
                  href="https://obramatch.com.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:text-amber-300 underline transition-colors"
                >
                  ObraMatch
                </a>
                <span className="text-slate-600">•</span>
                <a
                  href="https://obramatchof.blogspot.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:text-amber-300 underline transition-colors"
                >
                  Blog ObraMatch
                </a>
                <span className="text-slate-600">•</span>
                <a
                  href="https://agentes.obramatch.com.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:text-amber-300 underline transition-colors"
                >
                  Agentes Match
                </a>
              </div>
            </div>
            
            <AdSenseBlock className="w-full" />
          </div>
        </main>

      </div>

      {/* PRINT-ONLY TECHNICAL REPORT (CLEAN PORTUGUESE TECHNICAL LAYOUT OTIMIZADO PARA PDF) */}
      <div className="hidden print:block bg-white text-black p-8 font-serif leading-relaxed text-sm w-full min-h-screen">
        
        {/* Header Block */}
        <div className="border-b-4 border-slate-800 pb-4 mb-6 flex justify-between items-start">
          <div>
            <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">ECOSSISTEMA OBRAMATCH</span>
            <h1 className="text-2xl font-black text-slate-900 font-sans tracking-tight mt-1">
              OBRAMATCH DIÁRIO
            </h1>
            <p className="text-xs text-slate-500 italic mt-1">Relatório Técnico Diário de Execução</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-extrabold text-slate-900 font-mono">
              {new Date(selectedDiario.data + 'T12:00:00').toLocaleDateString('pt-BR')}
            </div>
            <div className="text-xs text-slate-500 font-sans mt-0.5">Emissão: {new Date().toLocaleString('pt-BR')}</div>
          </div>
        </div>

        {/* Technical Metadata Table */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6 p-4 bg-slate-100 rounded-xl font-sans text-xs border border-slate-200">
          <div>
            <span className="text-slate-500 font-bold block uppercase tracking-wider text-[10px]">OBRA:</span>
            <span className="text-slate-900 font-bold text-sm">{selectedObra.nome}</span>
          </div>
          <div>
            <span className="text-slate-500 font-bold block uppercase tracking-wider text-[10px]">CLIENTE:</span>
            <span className="text-slate-900 font-bold text-sm">{selectedObra.cliente}</span>
          </div>
          <div>
            <span className="text-slate-500 font-bold block uppercase tracking-wider text-[10px]">RESPONSÁVEL TÉCNICO:</span>
            <span className="text-slate-900 font-semibold">{selectedObra.responsavelTecnico}</span>
          </div>
          <div>
            <span className="text-slate-500 font-bold block uppercase tracking-wider text-[10px]">CLIMA / CONDIÇÕES:</span>
            <span className="text-slate-900 font-semibold">{selectedDiario.clima || 'Ensolarado'}</span>
          </div>
          {selectedObra.endereco && (
            <div className="col-span-2">
              <span className="text-slate-500 font-bold block uppercase tracking-wider text-[10px]">LOCALIZAÇÃO:</span>
              <span className="text-slate-900 font-semibold">{selectedObra.endereco}</span>
            </div>
          )}
          {selectedDiario.gps && (
            <div className="col-span-2">
              <span className="text-slate-500 font-bold block uppercase tracking-wider text-[10px]">COORDENADAS GPS (REPORT):</span>
              <span className="text-slate-900 font-mono">📍 {selectedDiario.gps.latitude.toFixed(6)}, {selectedDiario.gps.longitude.toFixed(6)}</span>
            </div>
          )}
        </div>

        {/* Content Section: Atividades */}
        <div className="mb-6 font-sans">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-300 pb-1 mb-3">
            1. ATIVIDADES EXECUTADAS DO DIA
          </h3>
          <p className="text-slate-900 text-sm whitespace-pre-wrap leading-relaxed">
            {selectedDiario.atividades}
          </p>
        </div>

        {/* Content Section: Equipe & Materiais */}
        <div className="grid grid-cols-2 gap-6 mb-6 font-sans text-xs">
          {selectedDiario.equipe && (
            <div>
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-300 pb-1 mb-2">
                2. EQUIPE PRESENTE
              </h3>
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {selectedDiario.equipe}
              </p>
            </div>
          )}
          {selectedDiario.materiais && (
            <div>
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-300 pb-1 mb-2">
                3. MATERIAIS RECEBIDOS
              </h3>
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {selectedDiario.materiais}
              </p>
            </div>
          )}
        </div>

        {/* Content Section: Ocorrências */}
        {selectedDiario.ocorrencias && (
          <div className="mb-6 font-sans text-xs">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-300 pb-1 mb-2">
              4. OCORRÊNCIAS / IMPREVISTOS
            </h3>
            <p className="text-red-800 font-bold whitespace-pre-wrap leading-relaxed">
              ⚠️ {selectedDiario.ocorrencias}
            </p>
          </div>
        )}

        {/* Content Section: Observações */}
        {selectedDiario.observacoes && (
          <div className="mb-6 font-sans text-xs">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-300 pb-1 mb-2">
              5. OBSERVAÇÕES COMPLEMENTARES
            </h3>
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
              {selectedDiario.observacoes}
            </p>
          </div>
        )}

        {/* Photos grid */}
        {dPhotos.length > 0 && (
          <div className="mb-8 font-sans page-break-before">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-300 pb-1 mb-4">
              6. REGISTRO FOTOGRÁFICO
            </h3>
            <div className="grid grid-cols-2 gap-6">
              {dPhotos.map((photo) => (
                <div key={photo.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                  <div className="aspect-video w-full overflow-hidden rounded-lg mb-2">
                    <img src={photo.url} alt="Evidência" className="w-full h-full object-cover" />
                  </div>
                  {photo.legenda && (
                    <p className="text-[11px] text-slate-700 italic font-semibold">{photo.legenda}</p>
                  )}
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5 font-mono">
                    <span>Hora: {photo.horario}</span>
                    {photo.gps && (
                      <span>GPS: {photo.gps.latitude.toFixed(5)}, {photo.gps.longitude.toFixed(5)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signatures footer block */}
        <div className="mt-12 pt-8 border-t border-slate-300 font-sans flex flex-col items-center">
          {selectedDiario.assinatura && (
            <div className="mb-3 flex justify-center">
              <img 
                src={selectedDiario.assinatura} 
                alt="Assinatura" 
                className="max-h-20 object-contain" 
              />
            </div>
          )}
          <div className="w-64 border-t border-slate-900 my-1"></div>
          <p className="text-xs font-bold text-slate-900 uppercase">{selectedObra.responsavelTecnico}</p>
          <p className="text-[10px] text-slate-500">Responsável Técnico (CREA/CAU)</p>
        </div>

        {/* Generation stamp in footer */}
        <div className="mt-16 text-center font-sans border-t border-slate-200 pt-4 flex flex-col items-center gap-1">
          <p className="text-[10px] text-slate-500 font-bold">
            Relatório gerado automaticamente via ObraMatch Diário.
          </p>
          <p className="text-[9px] text-slate-400 max-w-xl leading-relaxed">
            ObraMatch: Encontre profissionais avaliados para sua obra com mais segurança. Economize tempo, tenha histórico de obras visível e faça contato direto sem intermediários. Acesse o site oficial em <a href="https://obramatch.com.br/" target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-600 hover:underline">obramatch.com.br</a>
          </p>
        </div>
      </div>

    </div>
  );
}
