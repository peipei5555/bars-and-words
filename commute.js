/* ===========================================================
   通勤モード — シャドーイング → 単語カード → 会話ドリル → 仕上げクイズ を自動で流す
   app.js の $ / $$ / esc / Speech / Store / Nav / Home / shuffle / sample /
   q() / shuffleWith() / sayFrom() をそのまま利用する（同じグローバルスコープ）。
   app.js 側は無改造。データは data/commute.js（SHADOW / DRILLS / COMMUTE_CATS）。
   =========================================================== */

'use strict';

const COMMUTE_STAGE_JA = {
  shadow: 'シャドーイング',
  flash:  '単語カード',
  drill:  '会話ドリル',
  quiz:   '仕上げクイズ',
};

/* 触れていない項目を優先して n 件選ぶ（露出回数は Store.d.commuteSeen に保存） */
function pickFresh(pool, ns, keyOf, n) {
  const seen = Store.d.commuteSeen || (Store.d.commuteSeen = {});
  const scored = pool.map(item => ({ item, c: seen[ns + ':' + keyOf(item)] || 0, r: Math.random() }));
  scored.sort((a, b) => a.c - b.c || a.r - b.r);
  const picked = scored.slice(0, Math.min(n, pool.length)).map(s => s.item);
  picked.forEach(item => {
    const k = ns + ':' + keyOf(item);
    seen[k] = (seen[k] || 0) + 1;
  });
  Store.save();
  return shuffle(picked);
}

const Commute = {
  plan: [], idx: 0, planTotal: 0, planDone: 0, minutes: 60,
  _timers: [],
  _lastSummary: null,

  clearTimers() { this._timers.forEach(t => clearTimeout(t)); this._timers = []; },
  after(ms, fn) { const t = setTimeout(fn, ms); this._timers.push(t); return t; },

  /* ---------- セットアップ画面 ---------- */
  renderSetup(showDone) {
    const el = $('#commute-setup');
    if (!el) return;
    const done = showDone && this._lastSummary;
    el.innerHTML = `
      <p class="lead">音は出さずに口だけ動かす<b>シャドーイング</b>、<b>単語カード</b>、
      頭の中で答える<b>会話ドリル</b>、仕上げの<b>クイズ</b>を、選んだ時間ぶん自動で流します。
      タップは最小限、ほぼ流れに乗るだけです。</p>
      ${done ? `
      <div class="cm-done-banner">
        <b>✓ 今日のセッション完了</b>
        <div style="margin-top:6px;font-size:13px;color:var(--text-2)">
          ${this._lastSummary.items}項目 ・ クイズ正解 ${this._lastSummary.quizCorrect}/${this._lastSummary.quizTotal} ・ +${this._lastSummary.xp} XP
        </div>
      </div>` : ''}
      <div class="cm-len-grid">
        <button class="cm-len-btn" data-min="20"><b>20分</b><small>短縮版</small></button>
        <button class="cm-len-btn" data-min="40"><b>40分</b><small>標準</small></button>
        <button class="cm-len-btn" data-min="60"><b>60分</b><small>通勤フル</small></button>
      </div>
      <p class="lead" style="margin-top:20px">電車内では<b>声を出さず、口の動きだけ</b>でOKです。
      声に出す練習は、家や駅までの徒歩の時間にどうぞ。</p>
      <div class="pad"></div>`;

    $$('#commute-setup .cm-len-btn').forEach(b => {
      b.onclick = () => this.start(+b.dataset.min);
    });
  },

  /* ---------- セッション開始 ---------- */
  start(minutes) {
    this.minutes = minutes;
    this.plan = this.buildPlan(minutes);
    this.planTotal = this.plan.reduce((s, x) => s + x.n, 0);
    this.planDone = 0;
    this.idx = 0;
    this._quizCorrectTotal = 0;
    this._quizTotalAll = 0;
    Store.touchToday();
    Nav.go('commute-run');
    this.runStage();
  },

  buildPlan(minutes) {
    const s = minutes / 60;
    return [
      { type: 'shadow', n: Math.max(6, Math.round(16 * s)) },
      { type: 'flash',  n: Math.max(5, Math.round(12 * s)) },
      { type: 'drill',  n: Math.max(4, Math.round(9  * s)) },
      { type: 'quiz',   n: Math.max(4, Math.round(8  * s)) },
    ];
  },

  updateBar() {
    const fill = $('#commute-bar-fill');
    if (fill) fill.style.width = Math.min(100, this.planDone / this.planTotal * 100) + '%';
  },

  runStage() {
    this.clearTimers();
    if (this.idx >= this.plan.length) return this.finish();
    const st = this.plan[this.idx];
    $('#commute-stage-label').textContent = COMMUTE_STAGE_JA[st.type];
    if (st.type === 'shadow') this.runShadow(st.n);
    else if (st.type === 'flash') this.runFlash(st.n);
    else if (st.type === 'drill') this.runDrill(st.n);
    else if (st.type === 'quiz') this.runQuiz(st.n);
  },

  nextStage() { this.idx++; this.runStage(); },

  /* ---------- 1) シャドーイング ---------- */
  runShadow(n) {
    this._sItems = pickFresh(SHADOW, 'shadow', x => x.en, n);
    this._sIdx = 0;
    this.showShadow();
  },
  showShadow() {
    this.clearTimers();
    if (this._sIdx >= this._sItems.length) return this.nextStage();
    this.planDone++; this.updateBar();
    const it = this._sItems[this._sIdx];
    $('#commute-stage-label').textContent = `シャドーイング ${this._sIdx + 1}/${this._sItems.length}`;
    $('#commute-body').innerHTML = `
      <div class="cm-shadow">
        <div class="cm-cat">${it.cat ? COMMUTE_CATS[it.cat].emoji + ' ' + esc(COMMUTE_CATS[it.cat].ja) : ''}</div>
        <div class="cm-en">${esc(it.en)}</div>
        <div class="cm-ja">${esc(it.ja)}</div>
        <div class="cm-hint">声は出さず、口だけ動かしてついていってみてください</div>
        <button class="btn-ghost small" id="cm-next">次へ ▶</button>
      </div>`;
    $('#cm-next').onclick = () => { Speech.stop(); this.clearTimers(); this._sIdx++; this.showShadow(); };
    Store.addXp(1);
    Speech.say(it.en, 0.72, () => {
      this.after(500, () => Speech.say(it.en, 1.0, () => {
        this.after(1300, () => { this._sIdx++; this.showShadow(); });
      }));
    });
  },

  /* ---------- 2) 単語カード ---------- */
  runFlash(n) {
    this._fItems = pickFresh(SHADOW, 'flash', x => x.en, n);
    this._fIdx = 0;
    this.showFlash();
  },
  showFlash() {
    this.clearTimers();
    if (this._fIdx >= this._fItems.length) return this.nextStage();
    this.planDone++; this.updateBar();
    const it = this._fItems[this._fIdx];
    $('#commute-stage-label').textContent = `単語カード ${this._fIdx + 1}/${this._fItems.length}`;
    $('#commute-body').innerHTML = `
      <div class="cm-flash">
        <div class="cm-cat">${it.cat ? COMMUTE_CATS[it.cat].emoji + ' ' + esc(COMMUTE_CATS[it.cat].ja) : ''}</div>
        <div class="cm-ja-big">${esc(it.ja)}</div>
        <div class="cm-hint">英語で言うなら？　思い浮かべたらタップ</div>
        <button class="btn-primary" id="cm-reveal">答えを見る</button>
      </div>`;
    $('#cm-reveal').onclick = () => this.revealFlash();
    this.after(6000, () => this.revealFlash());
  },
  revealFlash() {
    this.clearTimers();
    const body = $('#commute-body .cm-flash');
    if (!body || body.dataset.revealed) return;
    body.dataset.revealed = '1';
    const it = this._fItems[this._fIdx];
    const btn = $('#cm-reveal');
    if (btn) btn.remove();
    body.insertAdjacentHTML('beforeend', `
      <div class="cm-en-reveal">${esc(it.en)}</div>
      <div class="cm-flash-btns">
        <button class="btn-ghost" id="cm-know">分かった</button>
        <button class="btn-ghost" id="cm-again">もう一度出す</button>
      </div>`);
    Speech.say(it.en, 0.9);
    Store.addXp(2);
    $('#cm-know').onclick = () => { this._fIdx++; this.showFlash(); };
    $('#cm-again').onclick = () => { this._fItems.splice(this._fIdx + 1, 0, it); this._fIdx++; this.showFlash(); };
  },

  /* ---------- 3) 会話ドリル ---------- */
  runDrill(n) {
    this._dItems = pickFresh(DRILLS, 'drill', x => x.en, n);
    this._dIdx = 0;
    this.showDrill();
  },
  showDrill() {
    this.clearTimers();
    if (this._dIdx >= this._dItems.length) return this.nextStage();
    this.planDone++; this.updateBar();
    const it = this._dItems[this._dIdx];
    $('#commute-stage-label').textContent = `会話ドリル ${this._dIdx + 1}/${this._dItems.length}`;
    $('#commute-body').innerHTML = `
      <div class="cm-drill">
        <div class="cm-cat">${it.cat ? COMMUTE_CATS[it.cat].emoji + ' ' + esc(COMMUTE_CATS[it.cat].ja) : ''}</div>
        <div class="cm-cue">${esc(it.cueJa)}</div>
        <div class="cm-hint">頭の中で（小声でもOK）英語にしてみてください</div>
        <button class="btn-primary" id="cm-reveal2">お手本を見る</button>
      </div>`;
    $('#cm-reveal2').onclick = () => this.revealDrill();
    this.after(8000, () => this.revealDrill());
  },
  revealDrill() {
    this.clearTimers();
    const body = $('#commute-body .cm-drill');
    if (!body || body.dataset.revealed) return;
    body.dataset.revealed = '1';
    const it = this._dItems[this._dIdx];
    const btn = $('#cm-reveal2');
    if (btn) btn.remove();
    body.insertAdjacentHTML('beforeend', `
      <div class="cm-answer">
        <div class="cm-en">${esc(it.en)}</div>
        <div class="cm-ja">${esc(it.ja)}</div>
        ${it.note ? `<div class="cm-note">${esc(it.note)}</div>` : ''}
      </div>`);
    Store.addXp(3);
    Speech.say(it.en, 0.85, () => {
      body.insertAdjacentHTML('beforeend', `<button class="btn-ghost small" id="cm-drill-next">次へ ▶</button>`);
      const nb = $('#cm-drill-next');
      if (nb) nb.onclick = () => { this._dIdx++; this.showDrill(); };
      this.after(4500, () => { this._dIdx++; this.showDrill(); });
    });
  },

  /* ---------- 4) 仕上げクイズ（q() / shuffleWith() は app.js のものを再利用） ---------- */
  runQuiz(n) {
    const items = pickFresh(DRILLS, 'commuteq', x => x.en, n);
    this._qItems = items.map(d => {
      const others = sample(DRILLS.filter(x => x.en !== d.en), Math.min(3, DRILLS.length - 1));
      return q({
        kind: '通勤 · ' + COMMUTE_CATS[d.cat].ja,
        text: d.cueJa, small: true, sub: '英語でどう言う？',
        choices: shuffleWith(d, others, x => x.en),
        right: d.en,
        note: `${esc(d.ja)}${d.note ? '<br>' + esc(d.note) : ''}`,
        say: d.en, key: 'commuteq:' + d.en, rvEn: d.en, rvJa: d.ja,
      });
    });
    this._qIdx = 0; this._qCorrect = 0;
    this.showQuiz();
  },
  showQuiz() {
    if (this._qIdx >= this._qItems.length) {
      this._quizCorrectTotal = this._qCorrect;
      this._quizTotalAll = this._qItems.length;
      return this.nextStage();
    }
    this.planDone++; this.updateBar();
    const it = this._qItems[this._qIdx];
    $('#commute-stage-label').textContent = `仕上げクイズ ${this._qIdx + 1}/${this._qItems.length}`;
    $('#commute-body').innerHTML = `
      <div class="cm-stage">
        <div class="q-kind">${esc(it.kind)}</div>
        <div class="q-text${it.small ? ' small' : ''}">${esc(it.text)}</div>
        ${it.sub ? `<div class="q-sub">${esc(it.sub)}</div>` : ''}
        ${it.say ? `<button class="q-say" id="cm-q-say">🔊 <span>音声を聞く</span></button>` : ''}
        <div class="q-choices">${it.choices.map((c, i) => `<button class="q-choice" data-n="${i}">${esc(c)}</button>`).join('')}</div>
      </div>`;
    if (it.say) $('#cm-q-say').onclick = () => sayFrom($('#cm-q-say'), it.say, 0.88);
    $$('#commute-body .q-choice').forEach(b => { b.onclick = () => this.answerQuiz(+b.dataset.n); });
  },
  answerQuiz(n) {
    const it = this._qItems[this._qIdx];
    const ok = n === it.answer;
    Store.record(it.key, ok);
    if (ok) this._qCorrect++;

    $$('#commute-body .q-choice').forEach((b, idx) => {
      b.disabled = true;
      if (idx === it.answer) b.classList.add('ok');
      else if (idx === n) b.classList.add('ng');
      else b.classList.add('dim');
    });
    if (!ok && it.say) Speech.say(it.say, 0.85);

    const note = document.createElement('div');
    note.className = 'q-note';
    note.innerHTML = (ok ? '<b>正解</b><br>' : '<b>不正解</b><br>') + it.note;
    $('#commute-body .cm-stage').appendChild(note);

    const next = document.createElement('button');
    next.className = 'q-next';
    next.textContent = this._qIdx + 1 >= this._qItems.length ? '完了' : '次へ';
    next.onclick = () => { this._qIdx++; this.showQuiz(); };
    $('#commute-body .cm-stage').appendChild(next);
    next.scrollIntoView({ behavior: 'smooth', block: 'end' });
  },

  /* ---------- セッション完了 ---------- */
  finish() {
    Speech.stop();
    this.clearTimers();
    const bonus = 30;
    Store.addXp(bonus);
    Store.d.commuteSessions = (Store.d.commuteSessions || 0) + 1;
    Store.save();
    this._lastSummary = {
      items: this.planTotal,
      quizCorrect: this._quizCorrectTotal || 0,
      quizTotal: this._quizTotalAll || 0,
      xp: bonus,
    };
    Nav.go('commute');
    this.renderSetup(true);
    Home.render();
  },
};

document.addEventListener('DOMContentLoaded', () => {
  const cta = $('#commute-cta-btn');
  if (cta) cta.onclick = () => { Nav.go('commute'); Commute.renderSetup(false); };

  const quit = $('#commute-quit');
  if (quit) quit.onclick = () => { Speech.stop(); Commute.clearTimers(); Nav.go('home'); };
});
