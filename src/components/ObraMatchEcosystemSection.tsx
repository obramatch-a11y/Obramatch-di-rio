import React from 'react';
import { Globe, BookOpen, Bot, ExternalLink, Construction } from 'lucide-react';

interface ObraMatchEcosystemSectionProps {
  variant?: 'login' | 'dashboard' | 'obra' | 'diario' | 'footer';
  className?: string;
}

export default function ObraMatchEcosystemSection({
  variant = 'dashboard',
  className = ''
}: ObraMatchEcosystemSectionProps) {

  // Variant 5: Footer (discrete footer with links)
  if (variant === 'footer') {
    return (
      <div 
        className={`mt-8 pt-8 border-t border-slate-900/60 text-center space-y-4 ${className}`}
        id="obramatch-ecosystem-footer"
      >
        <p className="text-xs font-semibold text-slate-400">
          Conheça mais soluções no ecossistema ObraMatch.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold">
          <a
            href="https://obramatch.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:text-amber-300 transition-colors"
          >
            ObraMatch
          </a>
          <span className="text-slate-850">•</span>
          <a
            href="https://obramatchof.blogspot.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:text-amber-300 transition-colors"
          >
            Blog ObraMatch
          </a>
          <span className="text-slate-850">•</span>
          <a
            href="https://agentes.obramatch.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:text-amber-300 transition-colors"
          >
            Agentes Match
          </a>
        </div>
      </div>
    );
  }

  // Variant 1: Login (compact version below the form)
  if (variant === 'login') {
    return (
      <div 
        className={`w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 ${className}`}
        id="obramatch-ecosystem-login"
      >
        <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm uppercase tracking-wider">
          <Construction className="w-4 h-4 text-amber-500" />
          <span>Ecossistema ObraMatch</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Acesse também a plataforma ObraMatch, o Blog ObraMatch e os Agentes Match para apoiar sua obra.
        </p>
        <div className="grid grid-cols-1 gap-2.5 pt-1">
          <a
            href="https://obramatch.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/10"
          >
            <Globe className="w-4 h-4" />
            <span>ObraMatch</span>
          </a>
          <div className="grid grid-cols-2 gap-2">
            <a
              href="https://obramatchof.blogspot.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-200 text-center font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Blog ObraMatch</span>
            </a>
            <a
              href="https://agentes.obramatch.com.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-200 text-center font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5 text-amber-400" />
              <span>Agentes Match</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Variant 3: Obra (compact version before footer)
  if (variant === 'obra') {
    return (
      <div 
        className={`bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 ${className}`}
        id="obramatch-ecosystem-obra"
      >
        <div>
          <h3 className="text-lg font-extrabold text-white">Conteúdo ObraMatch</h3>
          <p className="text-xs text-slate-400 mt-1">
            Veja conteúdos técnicos e soluções do ecossistema ObraMatch para acompanhar sua obra with mais segurança.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="https://obramatchof.blogspot.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/10"
          >
            <BookOpen className="w-4 h-4" />
            <span>Acessar Blog ObraMatch</span>
          </a>
          <a
            href="https://agentes.obramatch.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-200 text-center font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Bot className="w-4 h-4 text-amber-400" />
            <span>Abrir Agentes Match</span>
          </a>
        </div>
      </div>
    );
  }

  // Variant 4: Diario (Novo Diário, depois do botão salvar)
  if (variant === 'diario') {
    return (
      <div 
        className={`bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 ${className}`}
        id="obramatch-ecosystem-diario"
      >
        <div>
          <h3 className="text-lg font-extrabold text-white">Apoio técnico ObraMatch</h3>
          <p className="text-xs text-slate-400 mt-1">
            Precisa de orientação técnica? Consulte os Agentes Match ou leia conteúdos do Blog ObraMatch.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="https://agentes.obramatch.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/10"
          >
            <Bot className="w-4 h-4" />
            <span>Agentes Match</span>
          </a>
          <a
            href="https://obramatchof.blogspot.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-200 text-center font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-amber-550" />
            <span>Blog ObraMatch</span>
          </a>
        </div>
      </div>
    );
  }

  // Variant 2: Dashboard (elegant section after main cards)
  return (
    <div 
      className={`bg-slate-900 border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-xl space-y-6 ${className}`}
      id="obramatch-ecosystem-dashboard"
    >
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-tight">
          Ecossistema ObraMatch
        </h2>
        <p className="text-sm text-slate-400 mt-1 leading-relaxed">
          Contrate profissionais, leia conteúdos técnicos e utilize agentes especializados do ecossistema ObraMatch.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Plataforma ObraMatch */}
        <div className="bg-slate-950/40 border border-slate-850/60 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-amber-500/20 transition-all shadow-md">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shadow-inner">
                <Globe className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white leading-none">Plataforma ObraMatch</h3>
                <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider block mt-1">Profissionais</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Encontre profissionais para sua obra. Contrate pedreiros, encanadores, pintores, engenheiros e arquitetos avaliados pela comunidade.
            </p>
          </div>
          <a
            href="https://obramatch.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/10"
          >
            <span>Acessar</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Card 2: Blog ObraMatch */}
        <div className="bg-slate-950/40 border border-slate-850/60 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-blue-500/20 transition-all shadow-md">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shadow-inner">
                <BookOpen className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white leading-none">Blog ObraMatch</h3>
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider block mt-1">Conteúdo</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Leia conteúdos técnicos sobre construção, reformas e gestão de obras. Mantenha-se atualizado com as melhores normas de engenharia.
            </p>
          </div>
          <a
            href="https://obramatchof.blogspot.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-200 text-center font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Ler artigos</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Card 3: Agentes Match */}
        <div className="bg-slate-950/40 border border-slate-850/60 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-purple-500/20 transition-all shadow-md">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shadow-inner">
                <Bot className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white leading-none">Agentes Match</h3>
                <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider block mt-1">Suporte de IA</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Consulte agentes especializados para apoio técnico. Tire dúvidas sobre as normas da ABNT, laudos de vistoria e procedimentos de obra.
            </p>
          </div>
          <a
            href="https://agentes.obramatch.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-200 text-center font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Abrir</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
