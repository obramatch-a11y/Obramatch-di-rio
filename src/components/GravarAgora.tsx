import { useEffect, useRef, useState } from 'react';
import { Mic, Square, X } from 'lucide-react';

interface Props {
  disabled: boolean;
  /** Chamado quando a gravação termina, com o áudio pronto para a IA. */
  onGravado: (audio: Blob) => void;
}

// Grava aqui mesmo na tela inicial. Só ao parar é que o relatório abre, já com o texto pré-preenchido.
export default function GravarAgora({ disabled, onGravado }: Props) {
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [erro, setErro] = useState('');
  const gravadorRef = useRef<MediaRecorder | null>(null);
  const pedacosRef = useRef<Blob[]>([]);
  const descartarRef = useRef(false);

  useEffect(() => {
    if (!gravando) return;
    const t = window.setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [gravando]);

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
        if (audio.size < 1000) { setErro('Áudio muito curto. Fale por alguns segundos e toque em parar.'); return; }
        onGravado(audio);
      };
      gravador.start();
      gravadorRef.current = gravador;
      setSegundos(0);
      setGravando(true);
    } catch {
      setErro('Não foi possível acessar o microfone. Permita o microfone nas configurações do aplicativo.');
    }
  };

  const parar = () => { setGravando(false); gravadorRef.current?.stop(); };
  const cancelar = () => { descartarRef.current = true; setGravando(false); gravadorRef.current?.stop(); };
  const tempo = `${String(Math.floor(segundos / 60)).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`;

  if (gravando) {
    return (
      <div className="campo-web-recorder">
        <button type="button" className="campo-web-record is-gravando" onClick={parar}>
          <Square size={28} aria-hidden="true" />
          <span>Parar e continuar<small>Gravando… {tempo}</small></span>
        </button>
        <button type="button" className="campo-web-cancelar" onClick={cancelar}><X size={16} aria-hidden="true" /> Cancelar gravação</button>
      </div>
    );
  }
  return (
    <div className="campo-web-recorder">
      <button type="button" className="campo-web-record" disabled={disabled} onClick={iniciar}>
        <Mic size={30} aria-hidden="true" />
        <span>Gravar RDO<small>Fale o que foi feito na obra</small></span>
      </button>
      {erro ? <small role="alert" style={{ color: '#b42318', fontWeight: 700 }}>{erro}</small> : <small>Ao parar, o relatório abre já preenchido para você revisar.</small>}
    </div>
  );
}
