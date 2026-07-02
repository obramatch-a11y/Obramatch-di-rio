import React, { useEffect } from 'react';
import { Info, Sparkles, BookOpen, Bot, Globe, ArrowRight } from 'lucide-react';

interface AdSenseBlockProps {
  className?: string;
  slotOverride?: string;
}

export default function AdSenseBlock({ className = '', slotOverride }: AdSenseBlockProps) {
  const adClient = (import.meta as any).env?.VITE_GOOGLE_ADSENSE_CLIENT;
  const adSlot = slotOverride || (import.meta as any).env?.VITE_GOOGLE_ADSENSE_SLOT;

  const hasAdSenseConfig = adClient && adSlot && !adClient.startsWith('ca-pub-XXX') && adClient !== '';

  useEffect(() => {
    if (hasAdSenseConfig) {
      try {
        // Try pushing the ad, catch any errors silently as per instructions
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.warn('AdSense block load caught:', e);
      }
    }
  }, [hasAdSenseConfig, adSlot]);

  // Modo 2 - Real Google AdSense
  if (hasAdSenseConfig) {
    return (
      <div className={`bg-slate-900 border border-slate-800/80 rounded-2xl p-4 overflow-hidden shadow-lg ${className}`} id="adsense-real-block">
        <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-950 pb-2">
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3 text-slate-600" />
            Anúncio Patrocinado
          </span>
          <span>Google AdSense</span>
        </div>
        
        <div className="w-full min-h-[100px] flex items-center justify-center bg-slate-950/20 rounded-xl">
          <ins
            className="adsbygoogle"
            style={{ display: 'block', minWidth: '250px', minHeight: '90px' }}
            data-ad-client={adClient}
            data-ad-slot={adSlot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </div>
    );
  }

  // Modo 1 - Institucional ObraMatch (Fallback)
  return (
    <div 
      className={`bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col gap-4 ${className}`}
      id="adsense-institutional-fallback"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
      
      <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-950 pb-2">
        <span className="flex items-center gap-1 text-amber-500/90">
          <Sparkles className="w-3 h-3 text-amber-500" />
          Parceiro Oficial ObraMatch
        </span>
        <span>Divulgação</span>
      </div>

      <div className="space-y-1.5">
        <h4 className="text-xs font-black text-white flex items-center gap-1.5">
          <span>Construindo com Segurança e Eficiência</span>
        </h4>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          O ObraMatch conecta você aos melhores profissionais, conteúdos técnicos e agentes inteligentes do mercado de construção civil brasileiro.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        {/* Site Oficial */}
        <a
          href="https://obramatch.com.br/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-slate-950/40 hover:bg-slate-950 border border-slate-850 p-2.5 rounded-xl group transition-all cursor-pointer"
        >
          <div className="w-7 h-7 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold text-white group-hover:text-amber-400 transition-colors truncate">Site Oficial</p>
            <p className="text-[8px] text-slate-500 truncate">Contratar Profissionais</p>
          </div>
        </a>

        {/* Blog Oficial */}
        <a
          href="https://obramatchof.blogspot.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-slate-950/40 hover:bg-slate-950 border border-slate-850 p-2.5 rounded-xl group transition-all cursor-pointer"
        >
          <div className="w-7 h-7 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold text-white group-hover:text-blue-400 transition-colors truncate">Blog Técnico</p>
            <p className="text-[8px] text-slate-500 truncate">Dicas & Artigos</p>
          </div>
        </a>

        {/* Agentes Match */}
        <a
          href="https://agentes.obramatch.com.br/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-slate-950/40 hover:bg-slate-950 border border-slate-850 p-2.5 rounded-xl group transition-all cursor-pointer"
        >
          <div className="w-7 h-7 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold text-white group-hover:text-purple-400 transition-colors truncate">Agentes Match</p>
            <p className="text-[8px] text-slate-500 truncate">Consultoria Técnica</p>
          </div>
        </a>
      </div>
    </div>
  );
}
