import React, { useMemo } from 'react';
import { Globe, BookOpen, Bot, ArrowUpRight } from 'lucide-react';

interface ObraMatchSoftPromoProps {
  variant?: 'login' | 'dashboard' | 'obra' | 'diario' | 'footer';
  className?: string;
}

type Promo = {
  brand: 'obramatch' | 'agentes' | 'portal';
  icon: React.ReactNode;
  title: string;
  line: string;
  cta: string;
  href: string;
  accent: 'orange' | 'blue';
};

const PROMOS: Record<string, Promo> = {
  obramatchLogin: {
    brand: 'obramatch',
    icon: <Globe className="w-4 h-4" />,
    title: 'ObraMatch',
    line: 'O marketplace que conecta clientes a profissionais de obra em todo o Brasil.',
    cta: 'Conhecer',
    href: 'https://obramatch.com.br/',
    accent: 'blue',
  },
  perfilPublico: {
    brand: 'obramatch',
    icon: <Globe className="w-4 h-4" />,
    title: 'Apareça para clientes no ObraMatch',
    line: 'Seu perfil público mostra sua experiência para quem procura profissionais.',
    cta: 'Ver perfil',
    href: 'https://obramatch.com.br/',
    accent: 'blue',
  },
  portal: {
    brand: 'portal',
    icon: <BookOpen className="w-4 h-4" />,
    title: 'Portal Construção',
    line: 'Conteúdo técnico para cada etapa da sua obra, direto do blog.',
    cta: 'Ler artigo',
    href: 'https://obramatchof.blogspot.com/',
    accent: 'blue',
  },
  agentes: {
    brand: 'agentes',
    icon: <Bot className="w-4 h-4" />,
    title: 'Agentes Match',
    line: 'IA para engenheiros: memórias de cálculo, orçamentos SINAPI, consultas NBR.',
    cta: 'Testar',
    href: 'https://agentes.obramatch.com.br/',
    accent: 'orange',
  },
};

/**
 * Bloco promocional único e contextual.
 * Regra: nunca mais de um por tela; rotação por contexto.
 */
export default function ObraMatchSoftPromo({
  variant = 'dashboard',
  className = '',
}: ObraMatchSoftPromoProps) {
  const promo = useMemo<Promo>(() => {
    if (variant === 'login') return PROMOS.obramatchLogin;
    if (variant === 'dashboard') return PROMOS.perfilPublico;
    if (variant === 'diario' || variant === 'footer') return PROMOS.agentes;
    // Dentro da obra: alterna Portal Construção / Agentes Match (nunca os dois)
    const alt = new Date().getDate() % 2 === 0 ? PROMOS.portal : PROMOS.agentes;
    return alt;
  }, [variant]);

  return (
    <a
      href={promo.href}
      target="_blank"
      rel="noopener noreferrer"
      id={`obramatch-soft-promo-${variant}`}
      className={`nb-promo ${promo.accent === 'blue' ? 'nb-promo-blue' : ''} flex items-center gap-3 p-3 group ${className}`}
    >
      <div
        className={`w-8 h-8 rounded-lg border-2 border-black flex items-center justify-center shrink-0 ${
          promo.accent === 'blue' ? 'bg-[#0A3D91] text-white' : 'bg-[#FF6F00] text-white'
        }`}
      >
        {promo.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-display font-extrabold text-[#111] leading-tight truncate">
          {promo.title}
        </p>
        <p className="text-[11px] text-neutral-600 leading-snug line-clamp-2">{promo.line}</p>
      </div>
      <span
        className={`text-[11px] font-display font-extrabold shrink-0 flex items-center gap-0.5 ${
          promo.accent === 'blue' ? 'text-[#0A3D91]' : 'text-[#FF6F00]'
        }`}
      >
        {promo.cta} <ArrowUpRight className="w-3 h-3" />
      </span>
    </a>
  );
}
