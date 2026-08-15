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
const Speech = {
  voice: null,
  ready: false,

  init() {
    if (!('speechSynthesis' in window)) return;
    const pick = () => {
      const vs = speechSynthesis.getVoices();
      if (!vs.length) return;
      const want = ['Samantha', 'Alex', 'Daniel', 'Karen',
                    'Google US English', 'Microsoft Aria', 'Microsoft Zira'];
      this.voice = vs.find(v => want.includes(v.name))
                || vs.find(v => v.lang === 'en-US')
                || vs.find(v => v.lang && v.lang.startsWith('en'))
                || null;
    };
    pick();
    speechSynthesis.onvoiceschanged = pick;

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

  say(text, rate = 0.9, onend) {
    if (!('speechSynthesis' in window)) { if (onend) onend(); return; }
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = rate;
      if (this.voice) u.voice = this.voice;
      if (onend) u.onend = onend;
      speechSynthesis.speak(u);
    } catch (e) { if (onend) onend(); }
  },

  /* 複数の文を続けて読む */
  chain(list, rate, done) {
    let i = 0;
    const next = () => {
      if (i >= list.length) { if (done) done(); return; }
      this.say(list[i++], rate, next);
    };
    next();
  },

  stop() { try { speechSynthesis.cancel(); } catch (e) {} },
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
        ${e.en.map((s, i) => `
          <div class="sent" data-i="${i}">
            <div class="sent-en">${esc(s)}</div>
            <div class="sent-ja">${esc(e.ja[i] || '')}</div>
            ${i === 0 ? '<div class="sent-hint">タップすると訳が出て、音声が流れます</div>' : ''}
          </div>`).join('')}
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
      <div class="q-choices">
        ${it.choices.map((c, n) => `<button class="q-choice" data-n="${n}">${esc(c)}</button>`).join('')}
      </div>`;

    if (it.say) {
      const b = $('#q-say');
      b.onclick = () => sayFrom(b, it.say, 0.88);
      if (it.autoSay) setTimeout(() => Speech.say(it.say, 0.88), 400);
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
   14. 起動
   ----------------------------------------------------------- */
function boot() {
  Store.load();
  Speech.init();
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

  $('#era-play').onclick = () => Era.playAll();
  $('#quiz-quit').onclick = () => { Speech.stop(); Nav.go('home'); };
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
