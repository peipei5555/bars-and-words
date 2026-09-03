/* ===========================================================
   単語で組み立て — 日本語文を見て、英単語のタイルを押して並べる
   app.js の $ / $$ / esc / Speech / Store / Nav / Home / shuffle / sample /
   sayFrom() をそのまま利用する（同じグローバルスコープ）。
   出題文は data/ の既存教材から組み立てるので、教材を足せばここにも自動で出る。

   ・タイルを押すと、その単語をその場で読み上げる（押した音＝発音）
   ・採点は位置ごと。合っていた語は「成功」、外した語は「失敗」として単語別に記録する
   ・記録は Store.d.words に貯め、次の出題で苦手な語を含む文を優先する
   ※ Store / Speech は const 宣言なので window には載らない。typeof で見ること
   =========================================================== */

'use strict';

const WB_PREFIX   = 'wb';   // Store.d.quiz に入れるときの接頭辞
const WB_N        = 8;      // 1セッションの問題数
const WB_MASTER   = 3;      // 連続正解がこれ以上で「覚えた単語」
const WB_MIN_WORDS = 4;     // 短すぎる文は組み立てにならない
/* 8語を超えるとタイルが12枚以上になり、探すだけで手が止まる。
   実測: 上限10だと出題文の30%が8語以上で、読み物からの説明文ばかり並んでいた。
   7語に下げると会話文が中心になり、日本語を見た瞬間に英語が浮かぶ文だけが残る */
const WB_MAX_WORDS = 7;
/* 冠詞は記録も出題の重みも続けるが、一覧には出さない。
   「覚えた単語: a」では何を覚えたのか分からないため */
const WB_HIDE = ['a', 'an', 'the'];

/* 英文を単語タイルへ割る。記号は語にくっつけたまま（Duolingoと同じ見え方） */
function wbTokens(en) {
  return String(en || '').trim().split(/\s+/).filter(Boolean);
}

/* 記録用のキー。表示は原形のまま、記録は小文字＋前後の記号を落とした形で持つ
   "Sorry," → sorry ／ "I'm" → i'm ／ "—" → 空文字（記録しない） */
function wbKey(token) {
  return String(token || '').toLowerCase().replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '');
}

/* 読み上げに渡す形。前後の記号を落とし、語中の ' と - は残す。
   "matters." → "matters" ／ "I'm" → "I'm" ／ "'really" → "really"
   事前生成のMP3もこの形で作ってあるので、両者は必ず一致させること
   （tools/generate-openai-audio.mjs がこの関数をそのまま呼んでいる） */
function wbSpeakWord(token) {
  return String(token || '').replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
}

/* -----------------------------------------------------------
   単語ごとの記憶（失敗したもの・成功したもの）
   ----------------------------------------------------------- */
const WordMemory = {
  all() {
    if (!Store.d.words || typeof Store.d.words !== 'object') Store.d.words = {};
    return Store.d.words;
  },

  get(token) { return this.all()[wbKey(token)] || null; },

  /* streak は連続正解。間違えた時点で 0 に戻す（覚え直しになる） */
  record(token, ok) {
    const key = wbKey(token);
    if (!key) return null;
    const all = this.all();
    const w = all[key] || (all[key] = { en: key, ok: 0, ng: 0, streak: 0, lastAt: '' });
    if (ok) { w.ok++; w.streak++; } else { w.ng++; w.streak = 0; }
    w.lastAt = new Date().toISOString();
    return w;
  },

  mastered(w) { return !!w && w.streak >= WB_MASTER; },
  weak(w)     { return !!w && w.ng > 0 && w.streak < WB_MASTER; },

  isWeakToken(token)     { return this.weak(this.get(token)); },
  isMasteredToken(token) { return this.mastered(this.get(token)); },

  listed(w) { return !!w && !WB_HIDE.includes(w.en); },

  /* 苦手な語。ミスの多い順 */
  weakList() {
    return Object.values(this.all())
      .filter(w => this.weak(w) && this.listed(w))
      .sort((a, b) => b.ng - a.ng || (b.ng / (b.ng + b.ok)) - (a.ng / (a.ng + a.ok)));
  },

  /* 覚えた語。最近のものから */
  masteredList() {
    return Object.values(this.all())
      .filter(w => this.mastered(w) && this.listed(w))
      .sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt)));
  },

  /* 入口と記録画面で同じ数を出すための集計 */
  counts() {
    return { mastered: this.masteredList().length, weak: this.weakList().length };
  },
};

/* -----------------------------------------------------------
   出題プール（既存教材から組み立てる）
   ----------------------------------------------------------- */
function wbPool() {
  const out = [];
  const seen = new Set();

  const add = (en, ja, source) => {
    if (!en || !ja) return;
    const target = wbTokens(en);
    if (target.length < WB_MIN_WORDS || target.length > WB_MAX_WORDS) return;
    const key = String(en).trim().toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ en: String(en).trim(), ja: String(ja).trim(), source, target });
  };

  if (typeof IMMERSION_LESSONS !== 'undefined') {
    IMMERSION_LESSONS.forEach(l => (l.sentences || []).forEach(s => add(s.en, s.ja, '今日の英語')));
  }
  if (typeof SHADOW !== 'undefined') SHADOW.forEach(s => add(s.en, s.ja, '日常会話'));
  if (typeof DRILLS !== 'undefined') DRILLS.forEach(d => add(d.en, d.ja, '会話ドリル'));
  if (typeof TALK !== 'undefined') {
    TALK.forEach(t => { add(t.en, t.ja, '音楽を語る'); add(t.reply, t.replyJa, '音楽を語る'); });
  }
  if (typeof SLANG !== 'undefined') SLANG.forEach(s => add(s.ex, s.exJa, 'スラング'));

  return out;
}

/* 出典ごとの出しやすさ。会話文は日本語を見た瞬間に英語が浮かぶが、
   読み物からの説明文（今日の英語）は硬くて手が止まるので後ろへ回す */
const WB_SOURCE_WEIGHT = {
  '日常会話':   0.35,
  '会話ドリル': 0.35,
  '音楽を語る': 0.25,
  'スラング':   0.20,
  '今日の英語': -0.9,   /* 読み物からの説明文。硬くて手が止まるので最後に回す */
};

/* 苦手を優先する重み。触っていない文と、苦手な語を含む文を上へ持ち上げる */
function wbScore(item) {
  const rec = Store.d.quiz[WB_PREFIX + ':' + item.en];
  let score = rec ? 1 + rec.ng * 2 - Math.min(rec.ok, 4) * 0.4 : 2.5;
  score += WB_SOURCE_WEIGHT[item.source] || 0;
  /* 短い文をやや前に出す。強くしすぎると4語の文ばかりになって飽きる */
  score += (WB_MAX_WORDS - item.target.length) * 0.08;
  for (const t of item.target) {
    const w = WordMemory.get(t);
    if (WordMemory.weak(w)) score += 0.6;
    else if (WordMemory.mastered(w)) score -= 0.15;
  }
  return score;
}

/* n問選ぶ。mode='weak' なら苦手な語を含む文だけに絞る（少なすぎるときは全体から） */
function wbPick(pool, n = WB_N, mode = 'all') {
  let list = pool;
  if (mode === 'weak') {
    const only = pool.filter(x => x.target.some(t => WordMemory.isWeakToken(t)));
    if (only.length >= 3) list = only;
  }
  const take = Math.min(n, list.length);

  /* スコアをそのまま重みにして抽選する。
     「上位2n件から等確率で選ぶ」方式だと、まだ何も解いていないうちは全員が同点で
     並び順が固定され、毎回まったく同じ顔ぶれになっていた（実測: 40回で24文しか出ない）。
     重み付き抽選なら、苦手な文が出やすいまま、全体から散らして選べる */
  const rest = list.slice();
  const weights = rest.map(x => Math.max(0.05, wbScore(x)));
  const out = [];
  while (out.length < take && rest.length) {
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    let i = 0;
    while (i < rest.length - 1 && (r -= weights[i]) > 0) i++;
    out.push(rest[i]);
    rest.splice(i, 1);
    weights.splice(i, 1);
  }
  return out;
}

/* おとりの単語。正解に無い語だけを、記号の付かない素の形で選ぶ
   （末尾の「.」や「?」が残ると文の終わりが分かってしまうため） */
function wbDistractors(item, pool, n) {
  const used = new Set(item.target.map(wbKey));
  const bag = new Map();
  for (const s of pool) {
    for (const t of s.target) {
      if (!/^[A-Za-z']+$/.test(t)) continue;
      const k = wbKey(t);
      if (!k || used.has(k) || bag.has(k)) continue;
      bag.set(k, k);
    }
  }
  const cands = [...bag.values()];
  const weak = cands.filter(t => WordMemory.isWeakToken(t));
  const rest = cands.filter(t => !WordMemory.isWeakToken(t));
  /* 苦手な語を1つ混ぜる。似た語と見分ける練習になる */
  return [...sample(weak, Math.min(1, weak.length)), ...sample(rest, n)].slice(0, n);
}

/* 1問ぶんのタイルを作る。
   おとりが多いほど「探す時間」が増えるだけで、英語の練習にはならない。
   4〜5語なら1つ、6語以上でも2つに留める */
function wbQuestion(item, pool) {
  const extra = item.target.length <= 5 ? 1 : 2;
  const tiles = [
    ...item.target.map(w => ({ w, extra: false })),
    ...wbDistractors(item, pool, extra).map(w => ({ w, extra: true })),
  ];
  return { ...item, tiles: shuffle(tiles).map((t, id) => ({ ...t, id })), placed: [] };
}

/* 既存教材にある解説を再利用する。無ければ空文字を返し、解説の枠ごと出さない。

   以前はここで「英語は『i → like → this → song』の順で意味を組み立てます」という
   定型文を返していた。実解説を持つのは出題122件のうち47件だけなので、
   残り61%はこの中身の無い文が毎回出ていた（しかも wbKey を通すので I まで小文字になる）。
   説明が無いことより、説明のふりをした文が出ることのほうが分かりにくい。

   解説を持つのは IMMERSION_LESSONS の point と SLANG の note だけ。
   DRILLS を見に行く分岐もあったが、DRILLS に note というフィールドは存在しないので外した。 */
function wbExplanation(item) {
  if (typeof IMMERSION_LESSONS !== 'undefined') {
    for (const lesson of IMMERSION_LESSONS) {
      const s = (lesson.sentences || []).find(x => x.en === item.en);
      if (s) return s.point || '';
    }
  }
  if (typeof SLANG !== 'undefined') {
    const s = SLANG.find(x => x.ex === item.en);
    if (s && s.note) return s.note;
  }
  return '';
}

/* 採点。位置ごとに合っているかを見る */
function wbGrade(target, placed) {
  const marks = placed.map((w, i) => w === target[i]);
  return { ok: placed.length === target.length && marks.every(Boolean), marks };
}

/* 単語別の成否。合っていた語は成功、外した語は失敗。
   おとりを使ってしまった場合は、その語も失敗として覚える */
function wbWordResults(target, placed) {
  const inTarget = new Set(target.map(wbKey).filter(Boolean));
  const out = [];
  const n = Math.max(target.length, placed.length);
  for (let i = 0; i < n; i++) {
    const want = target[i];
    const got  = placed[i];
    if (want && got && want === got) { out.push({ token: want, ok: true }); continue; }
    if (want) out.push({ token: want, ok: false });
    if (got && !inTarget.has(wbKey(got))) out.push({ token: got, ok: false });
  }
  return out.filter(x => wbKey(x.token));
}

/* -----------------------------------------------------------
   画面
   ----------------------------------------------------------- */
const WordBuild = {
  list: [], i: 0, correct: 0, missed: [], locked: false, mode: 'all',
  _pool: null,
  _newlyMastered: [],

  pool() { return this._pool || (this._pool = wbPool()); },

  /* ---------- 入口（記録と開始ボタン） ---------- */
  renderHome() {
    const el = $('#wordbuild-body');
    if (!el) return;
    const weak = WordMemory.weakList();
    const mastered = WordMemory.masteredList();
    const chips = (list, cls) => list.length
      ? `<div class="wb-chips">${list.map(w => `
          <button class="wb-chip ${cls}" data-word="${esc(w.en)}">
            ${esc(w.en)}<small>${cls === 'weak' ? `${w.ng}回ミス` : `${w.ok}回正解`}</small>
          </button>`).join('')}</div>`
      : '<p class="wb-empty">まだありません。</p>';

    el.innerHTML = `
      <p class="lead">日本語を見て、<b>英単語のタイルを並べます</b>。押すとその場で発音します。</p>

      <div class="wb-counts">
        <div><b>${mastered.length}</b><span>覚えた単語</span></div>
        <div><b>${weak.length}</b><span>苦手な単語</span></div>
        <div><b>${Store.d.wordbuildSessions || 0}</b><span>回やった</span></div>
      </div>

      <button class="today-start wb-start" id="wb-start-all">
        <span><b>組み立てる</b><small>${WB_N}問 · 苦手を優先して出します</small></span>
        <strong>START</strong>
      </button>
      <button class="quick-start wb-start-weak" id="wb-start-weak"
        ${weak.length ? '' : 'disabled'}>
        <span>🔁</span><b>苦手だけ復習</b>
        <small>${weak.length ? `${weak.length}語が対象` : 'まだ苦手はありません'}</small>
        <strong>START</strong>
      </button>

      <div class="wb-list-card">
        <h2>苦手な単語</h2>
        <p class="wb-note">${WB_MASTER}回続けて正解すると「覚えた」へ移ります。</p>
        ${chips(weak.slice(0, 30), 'weak')}
      </div>

      <div class="wb-list-card">
        <h2>覚えた単語</h2>
        ${chips(mastered.slice(0, 30), 'done')}
      </div>`;

    $('#wb-start-all').onclick = () => this.start('all');
    const weakBtn = $('#wb-start-weak');
    if (weakBtn && weak.length) weakBtn.onclick = () => this.start('weak');
    this.bindChips(el);
  },

  bindChips(root) {
    $$('.wb-chip', root).forEach(b => {
      b.onclick = () => { b.classList.add('playing'); setTimeout(() => b.classList.remove('playing'), 900); Speech.sayWord(b.dataset.word); };
    });
  },

  /* ---------- セッション ---------- */
  start(mode = 'all') {
    const pool = this.pool();
    if (!pool.length) return;
    this.mode = mode;
    this.list = wbPick(pool, WB_N, mode).map(item => wbQuestion(item, pool));
    this.i = 0; this.correct = 0; this.missed = []; this.locked = false;
    this._newlyMastered = [];
    Store.touchToday();
    $('#wb-total').textContent = this.list.length;
    Nav.go('wordbuild-run');
    this.show();
  },

  cur() { return this.list[this.i]; },

  show() {
    const it = this.cur();
    if (!it) return this.finish();
    this.locked = false;
    $('#wb-now').textContent = this.i + 1;
    $('#wb-bar-fill').style.width = (this.i / this.list.length * 100) + '%';

    /* 答えは「タイルのすぐ下」に決め打ちで出す。
       以前は答え合わせのあとに末尾へ足していたので、答えが画面の下へ流れて
       スクロールしないと読めなかった（テンポが切れる最大の原因だった） */
    $('#wb-body').innerHTML = `
      <div class="wb-stage">
        <div class="wb-cat">🧩 ${esc(it.source)}</div>
        <div class="wb-ja">${esc(it.ja)}</div>
        <div class="wb-line" id="wb-line"></div>
        <div class="wb-bank" id="wb-bank"></div>
        <div class="wb-result" id="wb-result" hidden></div>
        <div class="wb-tip" id="wb-tip">タイルを押すと発音します。</div>
        <button class="q-next" id="wb-check" disabled>答え合わせ</button>
      </div>`;

    $('#wb-check').onclick = () => this.check();
    this.paint();
  },

  /* 置いた列とタイル置き場を描き直す */
  paint() {
    const it = this.cur();
    const tile = id => it.tiles.find(t => t.id === id);
    const line = $('#wb-line');
    const bank = $('#wb-bank');
    if (!line || !bank) return;

    const slots = Math.max(0, it.target.length - it.placed.length);
    line.innerHTML =
      it.placed.map(id => `<button class="wb-tile placed" data-id="${id}">${esc(tile(id).w)}</button>`).join('')
      + Array.from({ length: slots }, () => '<span class="wb-slot"></span>').join('');

    bank.innerHTML = it.tiles
      .filter(t => !it.placed.includes(t.id))
      .map(t => `<button class="wb-tile" data-id="${t.id}">${esc(t.w)}</button>`).join('')
      || '<span class="wb-bank-empty">すべて置きました</span>';

    $$('#wb-line .wb-tile').forEach(b => {
      b.onclick = () => { if (!this.locked) this.take(+b.dataset.id); };
    });
    $$('#wb-bank .wb-tile').forEach(b => {
      b.onclick = () => { if (!this.locked) this.put(+b.dataset.id); };
    });

    const check = $('#wb-check');
    if (check) check.disabled = it.placed.length !== it.target.length;
  },

  /* 押した単語はその場で読み上げる（これが「効果音」）。
     文の読み上げ（Speech.say）とは別経路。連打しても詰まらない */
  speak(id) {
    const it = this.cur();
    const t = it.tiles.find(x => x.id === id);
    if (t) Speech.sayWord(wbSpeakWord(t.w));
  },

  put(id) {
    const it = this.cur();
    if (it.placed.includes(id) || it.placed.length >= it.target.length) return;
    it.placed.push(id);
    this.speak(id);
    this.paint();
  },

  take(id) {
    const it = this.cur();
    const at = it.placed.indexOf(id);
    if (at < 0) return;
    it.placed.splice(at, 1);
    this.speak(id);
    this.paint();
  },

  check() {
    if (this.locked) return;
    const it = this.cur();
    if (it.placed.length !== it.target.length) return;
    this.locked = true;

    const words = it.placed.map(id => it.tiles.find(t => t.id === id).w);
    const { ok, marks } = wbGrade(it.target, words);

    /* 文の記録（XPと正解率は既存の仕組みへ乗せる） */
    Store.record(WB_PREFIX + ':' + it.en, ok);
    Store.recordEncounter('wordbuild:' + it.en, 'wordbuild', ok ? 'correct' : 'wrong');

    /* 単語の記録。失敗したもの・成功したものはここに貯まる */
    for (const r of wbWordResults(it.target, words)) {
      const before = WordMemory.get(r.token);
      const wasMastered = WordMemory.mastered(before);
      const after = WordMemory.record(r.token, r.ok);
      if (!wasMastered && WordMemory.mastered(after) && !this._newlyMastered.includes(after.en)) {
        this._newlyMastered.push(after.en);
      }
    }
    Store.save();

    if (ok) this.correct++;
    else this.missed.push(it);

    $$('#wb-line .wb-tile').forEach((b, idx) => {
      b.classList.add(marks[idx] ? 'ok' : 'ng');
    });
    $$('#wb-bank .wb-tile').forEach(b => { b.classList.add('dim'); });

    /* 答えはタイルの真下に出す。ボタンは増やさず「答え合わせ」を「次へ」に変えるだけ。
       ボタンの位置が動かないので、指を置いたまま次の問題へ進める */
    const explain = wbExplanation(it);
    const res = $('#wb-result');
    res.hidden = false;
    res.className = 'wb-result ' + (ok ? 'ok' : 'ng');
    res.innerHTML = `
      <div class="wb-result-head">${ok ? '正解' : 'おしい'}</div>
      <div class="wb-answer">${esc(it.en)}</div>
      <div class="wb-answer-ja">${esc(it.ja)}</div>
      ${explain ? `<div class="wb-explain"><b>ここがポイント</b><br>${esc(explain)}</div>` : ''}`;

    const tip = $('#wb-tip');
    if (tip) tip.remove();

    const last = this.i + 1 >= this.list.length;
    const next = $('#wb-check');
    next.textContent = last ? '結果を見る' : '次へ';
    next.disabled = false;

    let moved = false;
    const go = () => {
      if (moved) return;
      moved = true;
      this.i++;
      this.show();
    };
    next.onclick = go;

    if (ok && !explain) {
      /* 正解で、しかも読むものが無いなら止まる理由がない。読み終わったら自分で進む。
         ただし答えが一瞬で消えないよう、最低1.1秒は出したままにする。
         読み上げが返ってこない端末もあるので、2.6秒で必ず進む保険も張る */
      const shownAt = Date.now();
      Speech.say(it.en, 0.85, () => setTimeout(go, Math.max(300, 1100 - (Date.now() - shownAt))));
      setTimeout(go, 2600);
    } else {
      /* 間違えたときと、解説があるときは止まる。正しい文をもう一度聞けるようにする */
      const say = document.createElement('button');
      say.className = 'q-say wb-again-say';
      say.innerHTML = '🔊 <span>もう一度聞く</span>';
      say.onclick = () => sayFrom(say, it.en, 0.85);
      res.appendChild(say);
      Speech.say(it.en, 0.85);
    }
  },

  finish() {
    Speech.stop();
    const total = this.list.length;
    const bonus = total && this.correct === total ? 40 : (this.correct >= total * 0.8 ? 15 : 0);
    if (bonus) Store.addXp(bonus);
    Store.d.wordbuildSessions = (Store.d.wordbuildSessions || 0) + 1;
    Store.save();
    Store.recordLearningSession({ mode: 'wordbuild', items: total, correct: this.correct });

    const weakNow = WordMemory.weakList().slice(0, 12);
    const chip = (w, cls) => `<button class="wb-chip ${cls}" data-word="${esc(w)}">${esc(w)}</button>`;

    $('#wb-bar-fill').style.width = '100%';
    $('#wb-now').textContent = total;
    $('#wb-body').innerHTML = `
      <div class="wb-done">
        <div class="result-score"><span>${this.correct}</span><small>/${total}</small></div>
        <h2>${this.correct === total ? '全問正解' : this.correct >= total * 0.8 ? 'よくできています' : 'ここが伸びしろです'}</h2>
        <div class="r-xp">+${this.correct * 10 + bonus} XP${bonus ? `（ボーナス +${bonus}）` : ''}</div>

        ${this._newlyMastered.length ? `
          <div class="wb-list-card">
            <h2>覚えた単語</h2>
            <div class="wb-chips">${this._newlyMastered.map(w => chip(w, 'done')).join('')}</div>
          </div>` : ''}

        <div class="wb-list-card">
          <h2>いまの苦手な単語</h2>
          ${weakNow.length
            ? `<div class="wb-chips">${weakNow.map(w => chip(w.en, 'weak')).join('')}</div>`
            : '<p class="wb-empty">苦手はありません。</p>'}
        </div>

        <button class="q-next" id="wb-again">もう一度</button>
        <button class="q-say wb-wide" id="wb-again-weak">🔁 苦手だけ復習</button>
        <button class="q-say wb-wide" id="wb-home">終わる</button>
      </div>`;

    this.bindChips($('#wb-body'));
    $('#wb-again').onclick = () => this.start('all');
    $('#wb-again-weak').onclick = () => this.start(WordMemory.weakList().length ? 'weak' : 'all');
    $('#wb-home').onclick = () => { Nav.go('wordbuild'); };
    if (typeof Home !== 'undefined') Home.render();
  },

  quit() {
    Speech.stop();
    Nav.go('wordbuild');
  },
};

document.addEventListener('DOMContentLoaded', () => {
  const quit = $('#wb-quit');
  if (quit) quit.onclick = () => WordBuild.quit();
});
