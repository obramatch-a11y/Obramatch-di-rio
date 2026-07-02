import React from 'react';
import { Sparkles, Info } from 'lucide-react';

interface AdSensePlaceholderProps {
  type: 'banner' | 'adaptive' | 'native';
  className?: string;
}

export default function AdSensePlaceholder({ type, className = '' }: AdSensePlaceholderProps) {
  return (
    <div className={`relative bg-slate-900/40 border border-slate-900/80 rounded-2xl p-4 overflow-hidden select-none ${className}`}>
      {/* Top Banner Tag */}
      <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">
        <span className="flex items-center gap-1">
          <Info className="w-3 h-3 text-slate-600" />
          Patrocinado • Google AdSense
        </span>
        <span>{type === 'native' ? 'Anúncio Nativo' : type === 'adaptive' ? 'Banner Adaptativo' : 'Banner Responsivo'}</span>
      </div>

      {type === 'banner' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-900">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20 shrink-0 text-amber-500">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-200">Encontre Fornecedores de Concreto Próximos</h5>
              <p className="text-[10px] text-slate-500">Compare preços de concreto usinado FCK 25/30 com entrega garantida.</p>
            </div>
          </div>
          <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-[10px] rounded-lg transition-all cursor-pointer whitespace-nowrap">
            Ver Ofertas
          </button>
        </div>
      )}

      {type === 'adaptive' && (
        <div className="w-full flex items-center justify-center bg-slate-950/30 p-4 rounded-xl border border-dashed border-slate-850 h-[80px]">
          <div className="text-center">
            <p className="text-[11px] text-slate-400 font-bold">Aço Armado sob Medida para sua Fundação</p>
            <p className="text-[10px] text-slate-600 mt-0.5">Estribos, colunas e vigas prontas. Peça orçamento online.</p>
          </div>
        </div>
      )}

      {type === 'native' && (
        <div className="space-y-2">
          <div className="aspect-video w-full bg-slate-950/50 rounded-xl border border-slate-900 overflow-hidden flex items-center justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent z-10 opacity-60" />
            <div className="absolute bottom-3 left-3 right-3 z-20">
              <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                Recomendado
              </span>
              <h4 className="text-xs font-extrabold text-white mt-1">Garante 5 Anos Contra Infiltrações Crônicas</h4>
              <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">Manta líquida elastomérica de cura rápida para lajes expostas.</p>
            </div>
            <div className="text-slate-800 font-bold uppercase tracking-wider text-2xl font-mono opacity-15">
              AD PREPARED
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
