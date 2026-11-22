import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import type { User } from 'firebase/auth';
import { ativarNotificacoes, situacaoPush, type SituacaoPush } from '../lib/push';

/** Convida a receber avisos no celular; se já houver permissão, só atualiza o aparelho em silêncio. */
export default function LigarAvisos({ user }: { user: User }) {
  const [situacao, setSituacao] = useState<SituacaoPush>(() => situacaoPush());
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    if (situacaoPush() !== 'ativo') return;
    void ativarNotificacoes(user, false).then(setSituacao);
  }, [user]);

  if (situacao === 'indisponivel' || situacao === 'ativo') return null;
  if (situacao === 'negado') {
    return <p className="campo-web-escolher-obra" role="status">Avisos no celular desligados. Para ligar, permita as notificações do ObraMatch Diário nas configurações do celular.</p>;
  }
  return (
    <section className="rdo-alertas" aria-label="Avisos no celular">
      <h2><BellRing size={20} aria-hidden="true" /> Receber avisos no celular</h2>
      <span>Saiba na hora quando um RDO seu for devolvido ou quando chegar um RDO para você revisar.</span>
      <div className="rdo-alerta-acoes">
        <button type="button" disabled={ocupado} onClick={() => {
          setOcupado(true); setAviso('');
          void ativarNotificacoes(user, true).then((r) => {
            setSituacao(r);
            if (r === 'indisponivel') setAviso('Não foi possível ligar os avisos neste aparelho.');
          }).finally(() => setOcupado(false));
        }}>{ocupado ? 'Ligando…' : 'Ligar avisos'}</button>
      </div>
      {aviso && <p role="alert">{aviso}</p>}
    </section>
  );
}
