import { Mic } from 'lucide-react';

interface Props {
  disabled: boolean;
  onGravar: () => void;
}

// Botão grande de gravar. Abre o relatório e já inicia a gravação (fluxo de áudio/IA existente, sem alterações).
export default function GravarAgora({ disabled, onGravar }: Props) {
  return (
    <div className="campo-web-recorder">
    <button
      type="button"
      className="campo-web-record"
      disabled={disabled}
      onClick={() => {
        try { sessionStorage.setItem('om_gravar_ao_abrir', '1'); } catch { /* sem armazenamento */ }
        onGravar();
      }}
    >
      <Mic size={30} aria-hidden="true" />
      <span>Gravar RDO<small>Fale o que foi feito na obra</small></span>
    </button>
    <small>Ao parar, o áudio é enviado à IA para gerar o texto que você poderá revisar.</small>
    </div>
  );
}
