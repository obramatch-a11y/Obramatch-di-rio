import React from 'react';
import { useApp } from '../context/AppContext';
import { BadgeCheck, ExternalLink } from 'lucide-react';

// Ponte com o marketplace: cada obra documentada vira reputação no ObraMatch.
export default function PerfilBadge() {
  const { obras } = useApp();

  return (
    <div className="bg-white border border-[#D1D1D1] rounded-xl p-4 flex items-center gap-3">
      <div className="p-2.5 bg-[#FF6F00]/10 border border-[#FF6F00] text-[#FF6F00] rounded-xl shrink-0">
        <BadgeCheck className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-[#111111] flex items-center gap-2">
          Profissional que documenta
          <span className="px-2 py-0.5 bg-[#FF6F00]/10 border border-[#FF6F00] text-[#FF6F00] rounded-md text-[10px] font-black">
            {obras.length} {obras.length === 1 ? 'obra' : 'obras'}
          </span>
        </h4>
        <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">
          Apareça para clientes no ObraMatch com seu histórico de obras documentadas.
        </p>
      </div>
      <a
        href="https://obramatch.com.br/"
        target="_blank"
        rel="noopener noreferrer"
        className="py-2.5 px-4 border border-[#D1D1D1] hover:bg-[#F4F4F4] text-[#222222] hover:text-[#111111] font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all text-xs shrink-0"
      >
        Ver perfil
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
