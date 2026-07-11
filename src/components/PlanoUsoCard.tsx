import React from 'react';
import { useApp } from '../context/AppContext';
import { LIMITES_PLANO } from '../types';
import { Crown, Mic, Wand2 } from 'lucide-react';

function Barra({ usado, total }: { usado: number; total: number }) {
  const pct = Math.min(100, Math.round((usado / total) * 100));
  const cor = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-[#FF6F00]' : 'bg-[#0A3D91]';
  return (
    <div className="h-2 w-full bg-[#F4F4F4] border border-[#D1D1D1] rounded-full overflow-hidden">
      <div className={`h-full ${cor} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function PlanoUsoCard() {
  const { plano, usoIa } = useApp();
  const l = LIMITES_PLANO[plano.plano];
  return (
    <div className="nb-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-display font-black text-[#111] flex items-center gap-2">
          <Crown className={`w-4 h-4 ${plano.plano === 'pro' ? 'text-[#FF6F00]' : 'text-neutral-400'}`} />
          Plano {plano.plano === 'pro' ? 'PRO' : 'Gratuito'}
        </h3>
        {plano.plano === 'pro' && plano.validade && (
          <span className="text-[10px] text-neutral-500 font-semibold">
            Renova em {new Date(plano.validade).toLocaleDateString('pt-BR')}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-neutral-600">
          <span className="flex items-center gap-1.5 font-semibold"><Mic className="w-3.5 h-3.5" /> Transcrições por voz</span>
          <span>{usoIa.transcMes}/{l.transcMes} no mês</span>
        </div>
        <Barra usado={usoIa.transcMes} total={l.transcMes} />
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-neutral-600">
          <span className="flex items-center gap-1.5 font-semibold"><Wand2 className="w-3.5 h-3.5" /> Melhorias de texto</span>
          <span>{usoIa.melhoriaMes}/{l.melhoriaMes} no mês</span>
        </div>
        <Barra usado={usoIa.melhoriaMes} total={l.melhoriaMes} />
      </div>
      <p className="text-[10px] text-neutral-500">
        Franquias renovam no dia 1º. Registro manual de RDO é sempre ilimitado.
      </p>
    </div>
  );
}
