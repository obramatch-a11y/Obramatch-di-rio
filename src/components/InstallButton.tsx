import React, { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';

interface InstallButtonProps {
  className?: string;
  variant?: 'login' | 'dashboard';
  onInstallSuccess?: () => void;
}

export default function InstallButton({ className = '', variant = 'dashboard', onInstallSuccess }: InstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if ((window as any).__appInstalled || window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const checkPrompt = () => {
      const prompt = (window as any).__deferredPrompt;
      if (prompt) {
        setDeferredPrompt(prompt);
      }
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

    // Sync interval to capture the prompt as soon as it's set on window
    const interval = setInterval(checkPrompt, 1000);

    return () => {
      window.removeEventListener('beforeinstallprompt_global_received', handleGlobalPrompt as any);
      window.removeEventListener('appinstalled_global_received', handleAppInstalled as any);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearInterval(interval);
    };
  }, [onInstallSuccess]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA Installation outcome: ${outcome}`);
      if (outcome === 'accepted') {
        (window as any).__appInstalled = true;
        setIsInstalled(true);
        setDeferredPrompt(null);
        if (onInstallSuccess) onInstallSuccess();
      }
    } catch (err) {
      console.error('Error triggering PWA installation prompt:', err);
    }
  };

  if (isInstalled || !deferredPrompt) {
    return null;
  }

  if (variant === 'login') {
    return (
      <button
        id="pwa-install-button-login"
        onClick={handleInstallClick}
        className={`w-full bg-[#FF6F00] hover:bg-[#e86500] text-white font-extrabold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all   text-sm ${className}`}
      >
        <Smartphone className="w-5 h-5" />
        Instalar Aplicativo
      </button>
    );
  }

  return (
    <button
      id="pwa-install-button-dashboard"
      onClick={handleInstallClick}
      className={`w-full sm:w-auto bg-[#FF6F00] hover:bg-[#e86500] active:scale-95 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all text-xs ${className}`}
    >
      <Download className="w-4 h-4" />
      Instalar Aplicativo
    </button>
  );
}
