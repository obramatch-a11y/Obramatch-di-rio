import React from 'react';
import { useApp } from '../context/AppContext';
import { LIMITES_PLANO } from '../types';
import { AlertTriangle, Crown, LockKeyhole, Mic, Wand2 } from 'lucide-react';

function Barra({ usado, total }: { usado: number; total: number }) {
  const pct = Math.min(100, Math.round((usado / total) * 100));
  const cor = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-[#FF6F00]' : 'bg-[#0A3D91]';
  return (
    <div className="h-2 w-full bg-[#F4F4F4] border border-[#D1D1D1] rounded-full overflow-hidden">
      <div className={`h-full ${cor} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR');
}

export default function PlanoUsoCard() {
  const { plano, financialAccess, usoIa } = useApp();
  const limits = LIMITES_PLANO[plano.plano];
  const validity = formatDate(financialAccess.expiresAt);
  const overdue = financialAccess.stage === 'overdue';
  const blocked = financialAccess.stage === 'blocked';
  const expiring = financialAccess.stage === 'pro_expiring';

  const title = blocked
    ? 'Acesso bloqueado'
    : overdue
      ? 'Plano PRO vencido'
      : plano.plano === 'pro'
        ? 'Plano PRO'
        : 'Plano Gratuito';

  const dateText = validity
    ? overdue || blocked
      ? `Venceu em ${validity}`
      : expiring
        ? `Vence em ${validity}`
        : `Válido até ${validity}`
    : '';

  return (
    <div className={`nb-card p-4 space-y-3 ${overdue ? 'bg-amber-50' : blocked ? 'bg-red-50' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-display font-black text-[#111] flex items-center gap-2">
          {blocked
            ? <LockKeyhole className="w-4 h-4 text-red-700" />
            : overdue
              ? <AlertTriangle className="w-4 h-4 text-amber-700" />
              : <Crown className={`w-4 h-4 ${plano.plano === 'pro' ? 'text-[#FF6F00]' : 'text-neutral-400'}`} />}
          {title}
        </h3>
        {dateText && <span className="text-[10px] text-neutral-600 font-semibold text-right">{dateText}</span>}
      </div>

      {overdue && (
        <p className="text-[11px] font-semibold text-amber-900 bg-amber-100 border border-amber-300 rounded-lg p-2">
          O Pro venceu. Restam {financialAccess.regularizationDaysRemaining} dia(s) para regularizar antes do bloqueio.
        </p>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-neutral-600">
          <span className="flex items-center gap-1.5 font-semibold"><Mic className="w-3.5 h-3.5" /> Transcrições por voz</span>
          <span>{usoIa.transcMes}/{limits.transcMes} no mês</span>
        </div>
        <Barra usado={usoIa.transcMes} total={limits.transcMes} />
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-neutral-600">
          <span className="flex items-center gap-1.5 font-semibold"><Wand2 className="w-3.5 h-3.5" /> Melhorias de texto</span>
          <span>{usoIa.melhoriaMes}/{limits.melhoriaMes} no mês</span>
        </div>
        <Barra usado={usoIa.melhoriaMes} total={limits.melhoriaMes} />
      </div>
      <p className="text-[10px] text-neutral-500">
        Franquias renovam no dia 1º. Registro manual de RDO é sempre ilimitado.
      </p>
    </div>
  );
}
