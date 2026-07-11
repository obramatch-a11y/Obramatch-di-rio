import React, { useEffect, useState } from 'react';
import { Download, Smartphone, Share, MoreVertical, X } from 'lucide-react';

interface InstallButtonProps {
  className?: string;
  variant?: 'login' | 'dashboard';
  onInstallSuccess?: () => void;
}

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export default function InstallButton({ className = '', variant = 'dashboard', onInstallSuccess }: InstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if ((window as any).__appInstalled || window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const checkPrompt = () => {
      const prompt = (window as any).__deferredPrompt;
      if (prompt) setDeferredPrompt(prompt);
    };
    checkPrompt();

    const handleGlobalPrompt = (e: CustomEvent) => {
      setDeferredPrompt(e.detail || (window as any).__deferredPrompt);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      if (onInstallSuccess) onInstallSuccess();
    };

    window.addEventListener('beforeinstallprompt_global_received', handleGlobalPrompt as any);
    window.addEventListener('appinstalled_global_received', handleAppInstalled as any);
    window.addEventListener('appinstalled', handleAppInstalled);
    const interval = setInterval(checkPrompt, 1000);

    return () => {
      window.removeEventListener('beforeinstallprompt_global_received', handleGlobalPrompt as any);
      window.removeEventListener('appinstalled_global_received', handleAppInstalled as any);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearInterval(interval);
    };
  }, [onInstallSuccess]);

  const handleInstallClick = async () => {
    // Instalação nativa (Chrome/Edge/Android)
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          (window as any).__appInstalled = true;
          setIsInstalled(true);
          setDeferredPrompt(null);
          if (onInstallSuccess) onInstallSuccess();
        }
        return;
      } catch (err) {
        console.error('Erro ao abrir prompt de instalação:', err);
      }
    }
    // Sem prompt disponível (iOS/Safari ou navegador sem suporte): mostrar instruções
    setShowHelp(true);
  };

  if (isInstalled) return null;

  const btnClasses =
    variant === 'login'
      ? `w-full bg-[#FF6F00] hover:bg-[#e86500] text-white py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-sm ${className}`
      : `w-full sm:w-auto bg-[#FF6F00] hover:bg-[#e86500] text-white py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-xs ${className}`;

  return (
    <>
      <button id={`pwa-install-button-${variant}`} onClick={handleInstallClick} className={btnClasses}>
        {variant === 'login' ? <Smartphone className="w-5 h-5" /> : <Download className="w-4 h-4" />}
        Instalar aplicativo
      </button>

      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/50" onClick={() => setShowHelp(false)}>
          <div className="nb-card nb-shadow w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-base font-display font-black text-[#111]">Instalar no celular</h3>
              <button onClick={() => setShowHelp(false)} aria-label="Fechar" className="p-1 text-neutral-500 hover:text-[#111] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            {isIOS() ? (
              <ol className="space-y-3 text-sm text-[#111]">
                <li className="flex items-center gap-3">
                  <span className="w-7 h-7 shrink-0 rounded-lg bg-[#0A3D91] text-white border-2 border-black flex items-center justify-center font-display font-extrabold text-xs">1</span>
                  <span>Toque em <Share className="w-4 h-4 inline text-[#0A3D91]" /> <b>Compartilhar</b> na barra do Safari</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-7 h-7 shrink-0 rounded-lg bg-[#0A3D91] text-white border-2 border-black flex items-center justify-center font-display font-extrabold text-xs">2</span>
                  <span>Escolha <b>Adicionar à Tela de Início</b></span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-7 h-7 shrink-0 rounded-lg bg-[#FF6F00] text-white border-2 border-black flex items-center justify-center font-display font-extrabold text-xs">3</span>
                  <span>Confirme em <b>Adicionar</b>. Pronto!</span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-3 text-sm text-[#111]">
                <li className="flex items-center gap-3">
                  <span className="w-7 h-7 shrink-0 rounded-lg bg-[#0A3D91] text-white border-2 border-black flex items-center justify-center font-display font-extrabold text-xs">1</span>
                  <span>Toque no menu <MoreVertical className="w-4 h-4 inline text-[#0A3D91]" /> do navegador</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-7 h-7 shrink-0 rounded-lg bg-[#0A3D91] text-white border-2 border-black flex items-center justify-center font-display font-extrabold text-xs">2</span>
                  <span>Escolha <b>Instalar aplicativo</b> ou <b>Adicionar à tela inicial</b></span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-7 h-7 shrink-0 rounded-lg bg-[#FF6F00] text-white border-2 border-black flex items-center justify-center font-display font-extrabold text-xs">3</span>
                  <span>Confirme a instalação. Pronto!</span>
                </li>
              </ol>
            )}
          </div>
        </div>
      )}
    </>
  );
}
