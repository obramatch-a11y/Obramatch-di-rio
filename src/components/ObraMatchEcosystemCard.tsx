import React from 'react';
import { LucideIcon, Globe, BookOpen, Bot, Sparkles, ExternalLink } from 'lucide-react';

export interface ObraMatchEcosystemCardProps {
  tipo: 'site' | 'blog' | 'agentes' | 'ads';
  titulo: string;
  descricao: string;
  textoBotao: string;
  url: string;
  icon?: LucideIcon;
  variante?: 'banner' | 'card' | 'compacto';
  className?: string;
}

export default function ObraMatchEcosystemCard({
  tipo,
  titulo,
  descricao,
  textoBotao,
  url,
  icon: Icon,
  variante = 'card',
  className = ''
}: ObraMatchEcosystemCardProps) {
  // Resolve default icons based on type
  const DefaultIcon = () => {
    if (Icon) return <Icon className="w-5 h-5" />;
    switch (tipo) {
      case 'site':
        return <Globe className="w-5 h-5 text-amber-400" />;
      case 'blog':
        return <BookOpen className="w-5 h-5 text-blue-400" />;
      case 'agentes':
        return <Bot className="w-5 h-5 text-purple-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-amber-500" />;
    }
  };

  // Border and accent color selection based on type
  const typeAccentClass = {
    site: 'border-amber-500/20 shadow-amber-500/5',
    blog: 'border-blue-500/20 shadow-blue-500/5',
    agentes: 'border-purple-500/20 shadow-purple-500/5',
    ads: 'border-slate-800 shadow-slate-900/5',
  }[tipo];

  // Visual variants
  if (variante === 'compacto') {
    return (
      <div 
        className={`bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-md transition-all hover:border-slate-700 ${typeAccentClass} ${className}`}
        id={`obramatch-ecosystem-compacto-${tipo}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-center shrink-0">
            <DefaultIcon />
          </div>
          <div>
            <h4 className="text-xs font-black text-white leading-tight">{titulo}</h4>
            <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{descricao}</p>
          </div>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-black rounded-lg transition-all flex items-center gap-1 shrink-0 shadow-lg shadow-amber-500/10 cursor-pointer"
        >
          <span>{textoBotao}</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }

  if (variante === 'banner') {
    return (
      <div 
        className={`bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800/90 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-750 ${typeAccentClass} ${className}`}
        id={`obramatch-ecosystem-banner-${tipo}`}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-start md:items-center gap-4 relative z-10">
          <div className="w-12 h-12 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center shrink-0 shadow-xl">
            <DefaultIcon />
          </div>
          <div className="space-y-1">
            <span className="text-[8px] font-black tracking-widest text-amber-500 uppercase">
              Ecossistema ObraMatch
            </span>
            <h4 className="text-sm font-extrabold text-white leading-snug">{titulo}</h4>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">{descricao}</p>
          </div>
        </div>
        <div className="relative z-10 shrink-0 self-end md:self-center">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/15 hover:scale-[1.02] cursor-pointer"
          >
            <span>{textoBotao}</span>
            <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
          </a>
        </div>
      </div>
    );
  }

  // Default: 'card'
  return (
    <div 
      className={`bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between gap-4 transition-all hover:border-slate-750 ${typeAccentClass} ${className}`}
      id={`obramatch-ecosystem-card-${tipo}`}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-center shadow-md shrink-0">
            <DefaultIcon />
          </div>
          <div>
            <span className="text-[8px] font-black tracking-widest text-amber-500 uppercase block leading-none">
              Parceiro Oficial
            </span>
            <h4 className="text-xs font-extrabold text-white mt-1 leading-tight">{titulo}</h4>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed min-h-[40px]">{descricao}</p>
      </div>

      <div className="pt-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
        >
          <span>{textoBotao}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
