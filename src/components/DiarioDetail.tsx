import React, { useEffect, useState } from 'react';
import { useDialog } from './dialog/dialogContext';
import { useApp } from '../context/AppContext';
import { calcularHashRdo } from '../lib/hash';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import ObraMatchSoftPromo from './ObraMatchSoftPromo';
import { montarDocumentoRdo, entregarPdfRdo } from '../lib/documentoRdo';
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
  const dialog = useDialog();
  const { selectedObra, selectedDiario, deleteDiario, setView, fotos, plano } = useApp();
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
    const confirmado = await dialog.confirm({
      title: 'Excluir este diário?',
      message: 'Tem certeza que deseja excluir permanentemente este diário de obra? Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (confirmado) {
      try {
        await deleteDiario(selectedDiario.id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const dataBr = new Date(selectedDiario.data + 'T12:00:00').toLocaleDateString('pt-BR');
  const condicao = (selectedDiario as any).condicaoTrabalho as string | undefined;
  const secoes: [string, string | undefined][] = [
    ['Atividades', selectedDiario.atividades],
    ['Equipe', selectedDiario.equipe],
    ['Materiais', selectedDiario.materiais],
    ['Ocorrências', selectedDiario.ocorrencias],
    ['Observações', selectedDiario.observacoes],
  ];
  const [gerando, setGerando] = useState<'' | 'baixar' | 'compartilhar'>('');
  const [avisoPdf, setAvisoPdf] = useState('');
  const gerarPdf = async (modo: 'baixar' | 'compartilhar') => {
    if (gerando) return;
    setGerando(modo); setAvisoPdf('');
    try {
      const doc = montarDocumentoRdo(selectedObra, selectedDiario, dPhotos, { semRodapeObraMatch: plano.plano !== 'free' });
      const r = await entregarPdfRdo(doc, modo);
      setAvisoPdf(r === 'baixado' ? 'PDF gerado. Veja em Downloads.' : '');
    } catch (err) {
      setAvisoPdf(err instanceof Error ? err.message : 'Não foi possível gerar o PDF.');
    } finally { setGerando(''); }
  };

  return (
    <div className="app-shell">

      {/* TELA (oculta na impressão): mesmo padrão dos relatórios da empresa */}
      <div className="print:hidden">
        <header className="app-shell-header">
          <div className="app-shell-header-inner">
            <button type="button" className="app-brand" onClick={() => setView('obra-dashboard', selectedObra)} aria-label="Voltar para os relatórios da obra">
              <span className="app-brand-mark" aria-hidden="true"><ArrowLeft size={22} /></span>
              <span>Relatório <strong>{selectedObra.nome}</strong></span>
            </button>
          </div>
        </header>

        <main className="app-dashboard campo-web-dashboard" style={{ paddingBottom: 90, display: 'grid', gap: 12 }}>
          <div className="rel-hero">
            <small>Relatório diário de obra{selectedDiario.numeroRdo ? ` · Nº ${String(selectedDiario.numeroRdo).padStart(3, '0')}` : ''}</small>
            <h2>RDO {dataBr}</h2>
            <div className="rel-chips">
              {selectedDiario.horario && <span className="rel-chip"><Clock size={12} aria-hidden="true" />&nbsp;{selectedDiario.horario}</span>}
              <span className="rel-chip"><ClimaIcon size={12} aria-hidden="true" />&nbsp;{selectedDiario.clima || 'Ensolarado'}</span>
              {condicao && <span className="rel-chip">{condicao}</span>}
              {selectedObra.arquivada && <span className="rel-chip">Obra arquivada</span>}
            </div>
          </div>

          {selectedDiario.hashIntegridade && (
            <div className="rel-secao" style={{ borderLeftColor: verificacao === 'alterado' ? '#b42318' : '#087a36' }}>
              <button type="button" onClick={verificarIntegridade} className="campo-web-manual" style={{ width: '100%', justifyContent: 'center' }}>
                {verificacao === 'alterado' ? <ShieldAlert size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}
                {verificacao === 'idle' && `Integridade ${selectedDiario.hashIntegridade.slice(0, 8)} · toque para verificar`}
                {verificacao === 'verificando' && 'Verificando…'}
                {verificacao === 'integro' && 'Conteúdo corresponde ao código atual'}
                {verificacao === 'alterado' && 'Conteúdo divergente do código registrado'}
              </button>
              <p style={{ marginTop: 8, fontSize: 12, color: '#5d6678' }}>Este código verifica a consistência do conteúdo atual. Ele não comprova autoria nem preserva histórico de alterações.</p>
            </div>
          )}

          <div className="rel-fotos-botoes">
            <button type="button" className="campo-web-record" style={{ minHeight: 56 }} disabled={!!gerando} onClick={() => void gerarPdf('baixar')}><Printer size={20} aria-hidden="true" /> {gerando === 'baixar' ? 'Gerando PDF…' : 'Gerar PDF'}</button>
            <button type="button" className="campo-web-manual" disabled={!!gerando} onClick={() => void gerarPdf('compartilhar')}><Share2 size={19} aria-hidden="true" /> {gerando === 'compartilhar' ? 'Preparando…' : 'Compartilhar PDF'}</button>
          </div>
          {avisoPdf && <p role="status" className="campo-web-escolher-obra">{avisoPdf}</p>}
          {!selectedObra.arquivada && (
            <button type="button" className="campo-web-manual" onClick={() => setView('diario-form', selectedObra, selectedDiario)}><Edit size={19} aria-hidden="true" /> Editar relatório</button>
          )}

          {secoes.map(([titulo, texto]) => texto && texto.trim() && (
            <section key={titulo} className="rel-secao" style={titulo === 'Ocorrências' ? { background: '#fff8f0' } : undefined}>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </section>
          ))}

          {dPhotos.length > 0 && (
            <section className="rel-secao">
              <h3><Camera size={16} style={{ verticalAlign: '-3px' }} /> Fotos ({dPhotos.length})</h3>
              <div className="rel-fotos">
                {dPhotos.map((photo) => (
                  <figure key={photo.id}>
                    <img src={photo.url} alt={photo.legenda || 'Foto do relatório'} />
                    {(photo.legenda || photo.horario) && <figcaption>{photo.legenda}{photo.legenda && photo.horario ? ' · ' : ''}{photo.horario}</figcaption>}
                  </figure>
                ))}
              </div>
            </section>
          )}

          {selectedDiario.gps && (
            <section className="rel-secao">
              <h3><MapPin size={16} style={{ verticalAlign: '-3px' }} /> Localização</h3>
              <p>Lat {selectedDiario.gps.latitude.toFixed(6)} · Long {selectedDiario.gps.longitude.toFixed(6)}</p>
            </section>
          )}

          {selectedDiario.assinatura && (
            <section className="rel-secao">
              <h3>Assinatura técnica</h3>
              <img src={selectedDiario.assinatura} alt="Assinatura" style={{ maxHeight: 96, objectFit: 'contain' }} />
              {selectedObra.responsavelTecnico && <p style={{ fontSize: 13, color: '#5d6678' }}>{selectedObra.responsavelTecnico}</p>}
            </section>
          )}

          <button type="button" className="campo-web-manual" style={{ color: '#b42318' }} onClick={handleDelete}><Trash2 size={18} aria-hidden="true" /> Excluir relatório</button>

          <div id="diario-detail-ecosystem-footer"><ObraMatchSoftPromo variant="footer" className="mt-0" /></div>
        </main>
      </div>

    </div>
  );
}

