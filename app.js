/* Bars & Words v2 — アプリ本体
   流れ: 仕分け（知ってる／知らない） → 知ってる語は確認テスト、知らない語は学習 → 間隔反復で定着
   学習記録は端末内（localStorage）だけに持つ。 */

'use strict';

/* ================= 設定 ================= */

const DAY = 86400000;
// 箱ごとの次回出題までの間隔。box 0 は「今日もう一度」
const INTERVALS = [0, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY, 90 * DAY];
const MASTER_BOX = 4;      // ここまで上がったら「覚えた」
const SESSION_MAX = 15;    // 1回の学習で出す語数
const BGM_LEVEL = 0.22;
const BGM_DUCK = 0.06;
const STORE_KEY = 'bw2';

const SONGS = ARTIST.songs;
const SONG = Object.fromEntries(SONGS.map(s => [s.id, s]));
const WORD = Object.fromEntries(WORDS.map(w => [w.id, w]));

/* ================= 記録 ================= */

const store = (() => {
  let data = { w: {}, days: [], bgm: true, voice: true };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) data = Object.assign(data, JSON.parse(raw));
  } catch (e) { /* 読めない環境でも動かす */ }
  return {
    data,
    save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) {} },
  };
})();
const S = store.data;

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
  const d = new Date().toISOString().slice(0, 10);
  if (S.days[S.days.length - 1] !== d) { S.days.push(d); S.days = S.days.slice(-400); }
}
function streak() {
  let n = 0;
  const day = new Date();
  const has = new Set(S.days);
  // 今日まだやっていなくても、昨日まで続いていれば連続として数える
  if (!has.has(day.toISOString().slice(0, 10))) day.setDate(day.getDate() - 1);
  while (has.has(day.toISOString().slice(0, 10))) { n++; day.setDate(day.getDate() - 1); }
  return n;
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
let actx = null, bgmGain = null, bgmSong = null;
const bgm = new Audio();
bgm.loop = true;
bgm.preload = 'none';

function initAudioGraph() {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  actx = new AC();
  // iOSは audio.volume を変えられないので、BGMの音量はWeb Audioで絞る
  const src = actx.createMediaElementSource(bgm);
  bgmGain = actx.createGain();
  bgmGain.gain.value = BGM_LEVEL;
  src.connect(bgmGain).connect(actx.destination);
}
function setBgmLevel(v) {
  if (bgmGain) bgmGain.gain.setTargetAtTime(v, actx.currentTime, 0.12);
  else bgm.volume = v;
}
function wantBgm(songId) {
  if (songId && songId !== 'all') bgmSong = songId;
  syncBgm();
}
function syncBgm() {
  if (!S.bgm || !bgmSong) { bgm.pause(); return; }
  const cur = bgm.dataset.song;
  if (cur !== bgmSong) {
    bgm.dataset.song = bgmSong;
    bgm.src = `bgm/${bgmSong}_${Math.random() < 0.5 ? 'a' : 'b'}.mp3`;
  }
  if (bgm.paused) bgm.play().catch(() => {});
}
function playUrl(url, btn) {
  if (!url) return;
  document.querySelectorAll('.play.on').forEach(b => b.classList.remove('on'));
  voice.src = url;
  voice.currentTime = 0;
  if (btn) btn.classList.add('on');
  voice.play().catch(() => {});
}
voice.addEventListener('play', () => setBgmLevel(BGM_DUCK));
['ended', 'pause', 'error'].forEach(ev => voice.addEventListener(ev, () => {
  setBgmLevel(BGM_LEVEL);
  document.querySelectorAll('.play.on').forEach(b => b.classList.remove('on'));
}));
function audioFor(id, kind) { return (typeof AUDIO !== 'undefined' && AUDIO[id]) ? AUDIO[id][kind] : null; }
function autoSay(id, kind = 'word') { if (S.voice) playUrl(audioFor(id, kind)); }

// 自動再生の制限を、最初のタップで解除する
window.addEventListener('pointerdown', () => { initAudioGraph(); syncBgm(); }, { passive: true });
window.addEventListener('keydown', () => { initAudioGraph(); syncBgm(); });

/* ================= キャラの台詞（ホームとまとめ画面だけで使う） ================= */

const LINES = {
  hello: ['よう、来たな。今日も1語ずつ潰していこう', '知らない語だけやればいい。それが一番速い', 'マイクチェック完了。始めよう'],
  helloStreak: n => `${n}日連続。その調子でいこう`,
  due: n => `復習が${n}語たまってる。まずはそっちから`,
  sortDone: '仕分け完了。「知ってる」語は本当に知ってるか確かめよう',
  good: ['キマってる。この調子', 'いいね、ちゃんと身についてる'],
  soso: ['間違えた語は、また近いうちに出す', '悪くない。取りこぼしは次で拾おう'],
  done: '今日の分は終わり。また明日な',
  allDone: 'この曲の語は全部押さえた。次の曲いこう',
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
function wordHtml(w, { q = '', meaning = true } = {}) {
  return `<div class="word">
    ${q ? `<div class="q">${q}</div>` : ''}
    <div class="head">${esc(w.head)}</div>
    <div class="pos">${esc(w.pos)} · Lv${w.lv}</div>
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

/* ================= 画面: ホーム ================= */

function renderHome() {
  setMode(true);
  const c = counts(WORDS);
  const st = streak();
  say(c.due ? LINES.due(c.due) : st >= 2 ? LINES.helloStreak(st) : pick(LINES.hello));

  const firstNew = SONGS.find(s => counts(wordsOf(s.id)).new > 0);
  let actions = '';
  if (c.due) actions += `<button class="btn primary" data-go="#/learn/all">今日の復習 <span class="count">${c.due}</span></button>`;
  else if (firstNew) actions += `<button class="btn primary" data-go="#/sort/${firstNew.id}">${esc(firstNew.title)} を始める</button>`;
  if (c.claimed) actions += `<button class="btn" data-go="#/check/all">確認テスト <span class="count">${c.claimed}</span></button>`;

  view.innerHTML = `
    <div class="overview">
      <div class="big num">${c.mastered}<small> / ${WORDS.length}語 覚えた</small></div>
      ${meterHtml(c, WORDS.length)}
      <div class="sub"><span>学習中 ${c.learning}</span><span>${st ? `${st}日連続` : '今日から'}</span></div>
    </div>
    ${actions ? `<div class="actions">${actions}</div>` : ''}
    <div class="label">Eminem</div>
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
    <div class="foot">
      歌詞は載せていません。例文はすべて書き下ろしです。原曲の歌詞は各曲ページのリンクから Genius で。
      キャラクターとBGMはAIで作ったオリジナルです。学習記録はこの端末の中だけに保存されます。<br>
      <button id="btn-reset">学習記録をリセット</button>
    </div>`;
  document.getElementById('btn-reset').onclick = () => {
    if (!confirm('この端末の学習記録をすべて消します。よろしいですか？')) return;
    S.w = {}; S.days = []; store.save(); render();
  };
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

  // いちばん先にやるべき操作だけを主ボタンにする
  const steps = [
    { n: c.new, go: `#/sort/${id}`, t: '仕分ける', s: '知ってる／知らないを選ぶ' },
    { n: c.claimed, go: `#/check/${id}`, t: '確認テスト', s: '「知ってる」語を確かめる' },
    { n: c.due, go: `#/learn/${id}`, t: '学習・復習', s: c.due ? '期限が来た語' : next ? `次の復習は${next}` : 'まだありません' },
  ];
  const main = steps.find(x => x.n > 0);
  view.innerHTML = `
    <button class="back" data-go="#/">曲の一覧</button>
    <h1 class="title">${esc(s.title)}</h1>
    <div class="meta">${esc(s.album)} · ${s.year} · <a href="${genius}" target="_blank" rel="noopener">歌詞を Genius で見る</a></div>
    ${meterHtml(c, list.length)}
    <div class="legend"><span>覚えた <b>${c.mastered}</b></span><span>学習中 <b>${c.learning}</b></span><span>テスト待ち <b>${c.claimed}</b></span><span>未仕分け <b>${c.new}</b></span></div>
    <div class="actions">${main
      ? `<button class="btn primary" data-go="${main.go}">${main.t} <span class="count">${main.n}</span></button>`
      : `<div class="muted">${c.mastered === list.length ? LINES.allDone : `今日の分は完了。${steps[2].s}`}</div>`}</div>
    <div class="label">${main ? 'ほかのステップ' : 'ステップ'}</div>
    <div class="list">${steps.filter(x => x !== main).map(x => `
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

/* ================= 画面: 仕分け ================= */

let session = null;

function renderSort(id) {
  if (!SONG[id]) return go('#/');
  setMode(false);
  wantBgm(id);
  if (!session || session.type !== 'sort' || session.song !== id) {
    const queue = wordsOf(id).filter(w => status(w.id) === 'new').map(w => w.id);
    if (!queue.length) return location.replace(`#/song/${id}`);
    session = { type: 'sort', song: id, queue, i: 0, history: [], known: 0, unknown: 0 };
  }
  drawSort();
}
function drawSort() {
  const ss = session;
  if (ss.i >= ss.queue.length) return drawSortDone();
  const w = WORD[ss.queue[ss.i]];
  view.innerHTML = `
    ${sbarHtml(ss.i, ss.queue.length, `#/song/${ss.song}`)}
    ${wordHtml(w, { q: '意味がわかる？', meaning: false })}
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
  store.save();
  ss.i++;
  drawSort();
}
function undoSort() {
  const ss = session;
  const id = ss.history.pop();
  if (!id) return;
  if (status(id) === 'claimed') ss.known--; else ss.unknown--;
  delete S.w[id]; store.save();
  ss.i--;
  drawSort();
}
function drawSortDone() {
  const ss = session;
  const c = counts(wordsOf(ss.song));
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
      ${c.claimed ? `<button class="btn primary" data-go="#/check/${ss.song}">確認テスト <span class="count">${c.claimed}</span></button>` : ''}
      ${c.due ? `<button class="btn ${c.claimed ? '' : 'primary'}" data-go="#/learn/${ss.song}">知らない語を学習 <span class="count">${c.due}</span></button>` : ''}
      <button class="btn" data-go="#/song/${ss.song}">曲のページへ</button>
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
  wantBgm(id);
  if (!session || session.type !== type || session.song !== id) startQuiz(type, id);
  drawQuiz();
}
function drawQuiz() {
  const ss = session;
  if (ss.i >= ss.queue.length) return drawQuizDone();
  const w = WORD[ss.queue[ss.i]];
  const r = rec(w.id);
  const top = sbarHtml(ss.i, ss.queue.length, ss.song === 'all' ? '#/' : `#/song/${ss.song}`);

  // 学習で初めて出会う語は、先に意味と例文を見せる
  if (ss.type === 'learn' && r && !r.seen && ss.step !== 'quiz') {
    ss.step = 'intro';
    view.innerHTML = `${top}${wordHtml(w, { q: '新しい語' })}${detailHtml(w)}
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
    body = wordHtml(w, { q: '意味は？', meaning: false });
  }
  ss.current = { w, opts, answered: false };
  view.innerHTML = `${top}${body}
    <div class="choices" id="choices">${opts.map((o, k) => `<button class="choice" data-choice="${k}">${esc(o[key])}</button>`).join('')}</div>
    <div id="after"></div>
    <div class="keyhint" id="hint">1〜4 で選択</div>`;
  if (!cloze) autoSay(w.id);
}
function choose(k) {
  const ss = session;
  const cur = ss && ss.current;
  if (!cur || cur.answered || !cur.opts[k]) return;
  cur.answered = true;
  const w = cur.w;
  const ok = cur.opts[k].id === w.id;
  const box = document.getElementById('choices');
  box.classList.add('done');
  box.children[k].classList.add(ok ? 'right' : 'wrong');
  box.children[cur.opts.indexOf(w)].classList.add('right');

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
      <div class="verdict ${ok ? 'ok' : 'ng'}">${ok ? '正解' : '不正解'}<span>${esc(w.head)} = ${esc(w.ja)}</span></div>
      ${ok ? '' : detailHtml(w)}
    </div>
    <div class="actions"><button class="btn primary" id="btn-next">次へ</button></div>`;
  document.getElementById('btn-next').onclick = nextQuiz;
  document.getElementById('btn-next').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  if (!ok) autoSay(w.id, 'example');
}
function nextQuiz() { session.i++; session.step = null; session.current = null; drawQuiz(); window.scrollTo(0, 0); }
function drawQuizDone() {
  const ss = session;
  const backTo = ss.song === 'all' ? '#/' : `#/song/${ss.song}`;
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
      <button class="btn ${c.due ? '' : 'primary'}" data-go="${backTo}">戻る</button>
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
    case 'song': return renderSong(arg);
    case 'word': return renderWord(arg);
    case 'sort': return renderSort(arg);
    case 'check': return renderQuiz('check', arg);
    case 'learn': return renderQuiz('learn', arg);
    default: return renderHome();
  }
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-go],[data-play],[data-sort],[data-choice]');
  if (!t) return;
  if (t.dataset.go) return go(t.dataset.go);
  if (t.dataset.play) return playUrl(audioFor(t.dataset.play, t.dataset.kind), t);
  if (t.dataset.sort) return doSort(t.dataset.sort === '1');
  if (t.dataset.choice) return choose(Number(t.dataset.choice));
});

document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
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
  else if (e.key === 'Enter') { const b = document.getElementById('btn-next'); if (b) { e.preventDefault(); b.click(); } }
});

function syncToggles() {
  document.getElementById('btn-bgm').setAttribute('aria-pressed', String(S.bgm));
  document.getElementById('btn-voice').setAttribute('aria-pressed', String(S.voice));
}
document.getElementById('btn-bgm').onclick = () => { S.bgm = !S.bgm; store.save(); syncToggles(); initAudioGraph(); syncBgm(); };
document.getElementById('btn-voice').onclick = () => { S.voice = !S.voice; store.save(); syncToggles(); if (!S.voice) voice.pause(); };

// 画面に出ていないときは動画とBGMを止めて電池を守る
document.addEventListener('visibilitychange', () => {
  const v = document.getElementById('mc-video');
  if (document.hidden) { v.pause(); bgm.pause(); }
  else { v.play().catch(() => {}); syncBgm(); }
});

window.addEventListener('hashchange', render);
syncToggles();
render();
