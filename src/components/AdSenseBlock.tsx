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

  // If no AdSense configuration, don't show any AdSense block or fallback placeholder
  return null;
}
