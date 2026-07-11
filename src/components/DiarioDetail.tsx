import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { calcularHashRdo } from '../lib/hash';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import ObraMatchSoftPromo from './ObraMatchSoftPromo';
import RdoPrintBlock from './RdoPrintBlock';
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
  const { selectedObra, selectedDiario, deleteDiario, setView, fotos, plano } = useApp();
  const [copied, setCopied] = useState(false);
  const [verificacao, setVerificacao] = useState<'idle' | 'integro' | 'alterado' | 'verificando'>('idle');

  if (!selectedObra || !selectedDiario) return null;

  const verificarIntegridade = async () => {
    if (!selectedDiario.hashIntegridade) return;
    setVerificacao('verificando');
    const recalculado = await calcularHashRdo({
      obraId: selectedDiario.obraId,
      numeroRdo: selectedDiario.numeroRdo || 0,
      data: selectedDiario.data || '',
      horario: selectedDiario.horario || '',
      clima: selectedDiario.clima || '',
      equipe: selectedDiario.equipe || '',
      atividades: selectedDiario.atividades || '',
      materiais: selectedDiario.materiais || '',
      ocorrencias: selectedDiario.ocorrencias || '',
      observacoes: selectedDiario.observacoes || '',
      gps: selectedDiario.gps || null,
    });
    setVerificacao(recalculado === selectedDiario.hashIntegridade ? 'integro' : 'alterado');
  };

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
    const shareText = `ObraMatch Diário — ${selectedObra.nome}\nData: ${new Date(selectedDiario.data + 'T12:00:00').toLocaleDateString('pt-BR')}\nAtividades: ${selectedDiario.atividades}\nRT: ${selectedObra.responsavelTecnico}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `ObraMatch Diário — ${selectedObra.nome}`,
          text: shareText,
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
    <div className="min-h-screen bg-[#F4F4F4] text-[#111111] flex flex-col pb-16 relative">
      
      {/* SCREEN UI CONTROLS (HIDDEN DURING PRINT) */}
      <div className="print:hidden flex flex-col w-full flex-1">
        {/* Navbar */}
        <header className="nb-topbar sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between w-full">
            <button
              onClick={() => setView('obra-dashboard', selectedObra)}
              className="flex items-center gap-2 text-blue-100 hover:text-[#FFB347] font-semibold transition-all cursor-pointer text-sm"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Painel da Obra</span>
            </button>

            <div className="flex items-center gap-2">
              {!selectedObra.arquivada && (
                <button
                  onClick={() => setView('diario-form', selectedObra, selectedDiario)}
                  className="p-2 text-blue-100 hover:text-[#FFB347] hover:bg-[#F4F4F4] rounded-xl transition-all cursor-pointer"
                  title="Editar Diário"
                  aria-label="Editar diário"
                >
                  <Edit className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={handleDelete}
                className="p-2 text-blue-100 hover:text-red-600 hover:bg-[#F4F4F4] rounded-xl transition-all cursor-pointer"
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
              <span className="text-xs font-bold text-[#FF6F00] uppercase tracking-wider">
                Relatório de Evolução{selectedDiario.numeroRdo ? ` · RDO Nº ${String(selectedDiario.numeroRdo).padStart(3, '0')}` : ''}
              </span>
              <h2 className="text-2xl font-black text-[#111111] mt-1">
                Diário de Obra — {new Date(selectedDiario.data + 'T12:00:00').toLocaleDateString('pt-BR')}
              </h2>
              {selectedDiario.hashIntegridade && (
                <button
                  onClick={verificarIntegridade}
                  className={`mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold cursor-pointer transition-all border ${
                    verificacao === 'alterado'
                      ? 'bg-red-50 border-red-500 text-red-600'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20'
                  }`}
                  title="Recalcula o código de integridade e compara com o registrado"
                >
                  {verificacao === 'alterado' ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  {verificacao === 'idle' && `🔒 Integridade ${selectedDiario.hashIntegridade.slice(0, 8)} — toque para verificar`}
                  {verificacao === 'verificando' && 'Verificando...'}
                  {verificacao === 'integro' && '✅ Registro íntegro — sem alterações'}
                  {verificacao === 'alterado' && '⚠️ Conteúdo divergente do código registrado'}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handlePrint}
                className="flex-1 sm:flex-initial bg-[#FF6F00] hover:bg-[#e86500] text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all text-xs"
              >
                <Printer className="w-4 h-4 stroke-[2.5]" />
                Gerar PDF / Imprimir
              </button>
              <button
                onClick={handleShare}
                className="flex-1 sm:flex-initial bg-white hover:bg-[#ECECEC] border border-[#D1D1D1] text-[#111111] font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all text-xs"
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
              <div className="nb-card p-6 sm:p-8 space-y-6">
                
                {/* Atividades Executadas */}
                <div>
                  <h3 className="text-xs font-bold text-[#FF6F00] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#FF6F00]" />
                    Atividades Executadas
                  </h3>
                  <p className="text-[#111111] text-sm leading-relaxed whitespace-pre-wrap bg-white border border-[#D1D1D1] rounded-xl p-4">
                    {selectedDiario.atividades}
                  </p>
                </div>

                {/* Team & Materials Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedDiario.equipe && (
                    <div>
                      <h4 className="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">Equipe Presente</h4>
                      <p className="text-[#222222] text-xs bg-white border border-[#D1D1D1] rounded-xl p-3 leading-relaxed whitespace-pre-wrap">
                        {selectedDiario.equipe}
                      </p>
                    </div>
                  )}
                  {selectedDiario.materiais && (
                    <div>
                      <h4 className="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">Materiais e Equipamentos (recebidos/utilizados)</h4>
                      <p className="text-[#222222] text-xs bg-white border border-[#D1D1D1] rounded-xl p-3 leading-relaxed whitespace-pre-wrap">
                        {selectedDiario.materiais}
                      </p>
                    </div>
                  )}
                </div>

                {/* Occurrences & General Notes */}
                {(selectedDiario.ocorrencias || selectedDiario.observacoes) && (
                  <div className="space-y-4 pt-4 border-t border-[#D1D1D1]">
                    {selectedDiario.ocorrencias && (
                      <div className="p-4 bg-[#FF6F00]/10 border border-[#FF6F00] rounded-xl">
                        <h4 className="text-xs font-bold text-[#FF6F00] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Info className="w-4 h-4" />
                          Ocorrências Registradas
                        </h4>
                        <p className="text-[#7a3d00] text-xs leading-relaxed whitespace-pre-wrap">
                          {selectedDiario.ocorrencias}
                        </p>
                      </div>
                    )}
                    {selectedDiario.observacoes && (
                      <div>
                        <h4 className="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">Observações Gerais</h4>
                        <p className="text-[#222222] text-xs leading-relaxed whitespace-pre-wrap bg-white p-3 rounded-xl">
                          {selectedDiario.observacoes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Photos Gallery */}
              {dPhotos.length > 0 && (
                <div className="bg-white border border-[#D1D1D1] rounded-xl p-6">
                  <h3 className="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-[#FF6F00]" />
                    Fotografias de Registro ({dPhotos.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {dPhotos.map((photo) => (
                      <div key={photo.id} className="bg-[#F4F4F4] border border-[#D1D1D1] rounded-xl overflow-hidden p-2.5">
                        <div className="aspect-video w-full overflow-hidden rounded-xl bg-white">
                          <img src={photo.url} alt={photo.legenda} className="w-full h-full object-cover" />
                        </div>
                        {photo.legenda && (
                          <p className="text-xs text-[#222222] italic mt-2.5 px-1">{photo.legenda}</p>
                        )}
                        <div className="flex justify-between items-center text-[10px] text-neutral-500 mt-2 px-1 font-semibold">
                          <span>Hora: {photo.horario}</span>
                          {photo.gps && (
                            <span className="text-[#FF6F00] font-mono">📍 GPS Sincronizado</span>
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
              <div className="bg-white border border-[#D1D1D1] rounded-xl p-6 space-y-4">
                <h3 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Detalhes do Registro</h3>
                
                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#D1D1D1]">
                  <span className="text-xs text-neutral-600">Condições do Clima</span>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#FF6F00]">
                    <ClimaIcon className="w-4 h-4" />
                    {selectedDiario.clima || 'Ensolarado'}
                  </div>
                </div>

                {(selectedDiario as any).condicaoTrabalho && (
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#D1D1D1]">
                    <span className="text-xs text-neutral-600">Condição de Trabalho</span>
                    <span className="text-xs font-bold text-[#111111]">
                      {(selectedDiario as any).condicaoTrabalho}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#D1D1D1]">
                  <span className="text-xs text-neutral-600">Horário Local</span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#111111]">
                    <Clock className="w-4 h-4 text-neutral-500" />
                    {selectedDiario.horario}
                  </div>
                </div>

                {selectedDiario.gps && (
                  <div className="p-3 bg-white rounded-xl border border-[#D1D1D1] space-y-1">
                    <span className="text-xs text-neutral-600 block">Localização GPS</span>
                    <span className="text-[11px] font-mono font-bold text-[#222222] block">
                      Lat: {selectedDiario.gps.latitude.toFixed(6)}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#222222] block">
                      Long: {selectedDiario.gps.longitude.toFixed(6)}
                    </span>
                  </div>
                )}
              </div>

              {/* Signature display */}
              {selectedDiario.assinatura && (
                <div className="bg-white border border-[#D1D1D1] rounded-xl p-6 flex flex-col items-center">
                  <h3 className="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-4 self-start">Assinatura Técnica</h3>
                  <div className="bg-white border border-[#D1D1D1] rounded-xl p-3 w-full max-w-xs flex justify-center">
                    <img 
                      src={selectedDiario.assinatura} 
                      alt="Assinatura" 
                      className="max-h-24 object-contain" 
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-neutral-500 mt-3 block">
                    {selectedObra.responsavelTecnico}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Custom Promotional section required by step 3 & 7 */}
          <div className="mt-8 pt-8 border-t border-[#D1D1D1] space-y-6" id="diario-detail-ecosystem-footer">
            <ObraMatchSoftPromo variant="footer" className="mt-0" />
          </div>
        </main>

      </div>

      {/* PRINT-ONLY TECHNICAL REPORT */}
      <div className="hidden print:block min-h-screen">
        <RdoPrintBlock obra={selectedObra} diario={selectedDiario} fotos={dPhotos} mostrarRodape={true} />
        {plano.plano === 'free' && (
          <p style={{ fontSize: '9px', color: '#666', textAlign: 'center', marginTop: '8px' }}>
            Gerado com ObraMatch Diário — RDO por voz com código de integridade · obramatch.com.br
          </p>
        )}
      </div>

    </div>
  );
}
