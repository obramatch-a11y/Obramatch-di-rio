import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, X } from 'lucide-react';

interface NovaObraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    nome: string;
    cliente: string;
    responsavelTecnico: string;
    endereco: string;
    gps: { latitude: number; longitude: number } | null;
    dataInicio: string;
    observacoes: string;
  }) => Promise<void>;
  loading?: boolean;
}

export default function NovaObraModal({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
}: NovaObraModalProps) {
  // Form states
  const [nome, setNome] = useState('');
  const [cliente, setCliente] = useState('');
  const [responsavelTecnico, setResponsavelTecnico] = useState('');
  const [endereco, setEndereco] = useState('');
  const [gpsObra, setGpsObra] = useState<{ latitude: number; longitude: number } | null>(null);
  const [capturandoGps, setCapturandoGps] = useState(false);
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [observacoes, setObservacoes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Close modal on ESC key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Capture GPS
  const capturarGps = () => {
    if (!navigator.geolocation) return;
    setCapturandoGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsObra({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setCapturandoGps(false);
      },
      () => setCapturandoGps(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !cliente || !responsavelTecnico) return;

    setIsLoading(true);
    try {
      await onSubmit({
        nome,
        cliente,
        responsavelTecnico,
        endereco,
        gps: gpsObra,
        dataInicio,
        observacoes,
      });

      // Clear form and close modal
      setNome('');
      setGpsObra(null);
      setCliente('');
      setEndereco('');
      setResponsavelTecnico('');
      setDataInicio(new Date().toISOString().split('T')[0]);
      setObservacoes('');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40"
          />

          {/* Content Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-lg nb-card nb-shadow p-6 z-10 overflow-y-auto max-h-[90vh]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-nova-obra-title"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 id="modal-nova-obra-title" className="text-xl font-extrabold tracking-tight text-[#111111] font-sans">
                Cadastrar Nova Obra
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-[#ECECEC] rounded-xl text-neutral-600 hover:text-[#111111] transition-all cursor-pointer"
                aria-label="Fechar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="obra-nome" className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">
                  Nome da Obra *
                </label>
                <input
                  id="obra-nome"
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Residencial Bella Vista - Bloco A"
                  className="w-full px-4 py-3 nb-input focus:ring-1 focus:ring-[#FF6F00]/40  placeholder-neutral-400  text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="obra-cliente" className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">
                    Cliente *
                  </label>
                  <input
                    id="obra-cliente"
                    type="text"
                    required
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    placeholder="Nome do Proprietário/Empresa"
                    className="w-full px-4 py-3 nb-input focus:ring-1 focus:ring-[#FF6F00]/40  placeholder-neutral-400  text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="obra-responsavel" className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">
                    Responsável Técnico *
                  </label>
                  <input
                    id="obra-responsavel"
                    type="text"
                    required
                    value={responsavelTecnico}
                    onChange={(e) => setResponsavelTecnico(e.target.value)}
                    placeholder="Eng. João Silva (CREA/CAU)"
                    className="w-full px-4 py-3 nb-input focus:ring-1 focus:ring-[#FF6F00]/40  placeholder-neutral-400  text-sm"
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
                  placeholder="Rua das Flores, 123 - Centro"
                  className="w-full px-4 py-3 nb-input focus:ring-1 focus:ring-[#FF6F00]/40  placeholder-neutral-400  text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">
                  Localização da Obra (para o clima oficial do RDO)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={capturarGps}
                    disabled={capturandoGps}
                    className="nb-btn nb-btn-ghost py-3 px-4 flex items-center gap-2 text-xs"
                  >
                    <MapPin className="w-4 h-4 text-[#FF6F00]" />
                    {capturandoGps ? 'Capturando...' : 'Capturar localização'}
                  </button>
                  <div className="flex-1 px-4 py-3 bg-white rounded-xl border border-[#D1D1D1] text-xs font-mono text-neutral-600 truncate">
                    {gpsObra ? `📍 ${gpsObra.latitude.toFixed(5)}, ${gpsObra.longitude.toFixed(5)}` : 'Estando na obra, toque para capturar'}
                  </div>
                </div>
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
                  placeholder="Notas ou detalhes iniciais do contrato..."
                  className="w-full px-4 py-3 nb-input focus:ring-1 focus:ring-[#FF6F00]/40  placeholder-neutral-400  text-sm resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-[#D1D1D1]">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 nb-btn nb-btn-ghost py-3 px-4 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading || loading}
                  className="flex-1 nb-btn nb-btn-primary py-3 px-4 text-sm"
                >
                  {isLoading || loading ? 'Adicionando...' : 'Salvar Obra'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
