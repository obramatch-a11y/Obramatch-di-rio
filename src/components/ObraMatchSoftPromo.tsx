import React from 'react';
import { Globe, BookOpen, Bot, ExternalLink, ArrowUpRight } from 'lucide-react';

interface ObraMatchSoftPromoProps {
  variant?: 'login' | 'dashboard' | 'obra' | 'diario' | 'footer';
  className?: string;
}

export default function ObraMatchSoftPromo({
  variant = 'dashboard',
  className = ''
}: ObraMatchSoftPromoProps) {

  // Footer/Relatório - Ultra-compact, subtle links list
  if (variant === 'footer') {
    return (
      <div 
        className={`pt-6 border-t border-slate-900/60 text-center space-y-3 ${className}`}
        id="obramatch-soft-promo-footer"
      >
        <p className="text-[11px] font-semibold text-slate-400">
          Consulte conteúdos e especialistas do ecossistema ObraMatch para sua obra.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-5 text-xs">
          <a
            href="https://obramatch.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:text-amber-300 transition-colors font-semibold flex items-center gap-0.5"
          >
            ObraMatch <ArrowUpRight className="w-3 h-3 text-slate-500" />
          </a>
          <span className="text-slate-800">•</span>
          <a
            href="https://obramatchof.blogspot.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:text-amber-300 transition-colors font-semibold flex items-center gap-0.5"
          >
            Blog ObraMatch <ArrowUpRight className="w-3 h-3 text-slate-500" />
          </a>
          <span className="text-slate-800">•</span>
          <a
            href="https://agentes.obramatch.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:text-amber-300 transition-colors font-semibold flex items-center gap-0.5"
          >
            Agentes Match <ArrowUpRight className="w-3 h-3 text-slate-500" />
          </a>
        </div>
      </div>
    );
  }

  // Determine variant-specific text
  let headingText = "Mais recursos ObraMatch";
  let descriptionText = "Encontre profissionais, leia conteúdos técnicos e acesse apoio especializado quando precisar.";
  
  if (variant === 'login') {
    headingText = "Ecossistema ObraMatch";
    descriptionText = "Encontre profissionais e consulte especialistas para apoiar a sua obra com total segurança.";
  } else if (variant === 'diario') {
    headingText = "Apoio Técnico Adicional";
    descriptionText = "Precisa de orientação técnica para descrever o dia? Consulte nossos recursos especializados.";
  } else if (variant === 'obra') {
    headingText = "Continue sua obra com mais segurança";
    descriptionText = "Consulte conteúdos e especialistas de engenharia e obras do ecossistema ObraMatch.";
  }

  return (
    <div 
      className={`bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-lg space-y-4 ${className}`}
      id={`obramatch-soft-promo-${variant}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h4 className="text-xs font-black text-white tracking-wide uppercase flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
            <span>{headingText}</span>
          </h4>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            {descriptionText}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Link 1: Plataforma */}
        <a
          href="https://obramatch.com.br/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 bg-slate-950/40 hover:bg-slate-950 border border-slate-850 p-2.5 rounded-xl transition-all group cursor-pointer"
        >
          <div className="w-7 h-7 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg flex items-center justify-center shrink-0">
            <Globe className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-white group-hover:text-amber-400 transition-colors truncate">ObraMatch</p>
            <p className="text-[9px] text-slate-500 truncate">Contrate profissionais</p>
          </div>
        </a>

        {/* Link 2: Blog */}
        <a
          href="https://obramatchof.blogspot.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 bg-slate-950/40 hover:bg-slate-950 border border-slate-850 p-2.5 rounded-xl transition-all group cursor-pointer"
        >
          <div className="w-7 h-7 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-white group-hover:text-blue-400 transition-colors truncate">Blog ObraMatch</p>
            <p className="text-[9px] text-slate-500 truncate">Conteúdos técnicos</p>
          </div>
        </a>

        {/* Link 3: Agentes */}
        <a
          href="https://agentes.obramatch.com.br/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 bg-slate-950/40 hover:bg-slate-950 border border-slate-850 p-2.5 rounded-xl transition-all group cursor-pointer"
        >
          <div className="w-7 h-7 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-white group-hover:text-purple-400 transition-colors truncate">Agentes Match</p>
            <p className="text-[9px] text-slate-500 truncate">Suporte e inteligência</p>
          </div>
        </a>
      </div>
    </div>
  );
}
