/* ===========================================================
   Service Worker — オフラインでも動くようにする
   ・初回アクセス時に必要なファイルを全部キャッシュへ入れる
   ・以後はキャッシュから返し、裏でネットワークから更新を取りに行く
     （stale-while-revalidate。表示は速く、次回起動時には最新になる）
   ・アプリを更新したら CACHE の版数を上げること。古いキャッシュは自動で消える
   =========================================================== */

const CACHE = 'bars-words-v6';

/* すべて相対パス。GitHub Pages のサブディレクトリ配信でもそのまま動く */
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './beat.js',
  './commute.js',
  './manifest.json',

  './fonts/fonts.css',
  './fonts/anton-1.woff2',
  './fonts/anton-2.woff2',
  './fonts/anton-3.woff2',
  './fonts/marker-1.woff2',

  './data/character.js',
  './data/history.js',
  './data/slang.js',
  './data/pronunciation.js',
  './data/phrases.js',
  './data/quiz.js',
  './data/commute.js',
  './data/parse.js',
  './data/grammar.js',

  './icons/icon-32.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    /* 1つ失敗しても全体を巻き添えにしない */
    await Promise.all(ASSETS.map(u => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  /* GET 以外と、外部サイト（Spotify/YouTube/Genius）は素通し */
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith((async () => {
    const cached = await caches.match(req);

    const network = fetch(req).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => null);

    /* キャッシュがあれば即返し、更新は裏で取る */
    if (cached) return cached;

    const res = await network;
    if (res) return res;

    /* オフラインで未キャッシュのページを開かれたらトップを返す */
    if (req.mode === 'navigate') {
      const top = await caches.match('./index.html');
      if (top) return top;
    }
    return new Response('オフラインです', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  })());
});
