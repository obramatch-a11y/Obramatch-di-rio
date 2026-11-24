import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Pause, Play } from 'lucide-react';

interface Props {
  disabled: boolean;
  /** Chamado quando a gravação termina, com o áudio pronto para a IA. */
  onGravado: (audio: Blob) => void;
}

type Estado = 'ocioso' | 'gravando' | 'pausado';

const formatar = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

// Mesma experiência da web: botão grande, tempo de gravação, pausa/retomada e descarte.
// Só ao concluir é que o relatório abre, já com o texto pré-preenchido.
export default function GravarAgora({ disabled, onGravado }: Props) {
  const [estado, setEstado] = useState<Estado>('ocioso');
  const [duracaoMs, setDuracaoMs] = useState(0);
  const [erro, setErro] = useState('');
  const gravadorRef = useRef<MediaRecorder | null>(null);
  const pedacosRef = useRef<Blob[]>([]);
  const descartarRef = useRef(false);
  const acumuladoRef = useRef(0);
  const retomadoEmRef = useRef(0);

  useEffect(() => {
    if (estado !== 'gravando') return;
    const t = window.setInterval(() => setDuracaoMs(acumuladoRef.current + (Date.now() - retomadoEmRef.current)), 250);
    return () => window.clearInterval(t);
  }, [estado]);

  useEffect(() => () => {
    descartarRef.current = true;
    try { gravadorRef.current?.stream.getTracks().forEach((t) => t.stop()); } catch { /* já parado */ }
  }, []);

  const iniciar = async () => {
    setErro('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const gravador = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '' });
      pedacosRef.current = [];
      descartarRef.current = false;
      gravador.ondataavailable = (ev) => { if (ev.data.size > 0) pedacosRef.current.push(ev.data); };
      gravador.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (descartarRef.current) return;
        const audio = new Blob(pedacosRef.current, { type: gravador.mimeType || 'audio/webm' });
        if (audio.size < 1000) { setErro('Áudio muito curto. Fale por alguns segundos e toque em concluir.'); return; }
        onGravado(audio);
      };
      gravador.start();
      gravadorRef.current = gravador;
      acumuladoRef.current = 0;
      retomadoEmRef.current = Date.now();
      setDuracaoMs(0);
      setEstado('gravando');
    } catch {
      setErro('Não foi possível acessar o microfone. Permita o microfone nas configurações do aplicativo.');
    }
  };

  const pausar = () => {
    const g = gravadorRef.current;
    if (!g || g.state !== 'recording') return;
    g.pause();
    acumuladoRef.current += Date.now() - retomadoEmRef.current;
    setDuracaoMs(acumuladoRef.current);
    setEstado('pausado');
  };
  const retomar = () => {
    const g = gravadorRef.current;
    if (!g || g.state !== 'paused') return;
    g.resume();
    retomadoEmRef.current = Date.now();
    setEstado('gravando');
  };
  const concluir = () => { setEstado('ocioso'); gravadorRef.current?.stop(); };
  const descartar = () => { descartarRef.current = true; setEstado('ocioso'); setDuracaoMs(0); gravadorRef.current?.stop(); };

  const ativo = estado !== 'ocioso';
  return (
    <div className="campo-web-recorder" data-gravando={ativo} data-pausado={estado === 'pausado'}>
      <button
        type="button"
        className="campo-web-record"
        disabled={!ativo && disabled}
        onClick={ativo ? concluir : iniciar}
        aria-describedby="campo-web-record-consent"
      >
        {ativo ? <Square size={24} aria-hidden="true" /> : <Mic size={30} aria-hidden="true" />}
        <span>{ativo ? 'Concluir gravação' : 'Gravar RDO'}<small>{ativo ? formatar(duracaoMs) : 'Fale o que foi feito na obra'}</small></span>
      </button>
      <small id="campo-web-record-consent">Ao parar, o áudio é enviado à IA para gerar o texto que você poderá revisar.</small>
      {ativo && <p className="campo-web-record-status" role="status">{estado === 'pausado' ? 'Gravação pausada' : 'Gravando'}</p>}
      {erro && <p className="campo-web-record-error" role="alert">{erro}</p>}
      {ativo && (
        <div className="campo-web-record-actions">
          <button type="button" onClick={estado === 'pausado' ? retomar : pausar}>
            {estado === 'pausado' ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
            {estado === 'pausado' ? 'Retomar gravação' : 'Pausar gravação'}
          </button>
          <button type="button" onClick={descartar}>Descartar áudio</button>
        </div>
      )}
    </div>
  );
}
