/* 旧版（ともやの家）の Service Worker を片付けるためだけのファイル。
   旧版を開いたことのある端末は、古い sw.js が画面をキャッシュから出し続ける。
   ブラウザが同じ場所の sw.js の更新を拾うと、これが入り、
   古いキャッシュを全部消して自分を登録解除し、開いている画面を読み込み直す。
   新版は Service Worker を使わない。 */

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(c => c.navigate(c.url));
  })());
});
