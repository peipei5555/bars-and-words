/* ===========================================================
   Bars & Words — 本体
   Phase A : ヒストリー / スラング / 発音・縮約 / 音楽を語る / 知識クイズ
   保存先  : localStorage（この端末の中だけ。外部送信なし）
   =========================================================== */

'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                          .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* -----------------------------------------------------------
   1. 保存
   ----------------------------------------------------------- */
const KEY = 'bars-and-words-v1';

const Store = {
  d: null,

  load() {
    try { this.d = JSON.parse(localStorage.getItem(KEY)) || null; }
    catch (e) { this.d = null; }
    if (!this.d) this.d = this.blank();
    const b = this.blank();
    for (const k in b) if (!(k in this.d)) this.d[k] = b[k];
    return this.d;
  },

  blank() {
    return {
      xp: 0,
      quiz: {},        // { 'slang:dope': {ok:2, ng:1} }
      readEras: [],    // 読み終えた時代の id
      clearedEras: [], // バトルに勝ってクリアした時代の id（ツアーの進行はこれ）
      grammarRead: [], // 読み終えた文法項目の id
      parseRead: [],   // 構造解説を開いた英文
      answered: 0,
      correct: 0,
      streak: 0,
      lastDay: '',
      days: [],
    };
  },

  save() { try { localStorage.setItem(KEY, JSON.stringify(this.d)); } catch (e) {} },

  reset() { this.d = this.blank(); this.save(); },

  /* ---- バックアップ ----
     端末のデータ消去やiOSの自動削除に備えて、記録を文字列で持ち出せるようにする。
     PCとスマホの記録は別々に貯まるので、寄せたいときにも使う。 */
  exportText() {
    return JSON.stringify({ app: 'bars-and-words', v: 1, saved: ymd(new Date()), data: this.d });
  },

  importText(text) {
    let o;
    try { o = JSON.parse(text); }
    catch (e) { return { ok: false, msg: '読み取れませんでした。文字列が途中で切れていないか確認してください。' }; }

    const d = (o && o.app === 'bars-and-words') ? o.data : o;
    if (!d || typeof d !== 'object' || typeof d.xp !== 'number' || !d.quiz) {
      return { ok: false, msg: 'このアプリの記録ではないようです。' };
    }

    /* 足りない項目は初期値で埋める（古い版の書き出しでも読める） */
    const b = this.blank();
    for (const k in b) if (!(k in d)) d[k] = b[k];

    this.d = d;
    this.save();
    return {
      ok: true,
      msg: `復元しました。XP ${d.xp} ／ ツアー ${d.clearedEras.length}/${ERAS.length} クリア`,
    };
  },

  touchToday() {
    const t = ymd(new Date());
    if (this.d.lastDay === t) return;
    const y = ymd(new Date(Date.now() - 86400000));
    this.d.streak = (this.d.lastDay === y) ? this.d.streak + 1 : 1;
    this.d.lastDay = t;
    if (!this.d.days.includes(t)) this.d.days.push(t);
    this.save();
  },

  record(key, ok) {
    const r = this.d.quiz[key] || (this.d.quiz[key] = { ok: 0, ng: 0 });
    ok ? r.ok++ : r.ng++;
    this.d.answered++;
    if (ok) { this.d.correct++; this.d.xp += 10; }
    this.save();
  },

  addXp(n) { this.d.xp += n; this.save(); },
};

function ymd(dt) {
  const p = n => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

/* -----------------------------------------------------------
   2. ランク
   ----------------------------------------------------------- */
const RANKS = [
  { at: 0,    name: 'Rookie',        ja: '入門' },
  { at: 100,  name: 'Crate Digger',  ja: 'レコード漁り' },
  { at: 300,  name: 'Selector',      ja: '選盤者' },
  { at: 600,  name: 'Head',          ja: '通' },
  { at: 1000, name: 'Scholar',       ja: '研究者' },
  { at: 1800, name: 'OG',            ja: '古参' },
  { at: 3000, name: 'GOAT',          ja: '史上最高' },
];

const Rank = {
  now() {
    const xp = Store.d.xp;
    let cur = RANKS[0], next = null;
    for (let i = 0; i < RANKS.length; i++) {
      if (xp >= RANKS[i].at) { cur = RANKS[i]; next = RANKS[i + 1] || null; }
    }
    const span = next ? next.at - cur.at : 1;
    const got  = next ? xp - cur.at : 1;
    return { cur, next, pct: Math.min(100, got / span * 100), xp };
  },
};

/* -----------------------------------------------------------
   3. 読み上げ
   ----------------------------------------------------------- */
const VOICE_KEY = 'bars-words-voice';

const Speech = {
  voice: null,
  ready: false,
  rate: 0.9,          /* 標準の速さ。設定で変えられる */
  list: [],           /* 端末で使える英語の声 */
  pinned: null,       /* ペーさんが選んだ声の名前 */
  _chainId: 0,

  /* 声の品質を推定する。iOS/macOS は名前に (Enhanced)/(Premium) が付く */
  quality(v) {
    const n = v.name || '';
    if (/premium/i.test(n))   return { rank: 3, label: '最高品質' };
    if (/enhanced/i.test(n))  return { rank: 3, label: '高品質' };
    if (/neural|natural/i.test(n)) return { rank: 3, label: '高品質' };
    if (/compact/i.test(n))   return { rank: 1, label: '軽量（粗い）' };
    if (!v.localService)      return { rank: 2, label: 'オンライン' };
    return { rank: 2, label: '標準' };
  },

  refreshList() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices() || [];
    this.list = vs
      .filter(v => v.lang && v.lang.toLowerCase().startsWith('en'))
      .map(v => ({ v, q: this.quality(v) }))
      /* 品質の高い順 → 米英を優先 → 名前順 */
      .sort((a, b) =>
        b.q.rank - a.q.rank ||
        (/(en[-_]US|en[-_]GB)/i.test(b.v.lang) ? 1 : 0) - (/(en[-_]US|en[-_]GB)/i.test(a.v.lang) ? 1 : 0) ||
        a.v.name.localeCompare(b.v.name));
  },

  init() {
    if (!('speechSynthesis' in window)) return;

    /* 保存された設定を読む */
    try {
      const o = JSON.parse(localStorage.getItem(VOICE_KEY));
      if (o) {
        if (typeof o.rate === 'number') this.rate = o.rate;
        if (o.name) this.pinned = o.name;
      }
    } catch (e) {}

    const pick = () => {
      this.refreshList();
      if (!this.list.length) return;

      /* ペーさんが選んだ声があればそれを使う */
      if (this.pinned) {
        const hit = this.list.find(x => x.v.name === this.pinned);
        if (hit) { this.voice = hit.v; return; }
      }
      /* 未選択なら、いちばん品質の高いものを自動で選ぶ */
      this.voice = this.list[0].v;
    };
    pick();
    speechSynthesis.onvoiceschanged = pick;

    this._pick = pick;

    const unlock = () => {
      if (this.ready) return;
      try {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        speechSynthesis.speak(u);
        this.ready = true;
      } catch (e) {}
    };
    document.addEventListener('touchend', unlock);
    document.addEventListener('click', unlock);
  },

  /* rate は「この場面での相対的な速さ」。設定した基準速度に掛ける */
  say(text, rate = 0.9, onend) {
    const state = (value, error = '') => document.dispatchEvent(new CustomEvent('speech-state', { detail: { state: value, error } }));
    if (!('speechSynthesis' in window)) { state('error', 'このブラウザは読み上げに対応していません'); if (onend) onend(); return; }
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = (this.voice && this.voice.lang) || 'en-US';
      u.rate = Math.max(0.4, Math.min(1.6, (rate / 0.9) * this.rate));
      if (this.voice) u.voice = this.voice;

      /* 読み上げ中はBGMを絞る。
         ※ Beat は const 宣言なので window に載らない。typeof で見ること */
      const hasBeat = typeof Beat !== 'undefined';
      if (hasBeat) Beat.duck(true);
      const release = () => { if (hasBeat) Beat.duck(false); };
      u.onstart = () => state('playing');
      u.onend = () => { release(); state('ready'); if (onend) onend(); };
      u.onerror = e => { release(); state('error', e.error === 'canceled' ? '' : '音声を再生できませんでした'); if (onend) onend(); };

      speechSynthesis.speak(u);
    } catch (e) { state('error', '音声を再生できませんでした'); if (typeof Beat !== 'undefined') Beat.duck(false); if (onend) onend(); }
  },

  /* 複数の文を続けて読む */
  chain(list, rate, done) {
    const chainId = ++this._chainId;
    let i = 0;
    const next = () => {
      if (chainId !== this._chainId) return;
      if (i >= list.length) { if (done) done(); return; }
      this.say(list[i++], rate, next);
    };
    next();
  },

  stop() {
    this._chainId++;
    try { speechSynthesis.cancel(); } catch (e) {}
    if (typeof Beat !== 'undefined') Beat.duck(false);
  },

  /* 声と速さを保存する */
  save() {
    try {
      localStorage.setItem(VOICE_KEY, JSON.stringify({
        name: this.pinned, rate: this.rate,
      }));
    } catch (e) {}
  },

  setVoice(name) {
    this.pinned = name || null;
    if (this._pick) this._pick();
    this.save();
  },

  setRate(r) {
    this.rate = Math.max(0.5, Math.min(1.3, r));
    this.save();
  },
};

/* 音声ボタンの共通処理（押した瞬間に光らせる） */
function sayFrom(btn, text, rate) {
  Speech.say(text, rate);
  btn.classList.add('playing');
  setTimeout(() => btn.classList.remove('playing'), 1200);
}

/* -----------------------------------------------------------
   4. 画面切り替え
   ----------------------------------------------------------- */
const Nav = {
  go(id) {
    Speech.stop();
    $$('.screen').forEach(s => s.classList.remove('active'));
    const el = $('#screen-' + id);
    if (!el) return;
    el.classList.add('active');
    el.scrollTop = 0;
    ({
      home:      () => Home.render(),
      history:   () => History.render(),
      slang:     () => Slang.render(),
      reduction: () => Reduction.render(),
      talk:      () => Talk.render(),
      stats:     () => Stats.render(),
      voice:     () => VoiceSet.render(),
      path:      () => Path.render(),
      grammar:   () => Grammar.renderList(),
    }[id] || (() => {}))();
  },
  soon(t, p) { $('#soon-h1').textContent = t; $('#soon-p').innerHTML = p; this.go('soon'); },
};

/* -----------------------------------------------------------
   5. 便利関数
   ----------------------------------------------------------- */
const shuffle = a => {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};
const sample = (a, n) => shuffle(a).slice(0, n);

/* 段落の中から、構造解説を持つ文を拾う。
   history.js は1要素に複数の文が入るため、キーの完全一致では引けない。
   長い文を先に返すことで、部分文字列がぶつかっても正しい方を選べる。 */
function parseTargets(paragraph) {
  if (typeof PARSE === 'undefined') return [];
  return Object.keys(PARSE)
    .filter(k => paragraph.includes(k))
    .sort((a, b) => paragraph.indexOf(a) - paragraph.indexOf(b));
}

/* 外部サービスの検索リンク */
const links = {
  spotify: q => 'https://open.spotify.com/search/' + encodeURIComponent(q),
  youtube: q => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q),
  genius:  q => 'https://genius.com/search?q=' + encodeURIComponent(q),
};

/* -----------------------------------------------------------
   5.5 ツアー進行（時代の解放状態）
   最初の時代だけ開いていて、バトルに勝つと次が開く
   ----------------------------------------------------------- */
const Tour = {
  cleared(id) { return Store.d.clearedEras.includes(id); },

  /* その時代が挑戦可能か（前の時代をクリア済みか） */
  unlocked(idx) {
    if (idx === 0) return true;
    return this.cleared(ERAS[idx - 1].id);
  },

  /* いま挑戦中の時代（最初の未クリア） */
  currentIdx() {
    const i = ERAS.findIndex(e => !this.cleared(e.id));
    return i < 0 ? ERAS.length - 1 : i;
  },

  /* MC の衣装 = 最後にクリアした時代（未クリアなら初期衣装） */
  outfit() {
    for (let i = ERAS.length - 1; i >= 0; i--) {
      if (this.cleared(ERAS[i].id)) return ERAS[i].id;
    }
    return 'base';
  },
};

/* -----------------------------------------------------------
   6. ホーム
   ----------------------------------------------------------- */
const Home = {
  render() {
    const r = Rank.now();
    const d = Store.d;
    $('#rank-badge').textContent = r.cur.name;
    $('#rank-fill').style.width = r.pct + '%';
    $('#rank-xp').textContent = r.next
      ? `${d.xp} / ${r.next.at} XP`
      : `${d.xp} XP`;

    $('#hs-streak').textContent  = d.streak;
    $('#hs-learned').textContent = Object.keys(d.quiz).length + d.readEras.length;
    $('#hs-rate').textContent    = d.answered ? Math.round(d.correct / d.answered * 100) + '%' : '—';

    const preview = $('#topic-preview');
    if (preview && typeof topicForToday === 'function') {
      const topic = topicForToday();
      preview.innerHTML = `<span>${topic.emoji} 今日のジャンル</span><b>${esc(topic.cat)} · ${esc(topic.titleJa)}</b>`;
    }

    /* MC Fresh のステージ */
    const stage = $('#mc-home');
    if (stage) {
      const n = Store.d.clearedEras.length;
      const cur = ERAS[Tour.currentIdx()];
      stage.innerHTML = `
        <div class="mc-row">
          <div class="mc-figure" id="mc-home-fig">${mcSvg(Tour.outfit())}</div>
          <div class="mc-side">
            <div class="mc-bubble" id="mc-home-bubble">${esc(mcLine(MC_LINES.home))}</div>
            <div class="mc-name">${MC_NAME}</div>
            <button class="mc-tour-chip" data-go="history">
              🎤 TOUR <b>${n}/${ERAS.length}</b> CLEAR
              <span>${n >= ERAS.length ? '全時代制覇！' : '次: ' + esc(cur.titleJa)}</span>
            </button>
          </div>
        </div>`;
      /* キャラをつつくとセリフが変わる */
      $('#mc-home-fig').onclick = () => {
        $('#mc-home-bubble').textContent = mcLine(MC_LINES.home);
      };
      $('#mc-home .mc-tour-chip').onclick = () => Nav.go('history');
    }
  },
};

/* -----------------------------------------------------------
   7. ヒストリー
   ----------------------------------------------------------- */
const History = {
  render() {
    const curIdx = Tour.currentIdx();
    const n = Store.d.clearedEras.length;

    $('#timeline').innerHTML = `
      <div class="tour-head">
        <div class="mc-figure sm">${mcSvg(Tour.outfit())}</div>
        <div class="mc-bubble">${n >= ERAS.length
          ? 'World Tour 制覇！ あんたが GOAT だ🐐'
          : esc(MC_LINES.era[ERAS[curIdx].id] || mcLine(MC_LINES.home))}</div>
      </div>
      <div class="tour-progress">
        <span>WORLD TOUR</span><b>${n} / ${ERAS.length} CLEAR</b>
      </div>` +
      ERAS.map((e, i) => {
        const cleared = Tour.cleared(e.id);
        const unlocked = Tour.unlocked(i);
        const read = Store.d.readEras.includes(e.id);
        const state = cleared ? 'clear' : (!unlocked ? 'locked' : (i === curIdx ? 'now' : ''));
        const badge = cleared ? '<span class="tl-done">✓ CLEAR</span>'
                    : !unlocked ? '<span class="tl-lock">🔒</span>'
                    : `<span class="tl-now">▶ ${read ? 'バトルに挑む' : 'いまここ'}</span>`;
        return `
      <button class="tl-item ${state}" data-era="${e.id}" data-stage="${i + 1}" style="--c:${e.color}" ${unlocked ? '' : 'disabled'}>
        ${badge}
        <div class="tl-years">STAGE ${i + 1} · ${esc(e.years)}</div>
        <div class="tl-title">${esc(e.title)}</div>
        <div class="tl-ja">${esc(e.titleJa)}</div>
        <div class="tl-place">${esc(e.place)}</div>
      </button>`;
      }).join('');

    $$('#timeline .tl-item:not(.locked)').forEach(b => {
      b.onclick = () => Era.open(b.dataset.era);
    });
  },
};

const Era = {
  cur: null,

  open(id) {
    const idx = ERAS.findIndex(x => x.id === id);
    const e = ERAS[idx];
    if (!e || !Tour.unlocked(idx)) return;
    this.cur = e;
    $('#era-h1').textContent = `STAGE ${idx + 1}`;

    const done = Store.d.readEras.includes(e.id);
    const cleared = Tour.cleared(e.id);

    $('#era-body').innerHTML = `
      <div class="era-head" style="--c:${e.color}">
        <div class="era-years">${esc(e.years)} · ${esc(e.place)}</div>
        <div class="era-title">${esc(e.title)}</div>
        <div class="era-ja">${esc(e.titleJa)}</div>
      </div>

      <div class="tour-head era-mc">
        <div class="mc-figure sm">${mcSvg(Tour.outfit())}</div>
        <div class="mc-bubble">${esc(MC_LINES.era[e.id] || '')}</div>
      </div>

      <div class="era-sents" style="--c:${e.color}">
        ${e.en.map((s, i) => {
          /* history.js は1要素に複数の文が入ることがある。
             段落の中から、解説データを持つ文だけを拾う。 */
          const targets = parseTargets(s);
          return `
          <div class="sent" data-i="${i}">
            <div class="sent-en">${esc(s)}</div>
            <div class="sent-ja">${esc(e.ja[i] || '')}</div>
            ${targets.length ? `<div class="sent-parse-row">${
              targets.map(t => `
                <button class="sent-parse" data-parse-key="${encodeURIComponent(t)}">
                  📖 ${targets.length > 1
                        ? esc(t.split(/\s+/).slice(0, 3).join(' ')) + '…'
                        : '文のしくみを見る'}
                </button>`).join('')
            }</div>` : ''}
            ${i === 0 ? '<div class="sent-hint">タップすると訳が出て、音声が流れます</div>' : ''}
          </div>`;
        }).join('')}
      </div>

      <div class="era-sec" style="--c:${e.color}">
        <h3>Key figures</h3>
        ${e.figures.map(f => `
          <div class="fig">
            <div>
              <div class="fig-name">${esc(f.name)}</div>
              <div class="fig-role">${esc(f.role)}</div>
              <div class="fig-note">${esc(f.note)}</div>
            </div>
          </div>`).join('')}
      </div>

      <div class="era-sec">
        <h3>この時代の言葉</h3>
        ${e.terms.map(t => `
          <div class="term">
            <div class="term-en">${esc(t.en)}</div>
            <div class="term-ja">${esc(t.ja)}</div>
            <button class="term-say" data-say="${encodeURIComponent(t.en)}">🔊</button>
          </div>`).join('')}
      </div>

      <div class="era-sec">
        <h3>聴く（外部サイトが開きます）</h3>
        ${e.listen.map(l => {
          const q = `${l.artist} ${l.track}`;
          return `
          <div class="listen-item">
            <div class="listen-main">
              <div class="listen-track">${esc(l.track)} <span style="color:var(--text-3);font-size:12px">(${l.year})</span></div>
              <div class="listen-artist">${esc(l.artist)}</div>
              <div class="listen-why">${esc(l.why)}</div>
            </div>
            <div class="listen-links">
              <a class="ext" href="${links.spotify(q)}" target="_blank" rel="noopener">SPO</a>
              <a class="ext" href="${links.youtube(q)}" target="_blank" rel="noopener">YT</a>
              <a class="ext" href="${links.genius(q)}"  target="_blank" rel="noopener">歌詞</a>
            </div>
          </div>`;
        }).join('')}
      </div>

      <div class="pad center" style="flex-direction:column;gap:10px">
        ${!done ? `
          <button class="btn-primary" id="era-done" style="width:100%">読み終えた（+30 XP）</button>
          <div class="battle-hint">読み終えると ⚔️ エラバトルに挑戦できます</div>`
        : `
          <button class="${cleared ? 'btn-ghost' : 'btn-primary'} battle-btn" id="era-battle" style="width:100%">
            ⚔️ ${cleared ? 'バトル再挑戦（クリア済み）' : 'エラバトルに挑む'}
          </button>
          <div class="battle-hint">${cleared ? 'もう一度勝つと +20 XP' : '5問中4問正解でクリア。次の時代と新しい衣装が解放！'}</div>`}
      </div>`;

    /* 文をタップ → 訳を出して読み上げ */
    $$('#era-body .sent').forEach(el => {
      el.onclick = () => {
        el.classList.toggle('on');
        if (el.classList.contains('on')) Speech.say(e.en[+el.dataset.i]);
      };
    });

    /* 「文のしくみを見る」→ 構造解説を開く */
    $$('#era-body .sent-parse').forEach(b => {
      b.onclick = ev => {
        ev.stopPropagation();
        Parse.open(decodeURIComponent(b.dataset.parseKey));
      };
    });

    $$('#era-body .term-say').forEach(b => {
      b.onclick = ev => { ev.stopPropagation(); sayFrom(b, decodeURIComponent(b.dataset.say)); };
    });

    const doneBtn = $('#era-done');
    if (doneBtn) doneBtn.onclick = () => {
      if (!Store.d.readEras.includes(e.id)) {
        Store.d.readEras.push(e.id);
        Store.addXp(30);
        Store.touchToday();
      }
      this.open(e.id);   // 読了後の画面（バトルボタン表示）に切り替え
    };

    const battleBtn = $('#era-battle');
    if (battleBtn) battleBtn.onclick = () => Quiz.startBoss(e.id);

    /* その時代のビートに切り替える */
    if (typeof Beat !== 'undefined' && Bgm.follow) Beat.setEraBeat(e.id);

    Nav.go('era');
  },

  playAll() {
    if (!this.cur) return;
    Speech.chain(this.cur.en, 0.9);
  },
};

/* -----------------------------------------------------------
   8. スラング
   ----------------------------------------------------------- */
const Slang = {
  cat: 'all',

  render() {
    const cats = Object.keys(SLANG_CATS);
    $('#slang-tabs').innerHTML =
      `<button class="tab ${this.cat === 'all' ? 'on' : ''}" data-c="all">すべて</button>` +
      cats.map(c => `<button class="tab ${this.cat === c ? 'on' : ''}" data-c="${c}">${SLANG_CATS[c].emoji} ${SLANG_CATS[c].ja}</button>`).join('');

    $$('#slang-tabs .tab').forEach(b => {
      b.onclick = () => { this.cat = b.dataset.c; this.render(); };
    });

    const list = this.cat === 'all' ? SLANG : SLANG.filter(s => s.cat === this.cat);
    $('#slang-cards').innerHTML = list.map(s => `
      <div class="card">
        <div class="card-top">
          <div>
            <div class="card-en">${esc(s.en)}</div>
            <div class="card-ja">${esc(s.ja)}</div>
          </div>
          <button class="card-say" data-say="${encodeURIComponent(s.en)}">🔊</button>
        </div>
        <div class="card-ex">
          <div class="card-ex-en">${esc(s.ex)}</div>
          <div class="card-ex-ja">${esc(s.exJa)}</div>
          <button class="card-say" style="width:34px;height:34px;font-size:13px;margin-top:10px"
                  data-say="${encodeURIComponent(s.ex)}">🔊</button>
        </div>
        ${s.note ? `<div class="card-note">${esc(s.note)}</div>` : ''}
        <div class="card-meta">
          <span class="pill lv${s.level}">${['', 'まず覚える', '次に覚える', '知っていれば'][s.level]}</span>
          <span class="pill">${esc(s.era)}</span>
          <span class="pill">${SLANG_CATS[s.cat].ja}</span>
        </div>
      </div>`).join('');

    bindSayButtons('#slang-cards');
  },
};

/* -----------------------------------------------------------
   9. 発音・縮約
   ----------------------------------------------------------- */
const Reduction = {
  render() {
    $('#reduction-cards').innerHTML = REDUCTIONS.map(r => `
      <div class="card">
        <div class="card-top">
          <div style="flex:1">
            <div class="red-row">
              <span class="red-full">${esc(r.full)}</span>
              <span class="red-arrow">→</span>
              <span class="red-spoken">${esc(r.spoken)}</span>
            </div>
            <div class="red-ja">${esc(r.ja)}</div>
          </div>
          <button class="card-say" data-say="${encodeURIComponent(r.ex)}">🔊</button>
        </div>
        <div class="card-ex">
          <div class="card-ex-en">${esc(r.ex)}</div>
          <div class="card-ex-ja">${esc(r.exJa)}</div>
        </div>
        ${r.tip ? `<div class="tip">${esc(r.tip)}</div>` : ''}
        <div class="card-meta">
          <span class="pill lv${r.level}">${['', 'まず覚える', '次に覚える', '知っていれば'][r.level]}</span>
        </div>
      </div>`).join('');

    $('#linking-cards').innerHTML = LINKING.map(l => `
      <div class="card">
        <div class="card-top">
          <div style="flex:1">
            <div class="red-row">
              <span class="red-full" style="text-decoration:none;color:var(--text);font-size:17px;font-weight:600">${esc(l.pattern)}</span>
              <span class="red-arrow">→</span>
              <span class="red-spoken" style="font-size:17px">${esc(l.sounds)}</span>
            </div>
            <div class="red-ja">${esc(l.ja)}</div>
          </div>
          <button class="card-say" data-say="${encodeURIComponent(l.pattern)}">🔊</button>
        </div>
      </div>`).join('');

    bindSayButtons('#reduction-cards');
    bindSayButtons('#linking-cards');
  },
};

/* -----------------------------------------------------------
   10. 音楽を語る
   ----------------------------------------------------------- */
const Talk = {
  scene: 'all',

  render() {
    const scenes = Object.keys(TALK_SCENES);
    $('#talk-tabs').innerHTML =
      `<button class="tab ${this.scene === 'all' ? 'on' : ''}" data-s="all">すべて</button>` +
      scenes.map(s => `<button class="tab ${this.scene === s ? 'on' : ''}" data-s="${s}">${TALK_SCENES[s].emoji} ${TALK_SCENES[s].ja}</button>`).join('');

    $$('#talk-tabs .tab').forEach(b => {
      b.onclick = () => { this.scene = b.dataset.s; this.render(); };
    });

    const list = this.scene === 'all' ? TALK : TALK.filter(t => t.scene === this.scene);
    $('#talk-cards').innerHTML = list.map(t => `
      <div class="card">
        <div class="talk-line">
          <div class="talk-who">A</div>
          <div class="talk-main">
            <div class="talk-en">${esc(t.en)}</div>
            <div class="talk-ja">${esc(t.ja)}</div>
          </div>
          <button class="card-say" data-say="${encodeURIComponent(t.en)}">🔊</button>
        </div>
        <div class="talk-line talk-b">
          <div class="talk-who">B</div>
          <div class="talk-main">
            <div class="talk-en">${esc(t.reply)}</div>
            <div class="talk-ja">${esc(t.replyJa)}</div>
          </div>
          <button class="card-say" data-say="${encodeURIComponent(t.reply)}">🔊</button>
        </div>
        <button class="btn-ghost small" style="width:100%;margin-top:6px"
                data-pair="${encodeURIComponent(t.en + ' ... ' + t.reply)}">会話を通しで聞く</button>
      </div>`).join('');

    bindSayButtons('#talk-cards');
    $$('#talk-cards [data-pair]').forEach(b => {
      b.onclick = () => Speech.say(decodeURIComponent(b.dataset.pair), 0.88);
    });
  },
};

/* 音声ボタンをまとめて有効化 */
function bindSayButtons(sel) {
  $$(sel + ' .card-say').forEach(b => {
    b.onclick = ev => { ev.stopPropagation(); sayFrom(b, decodeURIComponent(b.dataset.say)); };
  });
}

/* -----------------------------------------------------------
   11. クイズエンジン
   4種類の出題をひとつの形に揃えて流す
   ----------------------------------------------------------- */
const N_QUESTIONS = 10;

const Builder = {
  /* スラング：意味を問う／例文の穴埋め */
  slang() {
    return pickWeighted(SLANG, 'slang', s => s.en).map(s => {
      const others = sample(SLANG.filter(x => x.en !== s.en), 3);

      /* 穴埋めは「例文の中に見出し語が実際に出ている」ときだけ成立する。
         grow → grew のように形が変わる語は空所を作れないので意味問題に回す。 */
      const blanked = makeBlank(s);
      if (blanked && Math.random() < 0.45) {
        return q({
          kind: 'スラング · 穴埋め',
          text: blanked, small: true,
          sub: s.exJa,
          choices: shuffleWith(s, others, x => bare(x.en)),
          right: bare(s.en),
          note: `<b>${esc(s.en)}</b> — ${esc(s.ja)}<br>${esc(s.note || '')}`,
          say: s.ex,
          key: 'slang:' + s.en,
          rvEn: s.en, rvJa: s.ja,
        });
      }
      return q({
        kind: 'スラング',
        text: `"${s.en}" ってどういう意味？`,
        choices: shuffleWith(s, others, x => x.ja),
        right: s.ja,
        note: `${esc(s.ex)}<br><span style="color:var(--text-3)">${esc(s.exJa)}</span><br><br>${esc(s.note || '')}`,
        say: s.ex,
        key: 'slang:' + s.en,
        rvEn: s.en, rvJa: s.ja,
      });
    });
  },

  /* 発音：縮約の元の形を問う／音を聞いて選ぶ */
  reduction() {
    return pickWeighted(REDUCTIONS, 'red', r => r.spoken).map(r => {
      const others = sample(REDUCTIONS.filter(x => x.spoken !== r.spoken), 3);
      const byEar = Math.random() < 0.5;

      if (byEar) {
        return q({
          kind: '発音 · 聞き取り',
          text: '聞こえた文はどれ？', small: true,
          sub: '再生ボタンを押してください',
          choices: shuffleWith(r, others, x => x.ex),
          right: r.ex,
          note: `<b>${esc(r.full)} → ${esc(r.spoken)}</b><br>${esc(r.exJa)}<br><br>${esc(r.tip || '')}`,
          say: r.ex, autoSay: true,
          key: 'red:' + r.spoken,
          rvEn: r.spoken, rvJa: r.ja,
        });
      }
      return q({
        kind: '発音 · 縮約',
        text: `"${r.spoken}" は何の短縮形？`,
        choices: shuffleWith(r, others, x => x.full),
        right: r.full,
        note: `${esc(r.ex)}<br><span style="color:var(--text-3)">${esc(r.exJa)}</span><br><br>${esc(r.tip || '')}`,
        say: r.ex,
        key: 'red:' + r.spoken,
        rvEn: r.spoken, rvJa: r.ja,
      });
    });
  },

  /* 会話：日本語 → 英語のフレーズを選ぶ */
  talk() {
    return pickWeighted(TALK, 'talk', t => t.en).map(t => {
      const others = sample(TALK.filter(x => x.en !== t.en), 3);
      return q({
        kind: '会話 · ' + TALK_SCENES[t.scene].ja,
        text: t.ja, small: true,
        sub: '英語でどう言う？',
        choices: shuffleWith(t, others, x => x.en),
        right: t.en,
        note: `返し例: ${esc(t.reply)}<br><span style="color:var(--text-3)">${esc(t.replyJa)}</span>`,
        say: t.en,
        key: 'talk:' + t.en,
        rvEn: t.en, rvJa: t.ja,
      });
    });
  },

  /* ビート：実際に鳴らして聴き分ける／作り手や特徴を問う */
  beat() {
    const keys = Object.keys(BEATS).filter(k => BEATS[k].about);
    const list = [];

    keys.forEach(k => {
      const b = BEATS[k], a = b.about;
      const others = sample(keys.filter(x => x !== k), 3).map(x => BEATS[x]);

      /* ① 鳴らして当てる */
      list.push(q({
        kind: 'ビート · 聴き分け',
        text: 'いま鳴っているのはどのビート？', small: true,
        sub: a.ear,
        choices: shuffleWith(b, others, x => x.name),
        right: b.name,
        note: `<b>${esc(b.name)}</b>（${esc(b.era)}）<br>${esc(a.ja)}`,
        playBeat: k,
        key: 'beat:' + k,
        rvEn: b.name, rvJa: b.era,
      }));

      /* ② 誰が作った音か */
      const otherMakers = keys.filter(x => x !== k)
        .flatMap(x => BEATS[x].about.makers).filter(m => !a.makers.includes(m));
      list.push(q({
        kind: 'ビート · 作り手',
        text: `${b.name} を作った側の人は？`, small: true,
        sub: a.era,
        choices: [a.makers[0], ...sample([...new Set(otherMakers)], 3)],
        right: a.makers[0],
        note: `<b>${esc(b.name)}</b> の主な作り手: ${esc(a.makers.join(' / '))}<br><br>${esc(a.ja)}`,
        key: 'beatmaker:' + k,
        rvEn: a.makers[0], rvJa: b.name,
      }));

      /* ③ 音の特徴 */
      const otherEars = keys.filter(x => x !== k).map(x => BEATS[x].about.ear);
      list.push(q({
        kind: 'ビート · 特徴',
        text: `${b.name} の音の特徴は？`, small: true,
        choices: [a.ear, ...sample(otherEars, 3)],
        right: a.ear,
        note: `<b>${esc(b.name)}</b>（${esc(b.era)}）<br>${esc(a.ja)}`,
        playBeat: k,
        key: 'beatear:' + k,
        rvEn: b.name, rvJa: a.ear,
      }));
    });

    return sample(list, Math.min(N_QUESTIONS, list.length));
  },

  /* 知識：英語で出題 */
  knowledge() {
    return pickWeighted(QUIZ, 'kn', x => x.q).map(k => q({
      kind: '知識クイズ',
      text: k.q, small: true,
      sub: '',
      choices: k.choices.slice(),
      right: k.choices[k.answer],
      note: `<b>${esc(k.qJa)}</b><br>${esc(k.note)}`,
      say: k.q,
      key: 'kn:' + k.q.slice(0, 24),
      rvEn: k.choices[k.answer], rvJa: k.qJa,
    }));
  },
};

/* エラバトル：その時代の知識クイズ・用語・人物から5問を出す */
function buildBoss(era) {
  const pool = [];

  /* 知識クイズのうち、この時代のもの */
  QUIZ.filter(k => k.era === era.id).forEach(k => pool.push(q({
    kind: 'エラバトル · 知識',
    text: k.q, small: true,
    choices: k.choices.slice(),
    right: k.choices[k.answer],
    note: `<b>${esc(k.qJa)}</b><br>${esc(k.note)}`,
    say: k.q,
    key: 'kn:' + k.q.slice(0, 24),
    rvEn: k.choices[k.answer], rvJa: k.qJa,
  })));

  /* この時代の用語（間違い選択肢は他の時代の用語から） */
  const otherTerms = ERAS.filter(x => x.id !== era.id).flatMap(x => x.terms);
  era.terms.forEach(t => pool.push(q({
    kind: 'エラバトル · 用語',
    text: `"${t.en}" の意味は？`,
    choices: shuffleWith(t, sample(otherTerms.filter(o => o.ja !== t.ja), 3), x => x.ja),
    right: t.ja,
    note: `<b>${esc(t.en)}</b> — ${esc(t.ja)}`,
    say: t.en,
    key: 'boss-term:' + t.en,
    rvEn: t.en, rvJa: t.ja,
  })));

  /* この時代の人物（間違い選択肢は他の時代の人物から） */
  const otherFigs = ERAS.filter(x => x.id !== era.id).flatMap(x => x.figures);
  era.figures.forEach(f => pool.push(q({
    kind: 'エラバトル · 人物',
    text: `この時代、"${f.role}" と呼べるのは？`, small: true,
    sub: f.note,
    choices: shuffleWith(f, sample(otherFigs, 3), x => x.name),
    right: f.name,
    note: `<b>${esc(f.name)}</b> — ${esc(f.note)}`,
    key: 'boss-fig:' + f.name,
    rvEn: f.name, rvJa: f.role,
  })));

  return sample(pool, 5);
}

/* 問題オブジェクトを作る（選択肢の正解位置を確定させる） */
function q(o) {
  const choices = shuffle(o.choices);
  return {
    kind: o.kind, text: o.text, small: !!o.small, sub: o.sub || '',
    choices, answer: choices.indexOf(o.right),
    note: o.note || '', say: o.say || '', autoSay: !!o.autoSay,
    playBeat: o.playBeat || null,
    key: o.key, rvEn: o.rvEn, rvJa: o.rvJa,
  };
}

/* 見出し語を素の形にする： "a hater" → "hater"、"to have beef (with)" → "have beef" */
const bare = s => s.replace(/^(a|an|to|the)\s+/i, '').replace(/\s*\([^)]*\)/g, '').trim();
const escapeReg = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const shuffleWith = (right, others, f) => [f(right), ...others.map(f)];

/* 例文から見出し語を抜いて空所にする。抜けなければ null（＝穴埋めにしない） */
function makeBlank(s) {
  const target = bare(s.en).split(' / ')[0];
  if (!target) return null;
  const re = new RegExp('\\b' + escapeReg(target) + '\\b', 'i');
  if (!re.test(s.ex)) return null;
  return s.ex.replace(re, '_____');
}

/* 苦手なものを優先して N 問選ぶ */
function pickWeighted(pool, prefix, keyOf) {
  const score = item => {
    const r = Store.d.quiz[prefix + ':' + keyOf(item)];
    if (!r) return 2;
    return 1 + r.ng * 2 - Math.min(r.ok, 4) * 0.4;
  };
  const sorted = pool.slice().sort((a, b) => score(b) - score(a));
  const weak = sorted.slice(0, Math.min(pool.length, N_QUESTIONS));
  const rest = sorted.slice(N_QUESTIONS);
  const n = Math.min(N_QUESTIONS, pool.length);
  return shuffle([...sample(weak, Math.ceil(n * 0.7)), ...sample(rest, n)]).slice(0, n);
}

/* -----------------------------------------------------------
   12. クイズ進行
   ----------------------------------------------------------- */
const Quiz = {
  type: null, list: [], i: 0, correct: 0, missed: [], locked: false, bossEra: null,

  start(type) {
    const built = Builder[type];
    if (!built) return;
    this.type = type;
    this.bossEra = null;
    /* 聴き分けクイズは音を鳴らす。元々BGMを止めていたなら、終わったら止め直す */
    if (typeof Beat !== 'undefined') {
      this._beatWasPlaying = Beat.playing;
      this._beatWasKey = Beat.key;
    }
    this.list = built();
    this.i = 0; this.correct = 0; this.missed = []; this.locked = false;
    Store.touchToday();
    $('#q-total').textContent = this.list.length;
    Nav.go('quiz');
    this.show();
  },

  /* エラバトル（時代のボス戦） */
  startBoss(eraId) {
    const era = ERAS.find(x => x.id === eraId);
    if (!era) return;
    this.type = 'boss';
    this.bossEra = eraId;
    this.list = buildBoss(era);
    this.i = 0; this.correct = 0; this.missed = []; this.locked = false;
    Store.touchToday();
    $('#q-total').textContent = this.list.length;
    Nav.go('quiz');
    this.show();
  },

  again() {
    if (this.type === 'boss') this.startBoss(this.bossEra);
    else this.start(this.type);
  },

  show() {
    const it = this.list[this.i];
    this.locked = false;
    $('#q-now').textContent = this.i + 1;
    $('#qbar-fill').style.width = (this.i / this.list.length * 100) + '%';

    $('#quiz-body').innerHTML = `
      <div class="q-kind">${esc(it.kind)}</div>
      <div class="q-text${it.small ? ' small' : ''}">${esc(it.text)}</div>
      ${it.sub ? `<div class="q-sub">${esc(it.sub)}</div>` : ''}
      ${it.say ? `<button class="q-say" id="q-say">🔊 <span>音声を聞く</span></button>` : ''}
      ${it.playBeat ? `<button class="q-say q-beat" id="q-beat">🎧 <span>ビートを鳴らす</span></button>` : ''}
      <div class="q-choices">
        ${it.choices.map((c, n) => `<button class="q-choice" data-n="${n}">${esc(c)}</button>`).join('')}
      </div>`;

    if (it.say) {
      const b = $('#q-say');
      b.onclick = () => sayFrom(b, it.say, 0.88);
      if (it.autoSay) setTimeout(() => Speech.say(it.say, 0.88), 400);
    }

    /* ビート問題：答えを見るまで名前を伏せたまま鳴らす */
    if (it.playBeat && typeof Beat !== 'undefined') {
      const wasFollow = Bgm.follow;
      Bgm.follow = false;
      const play = () => { Beat.switchTo(it.playBeat); if (!Beat.playing) Beat.start(); };
      $('#q-beat').onclick = play;
      setTimeout(play, 300);
      this._restoreFollow = () => { Bgm.follow = wasFollow; };
    }

    $$('#quiz-body .q-choice').forEach(b => {
      b.onclick = () => this.answer(+b.dataset.n);
    });
  },

  answer(n) {
    if (this.locked) return;
    this.locked = true;
    const it = this.list[this.i];
    const ok = n === it.answer;

    Store.record(it.key, ok);
    if (ok) this.correct++;
    else this.missed.push(it);

    $$('#quiz-body .q-choice').forEach((b, idx) => {
      b.disabled = true;
      if (idx === it.answer) b.classList.add('ok');
      else if (idx === n)    b.classList.add('ng');
      else                   b.classList.add('dim');
    });

    if (!ok && it.say) Speech.say(it.say, 0.85);

    const note = document.createElement('div');
    note.className = 'q-note';
    note.innerHTML = (ok ? '<b>正解</b><br>' : '<b>不正解</b><br>') + it.note;
    $('#quiz-body').appendChild(note);

    const next = document.createElement('button');
    next.className = 'q-next';
    next.textContent = this.i + 1 >= this.list.length ? '結果を見る' : '次へ';
    next.onclick = () => {
      this.i++;
      if (this.i >= this.list.length) this.finish();
      else this.show();
    };
    $('#quiz-body').appendChild(next);
    next.scrollIntoView({ behavior: 'smooth', block: 'end' });
  },

  finish() {
    Speech.stop();
    this.restoreBeat();
    if (this.type === 'boss') return this.finishBoss();

    const total = this.list.length;
    const bonus = this.correct === total ? 50 : (this.correct >= total * 0.8 ? 20 : 0);
    if (bonus) Store.addXp(bonus);

    $('#r-score').textContent = this.correct;
    $('#r-total').textContent = total;
    $('#r-xp').textContent = `+${this.correct * 10 + bonus} XP` + (bonus ? `（ボーナス +${bonus}）` : '');
    $('#r-title').textContent =
      this.correct === total ? '全問正解' :
      this.correct >= total * 0.8 ? 'よくできています' :
      this.correct >= total * 0.5 ? '半分は取れました' : 'ここが伸びしろです';

    $('#r-review').innerHTML = this.missedHtml();
    this.bindReview();
    Nav.go('result');
  },

  /* エラバトルの決着。5問中4問でクリア */
  finishBoss() {
    const era = ERAS.find(x => x.id === this.bossEra);
    const idx = ERAS.findIndex(x => x.id === this.bossEra);
    const total = this.list.length;
    const pass = this.correct >= total - 1;
    const firstClear = pass && !Tour.cleared(era.id);

    let bonus = 0;
    if (firstClear) {
      Store.d.clearedEras.push(era.id);
      bonus = 80;
      Store.addXp(bonus);
    } else if (pass) {
      bonus = 20;
      Store.addXp(bonus);
    }

    const nextEra = ERAS[idx + 1];

    $('#r-score').textContent = this.correct;
    $('#r-total').textContent = total;
    $('#r-title').textContent = pass ? `STAGE ${idx + 1} CLEAR!` : 'あと一歩！';
    $('#r-xp').textContent = `+${this.correct * 10 + bonus} XP` + (bonus ? `（クリアボーナス +${bonus}）` : '');

    $('#r-review').innerHTML = `
      <div class="tour-head result-mc">
        <div class="mc-figure sm ${firstClear ? 'mc-cheer' : ''}">${mcSvg(Tour.outfit())}</div>
        <div class="mc-bubble">${esc(mcLine(pass ? MC_LINES.win : MC_LINES.lose))}</div>
      </div>
      ${firstClear && nextEra ? `
        <div class="unlock-banner">
          🔓 STAGE ${idx + 2} 解放！ <b>${esc(nextEra.titleJa)}</b>
          ${firstClear ? '<span>🧢 MC Fresh が新しい衣装に着替えた</span>' : ''}
        </div>` : ''}
      ${firstClear && !nextEra ? `
        <div class="unlock-banner">🏆 WORLD TOUR 制覇！ 全時代クリアだ、GOAT🐐</div>` : ''}
      ${this.missedHtml()}`;
    this.bindReview();
    Nav.go('result');
  },

  /* クイズのために鳴らした音を元に戻す（止めていたなら止める） */
  restoreBeat() {
    if (typeof Beat === 'undefined') return;
    if (this._restoreFollow) { this._restoreFollow(); this._restoreFollow = null; }
    if (this._beatWasPlaying === false && Beat.playing) {
      Beat.stop();
      if (typeof Bgm !== 'undefined' && Bgm.paint) Bgm.paint();
    } else if (this._beatWasPlaying && this._beatWasKey) {
      Beat.switchTo(this._beatWasKey);
    }
    this._beatWasPlaying = undefined;
  },

  missedHtml() {
    return this.missed.length ? `
      <h3>間違えた項目</h3>
      ${this.missed.map(m => `
        <div class="r-item">
          <div><b>${esc(m.rvEn)}</b><small>${esc(m.rvJa)}</small></div>
          <button class="r-say" data-say="${encodeURIComponent(m.say || m.rvEn)}">🔊</button>
        </div>`).join('')}` : '';
  },

  bindReview() {
    $$('#r-review .r-say').forEach(b => {
      b.onclick = () => Speech.say(decodeURIComponent(b.dataset.say), 0.85);
    });
  },
};

/* -----------------------------------------------------------
   13. 記録
   ----------------------------------------------------------- */
const Stats = {
  render() {
    const d = Store.d;
    const r = Rank.now();
    const rate = d.answered ? Math.round(d.correct / d.answered * 100) : 0;

    const groups = [
      { p: 'slang', label: 'スラング',   total: SLANG.length },
      { p: 'red',   label: '発音・縮約', total: REDUCTIONS.length },
      { p: 'talk',  label: '会話',       total: TALK.length },
      { p: 'kn',    label: '知識クイズ', total: QUIZ.length },
    ].map(g => {
      const seen = Object.keys(d.quiz).filter(k => k.startsWith(g.p + ':')).length;
      return { ...g, seen, pct: Math.round(seen / g.total * 100) };
    });

    const weak = Object.entries(d.quiz)
      .filter(([, v]) => v.ng > 0)
      .map(([k, v]) => {
        const [p, ...rest] = k.split(':');
        const id = rest.join(':');
        let ja = '';
        if (p === 'slang') ja = (SLANG.find(s => s.en === id) || {}).ja || '';
        if (p === 'red')   ja = (REDUCTIONS.find(s => s.spoken === id) || {}).ja || '';
        if (p === 'talk')  ja = (TALK.find(s => s.en === id) || {}).ja || '';
        if (p === 'kn')    ja = '知識クイズ';
        return { id, ja, ng: v.ng, ok: v.ok };
      })
      .sort((a, b) => (b.ng / (b.ng + b.ok)) - (a.ng / (a.ng + a.ok)) || b.ng - a.ng)
      .slice(0, 10);

    $('#stats-body').innerHTML = `
      <div class="stat-card">
        <h2>いまの状態</h2>
        <div class="stat-row"><span>ランク</span><b>${r.cur.name}<span style="font-size:12px;color:var(--text-3)"> ${r.cur.ja}</span></b></div>
        <div class="stat-row"><span>XP</span><b>${d.xp}</b></div>
        <div class="stat-row"><span>連続日数</span><b>${d.streak}</b></div>
        <div class="stat-row"><span>学習した日</span><b>${d.days.length}</b></div>
        <div class="stat-row"><span>解答数</span><b>${d.answered}</b></div>
        <div class="stat-row"><span>正解率</span><b>${rate}%</b></div>
      </div>

      <div class="stat-card">
        <h2>網羅の進み具合</h2>
        <div class="stat-row" style="padding-bottom:2px"><span>ツアークリア</span><b>${d.clearedEras.length} / ${ERAS.length}</b></div>
        <div class="bar-mini"><i style="width:${d.clearedEras.length / ERAS.length * 100}%"></i></div>
        <div class="stat-row" style="padding-bottom:2px;margin-top:14px"><span>ヒストリー読了</span><b>${d.readEras.length} / ${ERAS.length}</b></div>
        <div class="bar-mini"><i style="width:${d.readEras.length / ERAS.length * 100}%"></i></div>
        ${groups.map(g => `
          <div class="stat-row" style="padding-bottom:2px;margin-top:14px"><span>${g.label}</span><b>${g.seen} / ${g.total}</b></div>
          <div class="bar-mini"><i style="width:${g.pct}%"></i></div>`).join('')}
      </div>

      <div class="stat-card">
        <h2>取りこぼしている項目</h2>
        ${weak.length ? weak.map(w => `
          <div class="weak">
            <b>${esc(w.id)}</b>
            <span>${esc(w.ja)}</span>
            <em>${w.ng}回ミス</em>
          </div>`).join('')
        : '<p style="color:var(--text-3);font-size:13px;margin:0">まだありません。</p>'}
      </div>`;
  },
};

/* -----------------------------------------------------------
   13.1 学習の道すじ（黒坂式の順序を画面にしたもの）
   「文法・精読ができて初めて多読が効く」という順番に沿って並べる
   ----------------------------------------------------------- */
const Path = {
  render() {
    const d = Store.d;
    const gDone = (d.grammarRead || []).length;
    const gTotal = GRAMMAR.length;
    const parsedTotal = Object.keys(typeof PARSE !== 'undefined' ? PARSE : {}).length;
    const parsedRead = (d.parseRead || []).length;
    const readEras = d.readEras.length;

    const steps = [
      {
        n: 1, key: 'grammar', ico: '📐',
        title: '文法の土台', en: 'Grammar',
        body: 'まず英語の骨組みを入れます。語順・be動詞・後ろから説明する形。<b>ここを飛ばすと、あとの多読が効きません。</b>',
        now: gDone, max: gTotal, unit: '項目',
        go: () => { Nav.go('grammar'); },
        cta: gDone ? '続ける' : 'はじめる',
      },
      {
        n: 2, key: 'parse', ico: '📖',
        title: '精読', en: 'Close Reading',
        body: '1文ずつ、かたまりに割って構造を見ます。文法で覚えた形が<b>実際の文でどう出るか</b>を確かめる段階。',
        now: parsedRead, max: parsedTotal, unit: '文',
        go: () => { Nav.go('history'); },
        cta: 'ツアーの英文を開く',
        note: parsedTotal < 20 ? `※ いま解説があるのは ${parsedTotal}文（試作）。方向が良ければ全文に広げます` : '',
      },
      {
        n: 3, key: 'read', ico: '📻',
        title: '多読', en: 'Extensive Reading',
        body: '構造が見えたら、量を読みます。<b>辞書を引きすぎず、8割分かればそのまま進む。</b>10の時代を読み切るのが目標。',
        now: readEras, max: ERAS.length, unit: '時代',
        go: () => { Nav.go('history'); },
        cta: 'ワールドツアーへ',
      },
      {
        n: 4, key: 'speak', ico: '🚃',
        title: '音読・シャドーイング', en: 'Speaking',
        body: '読めた文を<b>口に出して定着させます</b>。通勤モードが自動で流してくれるので、電車の中はこれだけでよいです。',
        now: d.commuteSessions || 0, max: null, unit: '回',
        go: () => { Nav.go('commute'); if (typeof Commute !== 'undefined') Commute.renderSetup(false); },
        cta: '通勤モードへ',
      },
    ];

    /* いま取り組むべき段階（前の段階が半分未満なら、そこを勧める） */
    let focus = steps.length - 1;
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (s.max && s.now < s.max * 0.5) { focus = i; break; }
    }

    $('#path-body').innerHTML = `
      <div class="tour-head" style="padding:20px 20px 0">
        <div class="mc-figure sm">${mcSvg(Tour.outfit())}</div>
        <div class="mc-bubble">${esc(
          focus === 0 ? '焦らず文法からだ。ここが入ると後が全部楽になる'
          : focus === 1 ? '文法はいい線まで来た。次は実際の文をバラして見てみな'
          : focus === 2 ? '構造が見えてきたな。あとは量を読むだけだ'
          : '仕上げは口だ。声に出さないと自分の言葉にならないぜ')}</div>
      </div>

      <p class="lead">この順番でやるのが<b>いちばん速い</b>です。文法と精読を飛ばして多読だけしても、
        文の構造が見えないので読めた気になるだけで終わります。</p>

      <div class="path-list">
        ${steps.map((s, i) => `
          <div class="pstep ${i === focus ? 'now' : ''} ${s.max && s.now >= s.max ? 'done' : ''}">
            <div class="ps-head">
              <span class="ps-n">STEP ${s.n}</span>
              <span class="ps-ico">${s.ico}</span>
              <span class="ps-title"><b>${esc(s.title)}</b><small>${esc(s.en)}</small></span>
              ${i === focus ? '<span class="ps-now">いまここ</span>' : ''}
            </div>
            <p class="ps-body">${s.body}</p>
            ${s.max ? `
              <div class="ps-bar"><i style="width:${Math.min(100, s.now / s.max * 100)}%"></i></div>
              <div class="ps-count">${s.now} / ${s.max} ${s.unit}</div>`
            : `<div class="ps-count">これまで ${s.now} ${s.unit}</div>`}
            ${s.note ? `<div class="ps-note">${esc(s.note)}</div>` : ''}
            <button class="${i === focus ? 'btn-primary' : 'btn-ghost'} ps-go" data-step="${i}">${esc(s.cta)}</button>
          </div>`).join('')}
      </div>
      <div class="pad"></div>`;

    $$('#path-body .ps-go').forEach(b => {
      b.onclick = () => steps[+b.dataset.step].go();
    });
  },
};

/* -----------------------------------------------------------
   13.2 文法講座
   ----------------------------------------------------------- */
const Grammar = {
  renderList() {
    const done = Store.d.grammarRead || [];

    $('#grammar-body').innerHTML = `
      <p class="lead">上から順にやるのが<b>いちばん速い</b>です。1項目5分ほど。
        例文はすべて<b>このアプリの中に出てくる英文</b>から取ってあります。</p>

      ${GRAMMAR_STEPS.map(st => `
        <h2 class="g-step">STEP ${st.n} · ${esc(st.title)}<small>${esc(st.sub)}</small></h2>
        <div class="g-list">
          ${GRAMMAR.filter(g => g.step === st.n).map(g => `
            <button class="gitem ${done.includes(g.id) ? 'done' : ''}" data-g="${g.id}">
              <span class="gi-txt">
                <b>${esc(g.titleJa)}</b>
                <small>${esc(g.title)}</small>
              </span>
              ${done.includes(g.id) ? '<span class="gi-chk">✓</span>' : '<span class="gi-arw">›</span>'}
            </button>`).join('')}
        </div>`).join('')}
      <div class="pad"></div>`;

    $$('#grammar-body .gitem').forEach(b => {
      b.onclick = () => this.open(b.dataset.g);
    });
  },

  open(id) {
    const g = GRAMMAR.find(x => x.id === id);
    if (!g) return;
    const done = (Store.d.grammarRead || []).includes(id);

    $('#gi-h1').textContent = g.titleJa;
    $('#gitem-body').innerHTML = `
      <div class="gi-head">
        <div class="gi-en">${esc(g.title)}</div>
        <div class="gi-ja">${esc(g.titleJa)}</div>
      </div>

      <h2 class="p-h">なぜ要るのか</h2>
      <div class="p-point">${g.why}</div>

      <h2 class="p-h">要点</h2>
      <ul class="gi-rules">
        ${g.rules.map(r => `<li>${r}</li>`).join('')}
      </ul>

      <h2 class="p-h">実際の文で見る</h2>
      <div class="gi-exs">
        ${g.ex.map(e => `
          <div class="gi-ex">
            <div class="gie-en">${esc(e.en)}</div>
            <div class="gie-ja">${esc(e.ja)}</div>
            ${e.note ? `<div class="gie-note">${esc(e.note)}</div>` : ''}
            <div class="gie-btns">
              <button class="gie-say" data-say="${encodeURIComponent(e.en)}">🔊 聞く</button>
              <button class="gie-say" data-slow="${encodeURIComponent(e.en)}">🐢 ゆっくり</button>
              ${e.sentence && typeof PARSE !== 'undefined' && PARSE[e.sentence]
                ? `<button class="gie-say gie-parse" data-parse="${encodeURIComponent(e.sentence)}">📖 しくみ</button>` : ''}
            </div>
          </div>`).join('')}
      </div>

      ${g.trap && g.trap.length ? `
        <h2 class="p-h">よくある間違い</h2>
        <div class="gi-traps">
          ${g.trap.map(t => `
            <div class="gi-trap">
              <div class="gt-bad">✕ ${esc(t.bad)}</div>
              <div class="gt-good">○ ${esc(t.good)}</div>
              <div class="gt-why">${t.why}</div>
            </div>`).join('')}
        </div>` : ''}

      <div class="pad center" style="flex-direction:column;gap:10px">
        <button class="${done ? 'btn-ghost' : 'btn-primary'}" id="gi-done" style="width:100%">
          ${done ? '✓ 読了済み（もう一度読む）' : '読み終えた（+20 XP）'}
        </button>
        ${this.nextBtn(id)}
      </div>`;

    $$('#gitem-body .gie-say').forEach(b => {
      b.onclick = () => {
        if (b.dataset.say)   Speech.say(decodeURIComponent(b.dataset.say), 0.9);
        if (b.dataset.slow)  Speech.say(decodeURIComponent(b.dataset.slow), 0.6);
        if (b.dataset.parse) Parse.open(decodeURIComponent(b.dataset.parse));
      };
    });

    $('#gi-done').onclick = () => {
      const list = Store.d.grammarRead || (Store.d.grammarRead = []);
      if (!list.includes(id)) {
        list.push(id);
        Store.addXp(20);
        Store.touchToday();
      }
      const nx = this.nextId(id);
      if (nx) this.open(nx);
      else { this.renderList(); Nav.go('grammar'); }
    };

    const nb = $('#gi-next');
    if (nb) nb.onclick = () => this.open(nb.dataset.next);

    Nav.go('gitem');
  },

  nextId(id) {
    const i = GRAMMAR.findIndex(x => x.id === id);
    return (i >= 0 && i + 1 < GRAMMAR.length) ? GRAMMAR[i + 1].id : null;
  },

  nextBtn(id) {
    const nx = this.nextId(id);
    if (!nx) return '<div class="battle-hint">これが最後の項目です。おつかれさまでした</div>';
    const g = GRAMMAR.find(x => x.id === nx);
    return `<button class="btn-ghost" id="gi-next" data-next="${nx}" style="width:100%">次へ: ${esc(g.titleJa)}</button>`;
  },
};

/* -----------------------------------------------------------
   13.3 文のしくみ（構造・文法・言い換え）
   ----------------------------------------------------------- */
const Parse = {
  cur: null,

  open(sentence) {
    const p = typeof PARSE !== 'undefined' ? PARSE[sentence] : null;
    if (!p) return;
    this.cur = sentence;

    /* 精読した文として記録（学習の道すじの進捗になる） */
    const seen = Store.d.parseRead || (Store.d.parseRead = []);
    if (!seen.includes(sentence)) { seen.push(sentence); Store.addXp(5); Store.touchToday(); }

    /* 語のかたまりを色分けして並べる */
    const chunks = p.chunks.map((c, i) => {
      const r = ROLE_INFO[c.role] || ROLE_INFO.M;
      return `
        <button class="pc" data-i="${i}" style="--rc:${r.c}">
          <span class="pc-role">${r.short}</span>
          <span class="pc-en">${esc(c.t)}</span>
          <span class="pc-ja">${esc(c.ja)}</span>
        </button>`;
    }).join('<span class="pc-sep">›</span>');

    /* 使われている役割だけ凡例に出す */
    const used = [...new Set(p.chunks.map(c => c.role))];

    $('#parse-body').innerHTML = `
      <div class="p-sent">
        <div class="p-en">${esc(sentence)}</div>
        <button class="q-say" id="p-say">🔊 <span>聞く</span></button>
        <button class="q-say" id="p-slow" style="border-color:var(--teal)">🐢 <span>ゆっくり</span></button>
      </div>

      <h2 class="p-h">かたまりで捉える</h2>
      <p class="p-lead">英語は<b>語のかたまり（チャンク）</b>で意味が決まります。タップするとその部分だけ聞けます。</p>
      <div class="p-chunks">${chunks}</div>
      <div class="p-legend">
        ${used.map(r => {
          const i = ROLE_INFO[r] || ROLE_INFO.M;
          return `<span class="pl" style="--rc:${i.c}"><b>${i.short}</b>${i.ja}</span>`;
        }).join('')}
      </div>

      <h2 class="p-h">この文のポイント</h2>
      <div class="p-point">${p.point}</div>

      ${p.grammar ? `
        <h2 class="p-h">文法</h2>
        <div class="p-gram">
          <h3>${esc(p.grammar.title)}</h3>
          <p>${p.grammar.body}</p>
        </div>` : ''}

      ${p.alts && p.alts.length ? `
        <h2 class="p-h">別の言い方</h2>
        <div class="p-alts">
          ${p.alts.map((a, i) => `
            <div class="p-alt">
              <div class="pa-en">${esc(a.en)}</div>
              <div class="pa-ja">${esc(a.ja)}</div>
              <button class="pa-say" data-say="${encodeURIComponent(a.en)}">🔊</button>
            </div>`).join('')}
        </div>` : ''}

      <div class="pad"></div>`;

    /* かたまりをタップ → その部分だけ読み上げ */
    $$('#parse-body .pc').forEach(b => {
      b.onclick = () => {
        const c = p.chunks[+b.dataset.i];
        b.classList.add('hit');
        setTimeout(() => b.classList.remove('hit'), 700);
        Speech.say(c.t, 0.72);
      };
    });

    $('#p-say').onclick  = () => Speech.say(sentence, 0.9);
    $('#p-slow').onclick = () => Speech.say(sentence, 0.6);
    $$('#parse-body .pa-say').forEach(b => {
      b.onclick = () => Speech.say(decodeURIComponent(b.dataset.say), 0.85);
    });

    Nav.go('parse');
  },
};

/* -----------------------------------------------------------
   13.4 音声の設定画面
   ----------------------------------------------------------- */
const VoiceSet = {
  render() {
    Speech.refreshList();

    const cur = Speech.voice;
    const curQ = cur ? Speech.quality(cur) : null;
    $('#v-now').innerHTML = cur
      ? `<b>${esc(cur.name)}</b><span class="vq q${curQ.rank}">${curQ.label}</span>
         <small>${esc(cur.lang)}${cur.localService ? '' : ' · オンライン'}</small>`
      : '<span style="color:var(--ng)">この端末では読み上げが使えません</span>';

    $('#v-rate').value = Math.round(Speech.rate * 100);
    $('#v-rate-label').textContent = '×' + Speech.rate.toFixed(2);

    /* 声の一覧。品質の高いものが上に来る */
    $('#v-list').innerHTML = Speech.list.length
      ? Speech.list.map(({ v, q }) => `
        <button class="vitem ${cur && v.name === cur.name ? 'on' : ''}" data-v="${encodeURIComponent(v.name)}">
          <span class="vi-main">
            <b>${esc(v.name)}</b>
            <small>${esc(v.lang)}${v.localService ? '' : ' · オンライン'}</small>
          </span>
          <span class="vq q${q.rank}">${q.label}</span>
        </button>`).join('')
      : '<p class="vhint">英語の声が見つかりませんでした。端末の設定から追加してください。</p>';

    $$('#v-list .vitem').forEach(b => {
      b.onclick = () => {
        const name = decodeURIComponent(b.dataset.v);
        Speech.setVoice(name);
        this.render();
        Speech.say('This beat goes hard. Real talk.', 0.9);
      };
    });

    /* iPhone以外では手順の案内を隠す */
    const isApple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
    $('#v-tip').style.display = isApple ? '' : 'none';
  },

  init() {
    const rate = $('#v-rate');
    if (!rate) return;

    rate.oninput = () => {
      Speech.setRate(rate.value / 100);
      $('#v-rate-label').textContent = '×' + Speech.rate.toFixed(2);
    };
    rate.onchange = () => Speech.say('Who is your favorite MC?', 0.9);

    $('#v-test').onclick = () =>
      Speech.say("Don't sleep on this album. It grew on me.", 0.9);
    $('#v-slow').onclick = () =>
      Speech.say("Don't sleep on this album. It grew on me.", 0.62);
  },
};

/* -----------------------------------------------------------
   13.5 BGM のUI
   ----------------------------------------------------------- */
const Bgm = {
  follow: true,

  /* ビートの解説を組み立てる */
  aboutHtml(b) {
    const a = b.about;
    if (!a) return '';
    return `
      <p class="ba-ja">${esc(a.ja)}</p>
      <div class="ba-sec"><h4>耳で聴き分ける</h4><p>${esc(a.ear)}</p></div>
      <div class="ba-sec"><h4>この音を作った人たち</h4>
        <p>${a.makers.map(m => `<span class="ba-chip">${esc(m)}</span>`).join('')}</p></div>
      <div class="ba-sec"><h4>代表曲</h4>
        ${a.tracks.map(t => `
          <a class="ba-track" href="${links.youtube(t.replace(/ — /g, ' '))}" target="_blank" rel="noopener">
            ▶︎ ${esc(t)}
          </a>`).join('')}</div>
      ${a.term ? `<div class="ba-term"><b>${esc(a.term.en)}</b> — ${esc(a.term.ja)}</div>` : ''}`;
  },

  init() {
    if (typeof Beat === 'undefined') return;
    Beat.load();
    try {
      const o = JSON.parse(localStorage.getItem('bars-words-beat'));
      if (o && typeof o.follow === 'boolean') this.follow = o.follow;
    } catch (e) {}

    const fab   = $('#bgm-fab');
    const panel = $('#bgm-panel');
    const toggle= $('#bgm-toggle');
    const vol   = $('#bgm-vol');
    const follow= $('#bgm-follow');

    /* ビート一覧（タップで切替、ⓘで解説） */
    $('#bgm-list').innerHTML = Object.entries(BEATS).map(([k, b]) => `
      <div class="bgm-row">
        <button class="bgm-item" data-beat="${k}">
          <b>${esc(b.name)}</b>
          <small>${esc(b.era)} · ${b.bpm} BPM</small>
        </button>
        <button class="bgm-info" data-about="${k}" aria-label="解説">ⓘ</button>
      </div>
      <div class="bgm-about" data-about-for="${k}" hidden>${this.aboutHtml(b)}</div>`).join('');

    const paint = () => {
      fab.classList.toggle('on', Beat.playing);
      toggle.textContent = Beat.playing ? '停止' : '再生';
      toggle.classList.toggle('on', Beat.playing);
      vol.value = Math.round(Beat.vol * 100);
      follow.checked = this.follow;
      $$('#bgm-list .bgm-item').forEach(b => {
        b.classList.toggle('on', b.dataset.beat === Beat.key);
      });
    };

    /* ボタンは「タップで即オン/オフ」。設定を出すのは長押し。
       鳴っているのを止めたいときに、1タップで確実に止まるようにするため。 */
    let held = false, holdTimer = null;

    const openPanel = () => { panel.removeAttribute('hidden'); paint(); };
    const closePanel = () => panel.setAttribute('hidden', '');

    const holdStart = () => {
      held = false;
      holdTimer = setTimeout(() => { held = true; openPanel(); }, 450);
    };
    const holdEnd = () => { if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; } };

    fab.addEventListener('pointerdown', holdStart);
    fab.addEventListener('pointerup', holdEnd);
    fab.addEventListener('pointerleave', holdEnd);
    fab.addEventListener('pointercancel', holdEnd);

    fab.onclick = () => {
      if (held) { held = false; return; }      /* 長押しでパネルを開いた直後は無視 */
      if (!panel.hasAttribute('hidden')) { closePanel(); return; }
      Beat.toggle();
      paint();
    };
    fab.oncontextmenu = e => { e.preventDefault(); openPanel(); };

    $('#bgm-close').onclick = closePanel;

    toggle.onclick = () => { Beat.toggle(); paint(); };

    vol.oninput = () => Beat.setVolume(vol.value / 100);

    follow.onchange = () => {
      this.follow = follow.checked;
      Beat.save();
      try {
        const o = JSON.parse(localStorage.getItem('bars-words-beat')) || {};
        o.follow = this.follow;
        localStorage.setItem('bars-words-beat', JSON.stringify(o));
      } catch (e) {}
    };

    $$('#bgm-list .bgm-item').forEach(b => {
      b.onclick = () => {
        Beat.switchTo(b.dataset.beat);
        if (!Beat.playing) Beat.start();
        this.follow = false;
        paint();
        follow.checked = false;
      };
    });

    /* ⓘ で解説を開閉 */
    $$('#bgm-list .bgm-info').forEach(b => {
      b.onclick = () => {
        const box = $(`#bgm-list .bgm-about[data-about-for="${b.dataset.about}"]`);
        if (!box) return;
        const open = box.hasAttribute('hidden');
        $$('#bgm-list .bgm-about').forEach(x => x.setAttribute('hidden', ''));
        if (open) { box.removeAttribute('hidden'); box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
      };
    });

    /* 起動時に勝手に鳴らさない。画面を触った拍子に音が出るのは驚かせるだけなので、
       BGMは必ずペーさんがボタンを押したときだけ鳴らす。 */
    Beat.enabled = false;

    paint();
    this.paint = paint;
  },
};

/* -----------------------------------------------------------
   14. 起動
   ----------------------------------------------------------- */
function boot() {
  Store.load();
  Speech.init();
  VoiceSet.init();
  Bgm.init();
  Home.render();

  $$('[data-go]').forEach(b => {
    b.onclick = () => {
      const t = b.dataset.go;
      if (t === 'toeic') {
        Nav.soon('TOEIC', 'Part 2（応答問題）と Part 5（短文穴埋め）を <b>Phase B</b> で追加します。<br>ヒップホップ教材とは切り離し、スコア対策として作る予定です。');
      } else {
        Nav.go(t);
      }
    };
  });

  $$('[data-quiz]').forEach(b => {
    b.onclick = () => Quiz.start(b.dataset.quiz);
  });

  $('[data-go="knowledge"]').onclick = () => Quiz.start('knowledge');

  $('#path-cta').onclick = () => Nav.go('path');
  $('#era-play').onclick = () => Era.playAll();
  $('#quiz-quit').onclick = () => { Speech.stop(); Quiz.restoreBeat(); Nav.go('home'); };
  $('#r-again').onclick = () => Quiz.again();

  /* ---- 記録の書き出し / 読み込み ---- */
  const box = $('#backup-box');
  const msg = $('#backup-msg');
  const say = (t, ok) => {
    msg.textContent = t;
    msg.className = 'backup-msg ' + (ok ? 'ok' : 'ng');
  };

  $('#btn-export').onclick = async () => {
    const text = Store.exportText();
    box.value = text;
    box.select();
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch (e) {
      try { copied = document.execCommand('copy'); } catch (e2) {}
    }
    say(copied
      ? 'コピーしました。メモアプリなどに貼って保管してください。'
      : '書き出しました。上の枠の文字列を全部コピーして保管してください。', true);
  };

  $('#btn-import').onclick = () => {
    const text = box.value.trim();
    if (!text) return say('先に、保管しておいた文字列を上の枠に貼り付けてください。', false);

    const cur = Store.d;
    const warn = (cur.xp > 0 || cur.answered > 0)
      ? `いまの記録（XP ${cur.xp}／ツアー ${cur.clearedEras.length}/${ERAS.length} クリア）は上書きされます。\n元には戻せません。\n\n読み込んでよろしいですか？`
      : '記録を読み込みます。よろしいですか？';
    if (!confirm(warn)) return;

    const r = Store.importText(text);
    say(r.msg, r.ok);
    if (r.ok) { Home.render(); Stats.render(); }
  };

  $('#btn-reset').onclick = () => {
    const d = Store.d;
    const msg = [
      '次の記録をすべて消します。元には戻せません。',
      '',
      `・XP ${d.xp}（ランク ${Rank.now().cur.name}）`,
      `・解答 ${d.answered} 問の履歴`,
      `・学習した項目 ${Object.keys(d.quiz).length} 件`,
      `・ツアーの進行 ${d.clearedEras.length} / ${ERAS.length} クリア（読了 ${d.readEras.length}）`,
      `・連続 ${d.streak} 日、学習した日 ${d.days.length} 日`,
      '',
      '消してよろしいですか？',
    ].join('\n');
    if (confirm(msg)) {
      Store.reset();
      Home.render();
      Stats.render();
      alert('記録を消しました。');
    }
  };

  Nav.go('home');
}

document.addEventListener('DOMContentLoaded', boot);
