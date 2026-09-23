/* Bars & Words v2 — アプリ本体
   流れ: 仕分け（知ってる／知らない） → 知ってる語は確認テスト、知らない語は学習 → 間隔反復で定着
   学習記録は端末内（localStorage）だけに持つ。 */

'use strict';

/* ================= 設定 ================= */

const APP_VERSION = '2026.09.24-1';   // tools/bump-version.mjs が書き換える
const DAY = 86400000;
// 箱ごとの次回出題までの間隔。box 0 は「今日もう一度」
const INTERVALS = [0, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY, 90 * DAY];
const MASTER_BOX = 4;      // ここまで上がったら「覚えた」
const SESSION_MAX = 15;    // 1回の学習で出す語数
const DAILY_NEW = 10;      // 1日に仕分ける新しい語の数
const BGM_MAX = 0.3;       // 音量スライダー最大時のBGMの大きさ（100で最初の版とほぼ同じ）
const STORE_KEY = 'bw2';

const SONGS = ARTIST.songs;
const SONG = Object.fromEntries(SONGS.map(s => [s.id, s]));
const WORD = Object.fromEntries(WORDS.map(w => [w.id, w]));

/* ================= 記録 ================= */

const store = (() => {
  let data = { w: {}, days: [], bgmVol: 0.5, voice: true, sfx: true, haptic: true, today: { d: '', sorted: 0 } };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) data = Object.assign(data, JSON.parse(raw));
  } catch (e) { /* 読めない環境でも動かす */ }
  if (data.bgm === false) { data.bgmVol = 0; }   // 旧設定（オン/オフだけだった頃）からの引き継ぎ
  // 2026.09.19-3 の初期値 0.4 は小さすぎて聞こえなかったので、その値のままの人だけ引き上げる
  if (!data.volFix && data.bgmVol === 0.4) data.bgmVol = 0.5;
  data.volFix = true;
  delete data.bgm;
  return {
    data,
    save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) {} },
  };
})();
const S = store.data;

function dayKey(d = new Date()) {
  // 端末の現地時間で日付を切る（UTCだと日本では朝9時に日付が変わってしまう）
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function rec(id) { return S.w[id]; }
function status(id) {
  const r = S.w[id];
  if (!r) return 'new';
  if (r.s === 'claimed') return 'claimed';
  return r.box >= MASTER_BOX ? 'mastered' : 'learning';
}
function isDue(id, now = Date.now()) {
  const r = S.w[id];
  return !!r && r.s === 'learn' && r.due <= now;
}
function markStudied() {
  const d = dayKey();
  if (S.days[S.days.length - 1] !== d) { S.days.push(d); S.days = S.days.slice(-400); }
}
function streak() {
  const has = new Set(S.days);
  const day = new Date();
  // 今日まだやっていなくても、昨日まで続いていれば連続として数える
  if (!has.has(dayKey(day))) day.setDate(day.getDate() - 1);
  let n = 0;
  while (has.has(dayKey(day))) { n++; day.setDate(day.getDate() - 1); }
  return n;
}
function sortedToday() { return S.today.d === dayKey() ? S.today.sorted : 0; }
function addSortedToday(n) {
  if (S.today.d !== dayKey()) S.today = { d: dayKey(), sorted: 0 };
  S.today.sorted = Math.max(0, S.today.sorted + n);
}

function setClaimed(id) { S.w[id] = { s: 'claimed', box: 0, due: 0, lapses: 0, seen: false }; }
function setLearn(id) { S.w[id] = { s: 'learn', box: 0, due: Date.now(), lapses: 0, seen: false }; }
function answer(id, ok) {
  const r = S.w[id];
  if (ok) {
    r.box = Math.min(r.box + 1, INTERVALS.length - 1);
    r.due = Date.now() + INTERVALS[r.box];
  } else {
    r.box = 0; r.due = Date.now(); r.lapses++;
  }
  markStudied(); store.save();
}
function passCheck(id, ok) {
  if (ok) S.w[id] = { s: 'learn', box: MASTER_BOX, due: Date.now() + INTERVALS[MASTER_BOX], lapses: 0, seen: true };
  else setLearn(id);
  markStudied(); store.save();
}

function wordsOf(songId) { return songId === 'all' ? WORDS : WORDS.filter(w => w.song === songId); }
function counts(list) {
  const c = { new: 0, claimed: 0, learning: 0, mastered: 0, due: 0 };
  const now = Date.now();
  for (const w of list) { c[status(w.id)]++; if (isDue(w.id, now)) c.due++; }
  return c;
}
function nextDueText(list) {
  const t = Math.min(...list.map(w => (S.w[w.id] && S.w[w.id].s === 'learn') ? S.w[w.id].due : Infinity));
  if (!isFinite(t)) return '';
  const days = Math.ceil((t - Date.now()) / DAY);
  return days <= 0 ? '今すぐ' : `${days}日後`;
}

/* ================= 音 ================= */

const voice = new Audio();
voice.preload = 'auto';
let actx = null, bgmGain = null, bgmSong = null, ducked = false;
const bgm = new Audio();
bgm.loop = true;
bgm.preload = 'none';

function initAudioGraph() {
  // iOSは裏へ回すと 'interrupted' のまま止まることがあるので、running 以外なら起こす
  if (actx) { if (actx.state !== 'running') actx.resume().catch(() => {}); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  actx = new AC();
  // iOSは audio.volume を変えられないので、BGMの音量はWeb Audioで絞る
  const src = actx.createMediaElementSource(bgm);
  bgmGain = actx.createGain();
  bgmGain.gain.value = bgmLevel();
  src.connect(bgmGain).connect(actx.destination);
}
// スライダーは聴感に合わせて1.5乗で効かせる
function bgmLevel() { return BGM_MAX * Math.pow(S.bgmVol, 1.5) * (ducked ? 0.35 : 1); }
function applyBgmLevel() {
  if (bgmGain) bgmGain.gain.setTargetAtTime(bgmLevel(), actx.currentTime, 0.1);
  else bgm.volume = Math.min(1, bgmLevel());
}
let bgmError = '';
bgm.addEventListener('error', () => { bgmError = `読み込み失敗(${bgm.error ? bgm.error.code : '?'})`; });
bgm.addEventListener('playing', () => { bgmError = ''; });
function bgmStatus() {
  const parts = [bgm.paused ? '停止中' : '再生中', `音声処理 ${actx ? actx.state : '未開始'}`, `曲 ${bgm.dataset.song || 'なし'}`];
  if (bgmError) parts.push(bgmError);
  return parts.join(' · ');
}
function wantBgm(songId) {
  if (songId && SONG[songId]) bgmSong = songId;
  syncBgm();
}
function syncBgm() {
  if (!S.bgmVol || !bgmSong) { bgm.pause(); return; }
  if (bgm.dataset.song !== bgmSong) {
    bgm.dataset.song = bgmSong;
    bgm.src = `bgm/${bgmSong}_${Math.random() < 0.5 ? 'a' : 'b'}.mp3`;
  }
  if (bgm.paused) bgm.play().catch(e => { if (e && e.name !== 'NotAllowedError') bgmError = e.name; });
}
function playUrl(url, btn) {
  if (!url) return;
  document.querySelectorAll('.play.on').forEach(b => b.classList.remove('on'));
  voice.src = url;
  voice.currentTime = 0;
  if (btn) btn.classList.add('on');
  voice.play().catch(() => {});
}
voice.addEventListener('play', () => { ducked = true; applyBgmLevel(); });
['ended', 'pause', 'error'].forEach(ev => voice.addEventListener(ev, () => {
  ducked = false; applyBgmLevel();
  document.querySelectorAll('.play.on').forEach(b => b.classList.remove('on'));
}));
function audioFor(id, kind) { return (typeof AUDIO !== 'undefined' && AUDIO[id]) ? AUDIO[id][kind] : null; }
function autoSay(id, kind = 'word') { if (S.voice) playUrl(audioFor(id, kind)); }

// 正解・不正解の効果音。音ファイルを増やさないよう、その場で合成する
function sfx(ok) {
  if (!S.sfx || !actx) return;
  const t = actx.currentTime;
  const notes = ok ? [[880, 0], [1318.5, 0.08]] : [[233, 0], [174.6, 0.11]];
  for (const [f, dt] of notes) {
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = ok ? 'sine' : 'triangle';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t + dt);
    g.gain.exponentialRampToValueAtTime(ok ? 0.09 : 0.13, t + dt + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dt + (ok ? 0.16 : 0.24));
    o.connect(g).connect(actx.destination);
    o.start(t + dt); o.stop(t + dt + 0.3);
  }
}
// 振動。AndroidはVibration APIで鳴らす。
// iPhoneはSafariに振動APIが無く、ページから自動でスイッチを押す裏技も効かなかった。
// そこで押すボタンの上に透明なiOSスイッチ（input switch）を重ね、指が本物のスイッチを押すようにする。
// iOSはスイッチ操作に手応えを返すので、タップした瞬間に軽く振動する（正解・不正解の区別はできない）。
const IOS_TAP_HAPTIC = (!navigator.vibrate && /iP(hone|ad|od)|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document)
  || /[?&]hap=1/.test(location.search);   // ?hap=1 はPCでの動作確認用
function buzz(ok) {
  if (!S.haptic || !navigator.vibrate) return;
  navigator.vibrate(ok ? 18 : [35, 60, 35]);
}
// 押せるもの全部（ボタン・一覧の行・リンク）に透明スイッチを重ねる。画面を描き直すたびに自動で掛かる。
// スイッチが押されたら、下のボタンの click() を呼んで本来の処理へ流す。
const HAP_TARGETS = 'button:not([disabled]), a[href]';
function hapticize() {
  if (!IOS_TAP_HAPTIC || !S.haptic) return;
  document.querySelectorAll(HAP_TARGETS).forEach(el => {
    if (el.closest('.hwrap') || el.closest('.hap')) return;
    const wrap = document.createElement('span');
    wrap.className = 'hwrap';
    wrap.style.display = getComputedStyle(el).display.startsWith('inline') ? 'inline-grid' : 'grid';
    el.before(wrap);
    wrap.appendChild(el);
    wrap.insertAdjacentHTML('beforeend', '<label class="hap" aria-hidden="true"><input type="checkbox" switch tabindex="-1"></label>');
  });
}
new MutationObserver(hapticize).observe(document.body, { childList: true, subtree: true });

// 自動再生の制限を、最初のタップで解除する
window.addEventListener('pointerdown', () => { initAudioGraph(); syncBgm(); }, { passive: true });
window.addEventListener('keydown', () => { initAudioGraph(); syncBgm(); });

/* ================= キャラの台詞（ホームとまとめ画面だけで使う） ================= */

const LINES = {
  hello: ['よう、来たな。今日の分を片付けよう', '知らない語だけやればいい。それが一番速い', 'マイクチェック完了。始めよう'],
  helloStreak: n => `${n}日連続。今日もつなごう`,
  allDone: n => `今日のメニューは全部終わり。${n}日連続、ナイス`,
  sortDone: '仕分け完了。「知ってる」語は本当に知ってるか確かめよう',
  good: ['キマってる。この調子', 'いいね、ちゃんと身についてる'],
  soso: ['間違えた語は、また近いうちに出す', '悪くない。取りこぼしは次で拾おう'],
  done: '今日の分は終わり。また明日な',
  songDone: 'この曲の語は全部押さえた。次の曲いこう',
};
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function say(text) { document.getElementById('bubble').textContent = text; }

/* ================= 小物 ================= */

const view = document.getElementById('view');
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
function setMode(home) { document.body.classList.toggle('focus', !home); }

const ICON = {
  play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 7l10 10M17 7 7 17"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
};
function playBtn(id, kind, label) {
  return `<button class="play" data-play="${esc(id)}" data-kind="${kind}">${ICON.play}${label}</button>`;
}
const STATUS_LABEL = { new: '未仕分け', claimed: 'テスト待ち', learning: '学習中', mastered: '覚えた' };

// 例文の中から見出し語を探す（活用形も拾う）。見つからなければ null
function findInExample(w) {
  const words = w.head.split(/\s+/);
  const pat = words.map((x, i) => {
    const e = x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (i < words.length - 1) return e;
    const stem = e.length > 3 ? e.replace(/(e|y)$/, '') : e;
    return stem + "[\\w']*";
  }).join('\\s+');
  const m = new RegExp(`\\b${pat}`, 'i').exec(w.ex);
  return m ? { index: m.index, text: m[0] } : null;
}
function markExample(w) {
  const f = findInExample(w);
  if (!f) return esc(w.ex);
  return esc(w.ex.slice(0, f.index)) + `<mark>${esc(f.text)}</mark>` + esc(w.ex.slice(f.index + f.text.length));
}

function distractors(w, n, key) {
  const seen = new Set([w[key]]);
  const pool = shuffle(WORDS.filter(x => x.id !== w.id));
  const samePos = pool.filter(x => x.pos === w.pos);
  const out = [];
  for (const x of samePos.concat(pool)) {
    if (out.length >= n) break;
    if (seen.has(x[key])) continue;
    seen.add(x[key]); out.push(x);
  }
  return out;
}

function detailHtml(w) {
  return `<div class="detail">
    <div class="blk">
      <div class="k">例文</div>
      <div class="ex">${markExample(w)}</div>
      <div class="exja">${esc(w.exJa)}</div>
      ${playBtn(w.id, 'example', '例文を聞く')}
    </div>
    <div class="blk">
      <div class="k">曲での使われ方 — ${esc(SONG[w.song].title)}</div>
      <div class="ctx"><b>${esc(w.form)}</b>　${esc(w.ctx)}</div>
    </div>
  </div>`;
}
function wordHtml(w, { q = '', meaning = true, song = false } = {}) {
  return `<div class="word">
    ${q ? `<div class="q">${q}</div>` : ''}
    <div class="head">${esc(w.head)}</div>
    <div class="pos">${esc(w.pos)} · Lv${w.lv}${song ? ` · ${esc(SONG[w.song].title)}` : ''}</div>
    ${meaning ? `<div class="ja">${esc(w.ja)}</div>` : ''}
    ${playBtn(w.id, 'word', '発音')}
  </div>`;
}
function sbarHtml(i, n, backTo) {
  return `<div class="sbar">
    <button class="close" data-go="${backTo}" aria-label="やめる">${ICON.close}</button>
    <div class="meter"><i style="width:${(i / n) * 100}%"></i></div>
    <span class="n">${Math.min(i + 1, n)} / ${n}</span>
  </div>`;
}
function meterHtml(c, total, thin) {
  const p = x => (x / total) * 100;
  return `<div class="meter${thin ? ' thin' : ''}"><i class="m" style="width:${p(c.mastered)}%"></i><i class="l" style="width:${p(c.learning)}%"></i></div>`;
}
function tilesHtml(c) {
  return `<div class="tiles">
    <div class="tile hi"><b>${c.mastered}</b><small>覚えた</small></div>
    <div class="tile"><b>${c.learning}</b><small>学習中</small></div>
    <div class="tile"><b>${c.due}</b><small>いま復習できる</small></div>
  </div>`;
}
function summaryHead(line) {
  return `<img class="avatar" src="assets/mc.png" alt=""><div class="line">${esc(line)}</div>`;
}
function scopeHome(song) { return SONG[song] ? `#/song/${song}` : '#/'; }

/* ================= 今日のメニュー ================= */

// 今日の新しい語：曲の並び順に、未仕分けの語から今日の残り枠ぶん
function todayNewIds() {
  const left = Math.max(0, DAILY_NEW - sortedToday());
  return WORDS.filter(w => status(w.id) === 'new').slice(0, left).map(w => w.id);
}
function todayTasks() {
  const c = counts(WORDS);
  const newLeft = todayNewIds().length;
  const anyNew = c.new > 0;
  return [
    { key: 'review', t: '復習', go: '#/learn/all', n: c.due,
      s: c.due ? `期限が来た${c.due}語` : '今日の分は完了', done: c.due === 0 },
    { key: 'check', t: '確認テスト', go: '#/check/all', n: c.claimed,
      s: c.claimed ? '「知ってる」と答えた語を確かめる' : 'テスト待ちなし', done: c.claimed === 0 },
    { key: 'new', t: '新しい語', go: '#/sort/today', n: newLeft,
      s: !anyNew ? '全曲の語を仕分け済み' : newLeft ? `今日あと${newLeft}語を仕分ける` : `今日の${DAILY_NEW}語は完了`, done: newLeft === 0 },
  ];
}

/* ================= 画面: ホーム（今日やることだけ） ================= */

function weekHtml() {
  const has = new Set(S.days);
  const names = ['日', '月', '火', '水', '木', '金', '土'];
  const cells = [];
  for (let k = 6; k >= 0; k--) {
    const d = new Date(); d.setDate(d.getDate() - k);
    cells.push(`<span class="dday${has.has(dayKey(d)) ? ' on' : ''}${k === 0 ? ' today' : ''}"><i></i>${names[d.getDay()]}</span>`);
  }
  return `<div class="week">${cells.join('')}</div>`;
}

function renderHome() {
  setMode(true);
  wantBgm(bgmSong || SONGS[0].id);
  const st = streak();
  const tasks = todayTasks();
  const next = tasks.find(t => !t.done);
  const doneToday = S.days[S.days.length - 1] === dayKey();
  say(!next ? LINES.allDone(st) : st >= 2 ? LINES.helloStreak(st) : pick(LINES.hello));

  view.innerHTML = `
    <div class="streak">
      <div><div class="big num">${st}<small> 日連続</small></div>
      <div class="muted">${doneToday ? '今日の記録はついた' : st ? '今日やれば記録がつながる' : '今日から記録をつけよう'}</div></div>
      ${weekHtml()}
    </div>
    <div class="label">今日やること</div>
    ${next
      ? `<button class="btn primary" data-go="${next.go}">${next.t}を始める <span class="count">${next.n}</span></button>`
      : `<div class="alldone">${ICON.check}今日のメニューは完了</div>`}
    <div class="list tasks">${tasks.map((t, i) => `
      <button class="row task${t.done ? ' done' : ''}" data-go="${t.go}" ${t.done ? 'disabled' : ''}>
        <span class="mark">${t.done ? ICON.check : i + 1}</span>
        <span><div class="t">${t.t}</div><div class="s">${t.s}</div></span>
        <span class="r">${t.done ? '' : `${t.n}<span class="chev"></span>`}</span>
      </button>`).join('')}</div>
    <div class="label">そのほか</div>
    <div class="list">
      <button class="row" data-go="#/songs"><span><div class="t">曲と単語の一覧</div><div class="s">${esc(ARTIST.name)} · ${SONGS.length}曲 · 覚えた ${counts(WORDS).mastered} / ${WORDS.length}語</div></span><span class="r"><span class="chev"></span></span></button>
      <button class="row" data-go="#/settings"><span><div class="t">設定</div><div class="s">BGMの音量・効果音・振動・更新</div></span><span class="r"><span class="chev"></span></span></button>
    </div>`;
}

/* ================= 画面: 曲の一覧（アーティスト紹介つき） ================= */

function renderSongs() {
  setMode(false);
  const c = counts(WORDS);
  view.innerHTML = `
    <button class="back" data-go="#/">ホーム</button>
    <h1 class="title">${esc(ARTIST.name)}</h1>
    <p class="about">${esc(ARTIST.bio)}</p>
    ${meterHtml(c, WORDS.length)}
    <div class="legend"><span>覚えた <b>${c.mastered}</b></span><span>学習中 <b>${c.learning}</b></span><span>テスト待ち <b>${c.claimed}</b></span><span>未仕分け <b>${c.new}</b></span></div>
    <div class="label">${SONGS.length}曲</div>
    <div class="list">${SONGS.map(s => {
      const list = wordsOf(s.id); const k = counts(list);
      const started = k.new < list.length;
      return `<button class="row" data-go="#/song/${s.id}">
        <span>
          <div class="t">${esc(s.title)}</div>
          <div class="s">${s.year} · ${list.length}語${started ? ` · ${k.mastered}語 覚えた` : ''}</div>
          ${started ? meterHtml(k, list.length, true) : ''}
        </span>
        <span class="r">${k.due ? '<span class="dot" title="復習あり"></span>' : ''}<span class="chev"></span></span>
      </button>`;
    }).join('')}</div>
    <div class="foot">歌詞は載せていません。例文はすべて書き下ろしです。原曲の歌詞は各曲ページのリンクから Genius で。キャラクターとBGMはAIで作ったオリジナルです。</div>`;
}

/* ================= 画面: 曲 ================= */

function renderSong(id) {
  const s = SONG[id];
  if (!s) return go('#/');
  setMode(false);
  wantBgm(id);
  const list = wordsOf(id); const c = counts(list);
  const genius = `https://genius.com/search?q=${encodeURIComponent(`${ARTIST.name} ${s.title}`)}`;
  const next = nextDueText(list);
  const steps = [
    { n: c.new, go: `#/sort/${id}`, t: '仕分ける', s: '知ってる／知らないを選ぶ' },
    { n: c.claimed, go: `#/check/${id}`, t: '確認テスト', s: '「知ってる」語を確かめる' },
    { n: c.due, go: `#/learn/${id}`, t: '学習・復習', s: c.due ? '期限が来た語' : next ? `次の復習は${next}` : 'まだありません' },
  ];
  view.innerHTML = `
    <button class="back" data-go="#/songs">曲の一覧</button>
    <h1 class="title">${esc(s.title)}</h1>
    <div class="meta">${esc(s.album)} · ${s.year} · <a href="${genius}" target="_blank" rel="noopener">歌詞を Genius で見る</a></div>
    ${s.about ? `<p class="about">${esc(s.about)}</p>` : ''}
    ${meterHtml(c, list.length)}
    <div class="legend"><span>覚えた <b>${c.mastered}</b></span><span>学習中 <b>${c.learning}</b></span><span>テスト待ち <b>${c.claimed}</b></span><span>未仕分け <b>${c.new}</b></span></div>
    ${c.mastered === list.length ? `<div class="alldone">${ICON.check}${LINES.songDone}</div>` : ''}
    <div class="label">この曲だけやる</div>
    <div class="list">${steps.map(x => `
      <button class="row" data-go="${x.go}" ${x.n ? '' : 'disabled'}>
        <span><div class="t">${x.t}</div><div class="s">${x.s}</div></span>
        <span class="r">${x.n}<span class="chev"></span></span>
      </button>`).join('')}</div>
    <div class="label">単語 ${list.length}</div>
    <div class="list">${list.map(w => {
      const st = status(w.id);
      return `<button class="row" data-go="#/word/${w.id}">
        <span><div class="t">${esc(w.head)}</div>${st === 'new' ? '' : `<div class="s">${esc(w.ja)}</div>`}</span>
        <span class="st ${st}">${STATUS_LABEL[st]}</span>
      </button>`;
    }).join('')}</div>`;
}

/* ================= 画面: 単語1つ ================= */

function renderWord(id) {
  const w = WORD[id];
  if (!w) return go('#/');
  setMode(false);
  wantBgm(w.song);
  view.innerHTML = `<button class="back" data-go="#/song/${w.song}">${esc(SONG[w.song].title)}</button>${wordHtml(w)}${detailHtml(w)}`;
  autoSay(id);
}

/* ================= 画面: 設定 ================= */

function renderSettings() {
  setMode(false);
  wantBgm(bgmSong || SONGS[0].id);   // 音量を聞きながら調整できるように鳴らす
  const sw = (key, t, s) => `
    <label class="row">
      <span><div class="t">${t}</div>${s ? `<div class="s">${s}</div>` : ''}</span>
      <input type="checkbox" class="toggle" data-set="${key}" ${S[key] ? 'checked' : ''}>
    </label>`;
  view.innerHTML = `
    <button class="back" data-go="#/">ホーム</button>
    <h1 class="title">設定</h1>
    <div class="label">音</div>
    <div class="list">
      <div class="row slider-row">
        <span><div class="t">BGMの音量</div><div class="s" id="vol-text">${S.bgmVol ? Math.round(S.bgmVol * 100) : 'オフ'}</div></span>
        <input type="range" id="bgm-vol" min="0" max="100" step="5" value="${Math.round(S.bgmVol * 100)}" aria-label="BGMの音量">
      </div>
      <div class="row"><span><div class="s" id="bgm-status">BGM: ${esc(bgmStatus())}</div></span></div>
      ${sw('voice', '発音を自動で流す', '単語が出たときに読み上げる')}
      ${sw('sfx', '効果音', '正解・不正解で短く鳴らす')}
      ${sw('haptic', '振動', IOS_TAP_HAPTIC ? 'ボタンを押した瞬間に軽い手応え（iPhone。強さは変えられない）' : '正解・不正解で振動（Android）')}
    </div>
    <div class="label">アプリ</div>
    <div class="list">
      <div class="row">
        <span><div class="t">いまの版</div><div class="s" id="ver-text">${APP_VERSION}</div></span>
        <button class="pill" id="btn-check-update">更新を確認</button>
      </div>
      <button class="row" id="btn-reset"><span><div class="t danger">学習記録をリセット</div><div class="s">この端末の記録をすべて消す</div></span></button>
    </div>
    <div class="foot">学習記録はこの端末の中だけに保存されます。</div>`;

  const vol = document.getElementById('bgm-vol');
  vol.addEventListener('input', () => {
    S.bgmVol = Number(vol.value) / 100;
    document.getElementById('vol-text').textContent = S.bgmVol ? Math.round(S.bgmVol * 100) : 'オフ';
    initAudioGraph(); applyBgmLevel(); syncBgm();
  });
  vol.addEventListener('change', () => store.save());
  // 状態表示を追いかける（画面を離れたら止まる）
  const st = document.getElementById('bgm-status');
  const tick = setInterval(() => { if (!document.body.contains(st)) return clearInterval(tick); st.textContent = `BGM: ${bgmStatus()}`; }, 1000);
  view.querySelectorAll('[data-set]').forEach(el => el.addEventListener('change', () => {
    S[el.dataset.set] = el.checked; store.save();
    if (el.dataset.set === 'voice' && !el.checked) voice.pause();
    if (el.dataset.set === 'sfx' && el.checked) { initAudioGraph(); sfx(true); }
    if (el.dataset.set === 'haptic') { if (el.checked) buzz(true); render(); }
  }));
  document.getElementById('btn-check-update').onclick = async e => {
    const b = e.currentTarget;
    b.textContent = '確認中…';
    const latest = await fetchLatestVersion();
    if (!latest) { b.textContent = '確認できませんでした'; return; }
    if (latest !== APP_VERSION) { b.textContent = `${latest} に更新`; b.onclick = reloadLatest; }
    else b.textContent = '最新です';
  };
  document.getElementById('btn-reset').onclick = () => {
    if (!confirm('この端末の学習記録をすべて消します。よろしいですか？')) return;
    S.w = {}; S.days = []; S.today = { d: '', sorted: 0 }; store.save(); go('#/');
  };
}

/* ================= 更新の確認 ================= */

async function fetchLatestVersion() {
  try {
    const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    return r.ok ? (await r.json()).version : null;
  } catch (e) { return null; }
}
function reloadLatest() {
  // index.html ごと取り直す。中で読むファイルは ?v=版 付きなので、新しい版の分だけ取り直しになる
  location.replace(`${location.pathname}?u=${Date.now()}${location.hash}`);
}
async function checkUpdateOnStart() {
  const latest = await fetchLatestVersion();
  if (!latest || latest === APP_VERSION) return;
  const bar = document.getElementById('update-bar');
  bar.innerHTML = `<span>新しい版があります（${esc(latest)}）</span><button class="pill" id="btn-update">更新</button>`;
  bar.hidden = false;
  document.getElementById('btn-update').onclick = reloadLatest;
}

/* ================= 画面: 仕分け ================= */

let session = null;

function renderSort(id) {
  const today = id === 'today';
  if (!today && !SONG[id]) return go('#/');
  setMode(false);
  if (!session || session.type !== 'sort' || session.song !== id) {
    const queue = today ? todayNewIds() : wordsOf(id).filter(w => status(w.id) === 'new').map(w => w.id);
    if (!queue.length) return location.replace(today ? '#/' : `#/song/${id}`);
    session = { type: 'sort', song: id, queue, i: 0, history: [], known: 0, unknown: 0 };
  }
  drawSort();
}
function drawSort() {
  const ss = session;
  if (ss.i >= ss.queue.length) return drawSortDone();
  const w = WORD[ss.queue[ss.i]];
  wantBgm(w.song);
  view.innerHTML = `
    ${sbarHtml(ss.i, ss.queue.length, scopeHome(ss.song))}
    ${wordHtml(w, { q: '意味がわかる？', meaning: false, song: ss.song === 'today' })}
    <div class="pair">
      <button class="btn" data-sort="0">${ICON.x}知らない</button>
      <button class="btn" data-sort="1">${ICON.check}知ってる</button>
    </div>
    <button class="undo" id="btn-undo" ${ss.history.length ? '' : 'disabled'}>ひとつ戻す</button>
    <div class="keyhint">← 知らない　→ 知ってる　Space 発音</div>`;
  document.getElementById('btn-undo').onclick = undoSort;
  autoSay(w.id);
}
function doSort(known) {
  const ss = session;
  const id = ss.queue[ss.i];
  ss.history.push(id);
  if (known) { setClaimed(id); ss.known++; } else { setLearn(id); ss.unknown++; }
  addSortedToday(1); markStudied(); store.save();
  ss.i++;
  drawSort();
}
function undoSort() {
  const ss = session;
  const id = ss.history.pop();
  if (!id) return;
  if (status(id) === 'claimed') ss.known--; else ss.unknown--;
  delete S.w[id]; addSortedToday(-1); store.save();
  ss.i--;
  drawSort();
}
function drawSortDone() {
  const ss = session;
  const scope = ss.song === 'today' ? 'all' : ss.song;
  const c = counts(wordsOf(scope));
  view.innerHTML = `
    <div class="summary">
      ${summaryHead(LINES.sortDone)}
      <div class="tiles">
        <div class="tile"><b>${ss.known}</b><small>知ってる</small></div>
        <div class="tile"><b>${ss.unknown}</b><small>知らない</small></div>
        <div class="tile"><b>${ss.queue.length}</b><small>合計</small></div>
      </div>
    </div>
    <div class="actions">
      ${c.claimed ? `<button class="btn primary" data-go="#/check/${scope}">確認テスト <span class="count">${c.claimed}</span></button>` : ''}
      ${c.due ? `<button class="btn ${c.claimed ? '' : 'primary'}" data-go="#/learn/${scope}">知らない語を学習 <span class="count">${c.due}</span></button>` : ''}
      <button class="btn" data-go="${scopeHome(ss.song)}">${ss.song === 'today' ? 'ホームへ' : '曲のページへ'}</button>
    </div>`;
  session = null;
}

/* ================= 画面: 確認テスト・学習 ================= */

function startQuiz(type, id) {
  const list = wordsOf(id);
  let ids;
  if (type === 'check') ids = list.filter(w => status(w.id) === 'claimed').map(w => w.id);
  else ids = list.filter(w => isDue(w.id)).sort((a, b) => S.w[a.id].due - S.w[b.id].due).map(w => w.id).slice(0, SESSION_MAX);
  session = { type, song: id, queue: ids, i: 0, ok: 0, ng: 0, retried: new Set(), step: null };
}
function renderQuiz(type, id) {
  if (id !== 'all' && !SONG[id]) return go('#/');
  setMode(false);
  if (!session || session.type !== type || session.song !== id) startQuiz(type, id);
  drawQuiz();
}
function drawQuiz() {
  const ss = session;
  if (ss.i >= ss.queue.length) return drawQuizDone();
  const w = WORD[ss.queue[ss.i]];
  const r = rec(w.id);
  const all = ss.song === 'all';
  wantBgm(w.song);
  const top = sbarHtml(ss.i, ss.queue.length, scopeHome(ss.song));

  // 学習で初めて出会う語は、先に意味と例文を見せる
  if (ss.type === 'learn' && r && !r.seen && ss.step !== 'quiz') {
    ss.step = 'intro';
    view.innerHTML = `${top}${wordHtml(w, { q: '新しい語', song: all })}${detailHtml(w)}
      <div class="actions"><button class="btn primary" id="btn-next">覚えた、テストする</button></div>`;
    document.getElementById('btn-next').onclick = () => { r.seen = true; store.save(); ss.step = 'quiz'; drawQuiz(); };
    autoSay(w.id);
    return;
  }

  ss.step = 'quiz';
  const cloze = ss.type === 'learn' && r && r.box >= 2 ? findInExample(w) : null;
  let opts, key, body;
  if (cloze) {
    opts = shuffle([w, ...distractors(w, 3, 'head')]); key = 'head';
    const sent = esc(w.ex.slice(0, cloze.index)) + '<span class="gap"></span>' + esc(w.ex.slice(cloze.index + cloze.text.length));
    body = `<div class="word" style="text-align:left"><div class="q">空欄に入る語は？</div><div class="cloze">${sent}</div><div class="cloze-ja">${esc(w.exJa)}</div></div>`;
  } else {
    opts = shuffle([w, ...distractors(w, 3, 'ja')]); key = 'ja';
    body = wordHtml(w, { q: '意味は？', meaning: false, song: all });
  }
  ss.current = { w, opts, answered: false };
  view.innerHTML = `${top}${body}
    <div class="choices" id="choices">${opts.map((o, k) => `<button class="choice" data-choice="${k}">${esc(o[key])}</button>`).join('')}</div>
    <button class="dunno" id="btn-dunno" data-choice="-1">わからない</button>
    <div id="after"></div>
    <div class="keyhint" id="hint">1〜4 で選択　0 わからない</div>`;
  if (!cloze) autoSay(w.id);
}
function choose(k) {
  const ss = session;
  const cur = ss && ss.current;
  // k === -1 は「わからない」。当てずっぽうで正解してしまうのを防ぐため、自己申告で不正解と同じ扱いにする。
  // 音と振動は鳴らさない（間違えたわけではないので、押しにくくしない）
  const dunno = k === -1;
  if (!cur || cur.answered || (!dunno && !cur.opts[k])) return;
  cur.answered = true;
  const w = cur.w;
  const ok = !dunno && cur.opts[k].id === w.id;
  if (!dunno) { sfx(ok); buzz(ok); }
  const box = document.getElementById('choices');
  box.classList.add('done');
  const btns = box.querySelectorAll('.choice');
  if (!dunno) btns[k].classList.add(ok ? 'right' : 'wrong');
  btns[cur.opts.indexOf(w)].classList.add('right');
  const dn = document.getElementById('btn-dunno');
  if (dn) (dn.closest('.hwrap') || dn).remove();

  if (ss.type === 'check') passCheck(w.id, ok);
  else answer(w.id, ok);
  if (ok) ss.ok++; else ss.ng++;
  // 学習で間違えた語は、同じ回の少し後でもう一度出す（1回だけ）
  if (!ok && ss.type === 'learn' && !ss.retried.has(w.id)) {
    ss.retried.add(w.id);
    ss.queue.splice(Math.min(ss.i + 4, ss.queue.length), 0, w.id);
  }
  document.getElementById('hint').remove();
  document.getElementById('after').innerHTML = `
    <div class="feedback">
      <div class="verdict ${ok ? 'ok' : dunno ? 'dunno' : 'ng'}">${ok ? '正解' : dunno ? 'わからない' : '不正解'}<span>${esc(w.head)} = ${esc(w.ja)}</span></div>
      ${ok ? '' : detailHtml(w)}
    </div>
    <div class="actions"><button class="btn primary" id="btn-next">次へ</button></div>`;
  document.getElementById('btn-next').onclick = nextQuiz;
  document.getElementById('btn-next').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  // 不正解の音と例文の読み上げが重ならないよう少し待つ
  if (!ok) setTimeout(() => { if (session === ss && ss.current === cur) autoSay(w.id, 'example'); }, 350);
}
function nextQuiz() { session.i++; session.step = null; session.current = null; drawQuiz(); window.scrollTo(0, 0); }
function drawQuizDone() {
  const ss = session;
  const backTo = scopeHome(ss.song);
  const list = wordsOf(ss.song);
  const c = counts(list);
  if (!ss.queue.length) {
    view.innerHTML = `<div class="summary">${summaryHead(LINES.done)}<div class="cap">次の復習は ${nextDueText(list) || '未定'}</div></div>
      <div class="actions"><button class="btn primary" data-go="${backTo}">戻る</button></div>`;
    session = null;
    return;
  }
  const rate = ss.ok / (ss.ok + ss.ng);
  view.innerHTML = `
    <div class="summary">
      ${summaryHead(c.due ? `あと${c.due}語。もう1セットいける？` : rate >= 0.8 ? pick(LINES.good) : pick(LINES.soso))}
      <div class="big">${ss.ok}<small> / ${ss.ok + ss.ng}</small></div>
      <div class="cap">${ss.type === 'check' ? '確認テスト' : '学習'}の正解数</div>
      ${tilesHtml(c)}
    </div>
    <div class="actions">
      ${c.due ? `<button class="btn primary" id="btn-more">続けて学習 <span class="count">${Math.min(c.due, SESSION_MAX)}</span></button>` : ''}
      <button class="btn ${c.due ? '' : 'primary'}" data-go="${backTo}">${backTo === '#/' ? 'ホームへ' : '戻る'}</button>
    </div>`;
  const more = document.getElementById('btn-more');
  if (more) more.onclick = () => { const s = ss.song; session = null; renderQuiz('learn', s); };
  session = null;
}

/* ================= ルーター・操作 ================= */

function render() {
  const [, page, arg] = (location.hash || '#/').split('/');
  if (!['sort', 'check', 'learn'].includes(page)) session = null;
  window.scrollTo(0, 0);
  switch (page) {
    case 'songs': return renderSongs();
    case 'song': return renderSong(arg);
    case 'word': return renderWord(arg);
    case 'settings': return renderSettings();
    case 'sort': return renderSort(arg);
    case 'check': return renderQuiz('check', arg);
    case 'learn': return renderQuiz('learn', arg);
    default: return renderHome();
  }
}

let lastHapTap = 0;
document.addEventListener('click', e => {
  // 透明スイッチ: ラベルを押すとラベルとスイッチの両方にクリックが届くので、1回にまとめて下のボタンへ渡す
  const hap = e.target.closest && e.target.closest('.hap');
  if (hap) {
    const now = performance.now();
    if (now - lastHapTap < 150) return;
    lastHapTap = now;
    const target = hap.parentElement.firstElementChild;
    if (target && !target.disabled) target.click();
    return;
  }
  const t = e.target.closest('[data-go],[data-play],[data-sort],[data-choice]');
  if (!t) return;
  if (t.dataset.go) return go(t.dataset.go);
  if (t.dataset.play) return playUrl(audioFor(t.dataset.play, t.dataset.kind), t);
  if (t.dataset.sort) return doSort(t.dataset.sort === '1');
  if (t.dataset.choice) return choose(Number(t.dataset.choice));
});

document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.matches && e.target.matches('input')) return;
  const ss = session;
  if (e.key === ' ') {
    const b = document.querySelector('.play');
    if (b) { e.preventDefault(); b.click(); }
    return;
  }
  if (!ss) return;
  if (ss.type === 'sort' && ss.i < ss.queue.length) {
    if (e.key === 'ArrowLeft') doSort(false);
    if (e.key === 'ArrowRight') doSort(true);
    if (e.key === 'Backspace') undoSort();
    return;
  }
  if (ss.current && !ss.current.answered && /^[1-4]$/.test(e.key)) choose(Number(e.key) - 1);
  else if (ss.current && !ss.current.answered && e.key === '0') choose(-1);
  else if (e.key === 'Enter') { const b = document.getElementById('btn-next'); if (b) { e.preventDefault(); b.click(); } }
});

// 画面に出ていないときは動画とBGMを止めて電池を守る
document.addEventListener('visibilitychange', () => {
  const v = document.getElementById('mc-video');
  if (document.hidden) { v.pause(); bgm.pause(); }
  else { v.play().catch(() => {}); syncBgm(); checkUpdateOnStart(); }
});

window.addEventListener('hashchange', render);
render();
checkUpdateOnStart();
