import { useEffect, useState } from 'react';

const CHAVE = 'om_recarga_carregando';

// Substitui a tela branca enquanto uma tela carrega. Se demorar demais, recarrega sozinho uma vez
// (limpando o cache antigo do aplicativo) e, se persistir, oferece um botão.
export default function CarregandoTela() {
  const [demorou, setDemorou] = useState(false);
  useEffect(() => {
    const t1 = window.setTimeout(() => setDemorou(true), 6000);
    const t2 = window.setTimeout(async () => {
      try {
        if (sessionStorage.getItem(CHAVE) === '1') return;
        sessionStorage.setItem(CHAVE, '1');
      } catch { /* sem armazenamento */ }
      await limparCacheDoApp();
      window.location.reload();
    }, 12000);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); try { sessionStorage.removeItem(CHAVE); } catch { /* ok */ } };
  }, []);
  return (
    <div role="status" style={{ flex: 1, minHeight: '60vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
      <div>
        <p style={{ color: '#0a3d91', fontWeight: 800 }}>Carregando…</p>
        {demorou && (
          <>
            <p style={{ color: '#5d6678', fontSize: 14 }}>Está demorando mais que o normal.</p>
            <button type="button" onClick={async () => { await limparCacheDoApp(); window.location.reload(); }} style={{ minHeight: 48, padding: '0 20px', border: 0, borderRadius: 14, background: '#ff6f00', color: '#fff', fontWeight: 800 }}>Recarregar</button>
          </>
        )}
      </div>
    </div>
  );
}

export async function limparCacheDoApp(): Promise<void> {
  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.();
    await Promise.all((regs ?? []).filter((r) => !r.scope.includes('firebase-cloud-messaging-push-scope')).map((r) => r.update().catch(() => undefined)));
    const nomes = await caches?.keys?.();
    await Promise.all((nomes ?? []).map((n) => caches.delete(n)));
  } catch { /* melhor esforço */ }
}
