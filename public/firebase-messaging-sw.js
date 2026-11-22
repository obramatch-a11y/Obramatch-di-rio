/* Recebe notificações do ObraMatch Diário (mensagens só de dados, sem texto sensível). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let dados = {};
  try {
    const corpo = event.data ? event.data.json() : {};
    dados = corpo.data || corpo || {};
  } catch (erro) {
    dados = {};
  }
  const titulo = String(dados.titulo || 'ObraMatch Diário').slice(0, 80);
  // No aplicativo, o aviso sempre abre a tela inicial (onde ficam os avisos de RDO).
  const url = '/';
  event.waitUntil(self.registration.showNotification(titulo, {
    body: String(dados.corpo || 'Você tem uma novidade.').slice(0, 160),
    tag: typeof dados.tag === 'string' ? dados.tag.slice(0, 80) : undefined,
    icon: '/icon-512-maskable.png',
    badge: '/icon-512-maskable.png',
    data: { url },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = new URL('/', self.location.origin).href;
  event.waitUntil((async () => {
    const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const janela of janelas) {
      if (new URL(janela.url).origin === self.location.origin && 'focus' in janela) {
        await janela.focus();
        if ('navigate' in janela) await janela.navigate(destino);
        return;
      }
    }
    await self.clients.openWindow(destino);
  })());
});
