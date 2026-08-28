/* ===========================================================
   今日の英語 — Immersionを中心に、既存の通勤教材も保持する
   app.js の $ / $$ / esc / Speech / Store / Nav / Home / shuffle / sample /
   q() / shuffleWith() / sayFrom() をそのまま利用する（同じグローバルスコープ）。
   新教材は data/immersion.js、従来教材は data/commute.js を利用する。
   =========================================================== */

'use strict';

/* 表示名。従来ステージは別教材から引き続き利用できるよう残す。 */
const COMMUTE_STAGE_JA = {
  immersion: '今日の英語',
  topic:   '今日の読みもの',
  grammar: '今日の文法',
  parse:   '精読',
  shadow:  'シャドーイング',
  flash:   '単語カード',
  drill:   '会話ドリル',
  quiz:    '仕上げクイズ',
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
  plan: [], idx: 0, planTotal: 0, planDone: 0, minutes: 10, mode: 'commute',
  _timers: [],
  _lastSummary: null,
  checkpoint: null,
  _transitionLocked: false,

  clearTimers() { this._timers.forEach(t => clearTimeout(t)); this._timers = []; },
  after(ms, fn) { const t = setTimeout(fn, ms); this._timers.push(t); return t; },

  /* ---------- セットアップ画面 ---------- */
  renderSetup(showDone) {
    const el = $('#commute-setup');
    if (!el) return;
    const done = showDone && this._lastSummary;
    el.innerHTML = `
      <p class="lead">時間を選ぶだけで、<b>今日やるぶんが自動で配られます</b>。
        <b>聞く → 読む → 意味をつかむ → もう一度聞く → 確認</b>の順に進みます。
        学習方法を選ぶ必要はありません。</p>

      <div class="cm-today">
        <div class="cmt-h">つぎに配られる内容</div>
        <div class="cmt-row"><span class="cmt-n">1</span><b>まず音だけで聞く</b></div>
        <div class="cmt-row"><span class="cmt-n">2</span>
          <b>英文と意味を確認</b> … 文の組み立ても必要な時だけ開けます</div>
        <div class="cmt-row"><span class="cmt-n">3</span><b>意味を知って、もう一度聞く</b></div>
        <div class="cmt-row"><span class="cmt-n">4</span><b>日本語から英語を作って確認</b></div>
      </div>
      ${done ? `
      <div class="cm-done-banner">
        <b>✓ 今日のセッション完了</b>
        ${this._lastSummary.grammar && this._lastSummary.grammar.length ? `
          <div class="cmd-row">📐 今日の文法 … <b>${esc(this._lastSummary.grammar.join('、'))}</b></div>` : ''}
        ${this._lastSummary.parseCount ? `
          <div class="cmd-row">📖 精読 … <b>${this._lastSummary.parseCount}文</b></div>` : ''}
        <div class="cmd-row">🎧 聞く・読む・確認 … <b>${this._lastSummary.items}レッスン</b></div>
        <div class="cmd-row">+${this._lastSummary.xp} XP</div>
        ${this._lastSummary.mode === 'quick' || this._lastSummary.mode === 'free' ? `
          <div class="cm-extend">
            <b>もう少し続けますか？</b>
            <div class="cm-extend-actions">
              <button class="btn-ghost" data-free-min="10">あと10分</button>
              <button class="btn-ghost" data-free-min="20">あと20分</button>
            </div>
          </div>` : ''}
      </div>` : ''}
      <div class="cm-len-grid">
        <button class="cm-len-btn" data-min="5"><b>5分</b><small>最短</small></button>
        <button class="cm-len-btn" data-min="10"><b>10分</b><small>標準</small></button>
        <button class="cm-len-btn" data-min="20"><b>20分</b><small>しっかり</small></button>
      </div>
      <p class="lead" style="margin-top:20px">電車内では<b>声を出さず、口の動きだけ</b>でOKです。
      声に出す練習は、家や駅までの徒歩の時間にどうぞ。</p>
      <div class="pad"></div>`;

    $$('#commute-setup .cm-len-btn').forEach(b => {
      b.onclick = () => this.start(+b.dataset.min, 'commute');
    });
    $$('#commute-setup [data-free-min]').forEach(b => {
      b.onclick = () => this.start(+b.dataset.freeMin, 'free');
    });
  },

  /* ---------- セッション開始 ---------- */
  start(minutes, mode = 'commute') {
    this.minutes = minutes;
    this.mode = mode;
    this.plan = this.buildPlan(minutes, mode);
    this.planTotal = this.plan.reduce((s, x) => s + x.n, 0);
    this.planDone = 0;
    this.idx = 0;
    this._quizCorrectTotal = 0;
    this._quizTotalAll = 0;
    this._gItems = []; this._pItems = [];
    this._voiceOffered = false;
    this.checkpoint = null;
    this.saveSession();
    Store.touchToday();
    Nav.go('commute-run');
    this.runStage();
  },

  buildPlan(minutes, mode = 'commute') {
    if (typeof IMMERSION_LESSONS !== 'undefined') {
      const count = minutes >= 20 ? 2 : 1;
      return [{ type: 'immersion', n: count, lessonIds: this.pickImmersionLessons(count, mode).map(x => x.id) }];
    }
    if (mode === 'quick') return [
      { type: 'topic', n: 1 }, { type: 'flash', n: 3 },
      { type: 'shadow', n: 2 }, { type: 'quiz', n: 3 },
    ];
    const scale = minutes / 10;
    const plan = [];

    if (typeof TOPICS !== 'undefined') plan.push({ type: 'topic', n: minutes >= 20 ? 2 : 1 });

    /* ① 今日の文法 ── 1日1項目。15項目あるので15日で一巡する */
    if (typeof GRAMMAR !== 'undefined') plan.push({ type: 'grammar', n: 1 });

    /* ② 精読 ── 文法で覚えた形が実際の文でどう出るかを見る */
    if (typeof PARSE !== 'undefined' && Object.keys(PARSE).length) {
      plan.push({ type: 'parse', n: Math.max(1, Math.round(scale)) });
    }

    /* ③〜 音読と定着（従来のステージ） */
    plan.push(
      { type: 'shadow', n: Math.max(2, Math.round(3 * scale)) },
      { type: 'flash',  n: Math.max(2, Math.round(3 * scale)) },
      { type: 'drill',  n: Math.max(1, Math.round(2 * scale)) },
      { type: 'quiz',   n: Math.max(2, Math.round(3 * scale)) },
    );
    return plan;
  },

  pickImmersionLessons(n, mode) {
    const items = Store.normalizeLearning(Store.d).items;
    const now = Date.now();
    const seed = Number(ymd(new Date()).replaceAll('-', ''));
    return IMMERSION_LESSONS
      .filter(x => (x.modes || []).includes(mode) || (mode === 'commute' && (x.modes || []).includes('commute')))
      .map((lesson, index) => {
        const stat = items['lesson:' + lesson.id] || {};
        const outputs = lesson.production.map(x => items['production:' + x.id] || {});
        const outputDue = outputs.some(x => x.nextDueAt && Date.parse(x.nextDueAt) <= now);
        const due = outputDue || !stat.nextDueAt || Date.parse(stat.nextDueAt) <= now;
        const wrong = outputs.reduce((sum, x) => sum + (x.wrongCount || 0) - Math.min(2, x.correctCount || 0), 0);
        return { lesson, index, due, encounters: stat.encounterCount || 0, wrong };
      })
      .sort((a, b) => Number(b.due) - Number(a.due)
        || b.wrong - a.wrong
        || a.encounters - b.encounters
        || ((a.index + seed) % IMMERSION_LESSONS.length) - ((b.index + seed) % IMMERSION_LESSONS.length))
      .slice(0, n).map(x => x.lesson);
  },

  /* まだ読んでいない項目を優先して配る。全部済んだら「いちばん昔に読んだもの」から復習。
     grammarRead / parseRead は読んだ順に並んでいて、読み直すと末尾へ回る（下の advance 参照）。
     だから配列の先頭が「最も久しく触っていないもの」になる。 */
  pickGrammar(n) {
    const read = Store.d.grammarRead || [];
    const fresh = GRAMMAR.filter(g => !read.includes(g.id));
    if (fresh.length) return fresh.slice(0, n);          /* STEP順に並んでいるので先頭から */
    return read.map(id => GRAMMAR.find(g => g.id === id)).filter(Boolean).slice(0, n);
  },

  pickParseSentences(n) {
    const keys = Object.keys(PARSE);
    const read = Store.d.parseRead || [];
    const fresh = keys.filter(k => !read.includes(k));
    if (fresh.length >= n) return fresh.slice(0, n);
    const old = read.filter(k => keys.includes(k));      /* 古い順の既読 */
    return [...fresh, ...old.slice(0, n - fresh.length)];
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
    if (st.type === 'immersion') this.runImmersion(st);
    else if (st.type === 'topic') this.runTopic(st.n);
    else if (st.type === 'grammar') this.runGrammar(st.n);
    else if (st.type === 'parse') this.runParse(st.n);
    else if (st.type === 'shadow') this.runShadow(st.n);
    else if (st.type === 'flash') this.runFlash(st.n);
    else if (st.type === 'drill') this.runDrill(st.n);
    else if (st.type === 'quiz') this.runQuiz(st.n);
  },

  nextStage() { this.idx++; this.checkpoint = null; this.saveSession(); this.runStage(); },

  saveSession() {
    try {
      localStorage.setItem('bars-words-session', JSON.stringify({
        minutes: this.minutes, mode: this.mode, plan: this.plan, idx: this.idx,
        planDone: this.planDone, checkpoint: this.checkpoint, version: 2, savedAt: Date.now(),
      }));
    } catch (e) {}
    this.updateResumeButton();
  },

  savedSession() {
    try {
      const s = JSON.parse(localStorage.getItem('bars-words-session'));
      if (!s || !Array.isArray(s.plan) || s.idx >= s.plan.length) return null;
      if (s.checkpoint) {
        const phases = ['listen', 'read', 'meaning', 'relisten', 'output', 'quiz'];
        if (!phases.includes(s.checkpoint.phase)) s.checkpoint = null;
      }
      return s;
    } catch (e) { return null; }
  },

  resume() {
    const s = this.savedSession();
    if (!s) return this.start(10, 'commute');
    this.minutes = s.minutes; this.mode = s.mode || 'commute'; this.plan = s.plan;
    this.idx = s.idx; this.planDone = s.planDone || 0;
    this.checkpoint = s.checkpoint || null;
    this.planTotal = this.plan.reduce((sum, item) => sum + item.n, 0);
    this._quizCorrectTotal = 0; this._quizTotalAll = 0;
    this._voiceOffered = false;
    Nav.go('commute-run'); this.updateBar(); this.runStage();
  },

  updateResumeButton() {
    const b = $('#resume-start-btn');
    if (!b) return;
    const s = this.savedSession();
    b.hidden = !s;
    if (s) b.textContent = `${s.mode === 'quick' ? 'ちょっと5分' : '今日の英語'}を途中から再開`;
  },

  /* ---------- Immersion Learning ---------- */
  runImmersion(stage) {
    this._iItems = (stage.lessonIds || []).map(immersionLesson).filter(Boolean).map(lesson => {
      /* 初回の「今日の英語」は、3文すべてを詰め込まず2文に絞る。 */
      const sentences = lesson.sentences.slice(0, 2);
      const sourceIds = new Set(sentences.map(x => x.id));
      return { ...lesson, sentences, production: lesson.production.filter(x => sourceIds.has(x.source)).slice(0, 2) };
    });
    if (!this._iItems.length) return this.nextStage();
    const cp = this.checkpoint;
    if (!cp || cp.stageIndex !== this.idx || cp.type !== 'immersion') {
      this.checkpoint = {
        type: 'immersion', stageIndex: this.idx, lessonIndex: 0,
        sentenceIndex: 0, phase: 'listen', outputIndex: 0,
        revealed: false, recorded: false, quizDone: false, quizAnswered: false,
      };
    }
    this.showImmersion();
  },

  immersionCheckpoint(next) {
    this.checkpoint = { ...this.checkpoint, ...next };
    this.saveSession();
    this.showImmersion();
  },

  breakdownHtml(sentence) {
    return `<details class="imm-breakdown">
      <summary>文の組み立てを見る <span>S / V / O / C / M</span></summary>
      <div class="imm-chunks">${sentence.chunks.map(c => {
        const role = ROLE_INFO[c.role] || ROLE_INFO.M;
        return `<div class="imm-chunk" style="--rc:${role.c}">
          <span class="imm-role">${esc(role.short)} · ${esc(role.ja)}</span>
          <b>${esc(c.t)}</b><small>${esc(c.ja)}</small>
        </div>`;
      }).join('')}</div>
      <p class="imm-point">${esc(sentence.point)}</p>
    </details>`;
  },

  bindOnce(selector, action) {
    const button = $(selector);
    if (!button) return;
    button.onclick = () => {
      if (button.disabled) return;
      button.disabled = true;
      Speech.stop();
      this.clearTimers();
      action();
    };
  },

  showImmersion() {
    this.clearTimers();
    const cp = this.checkpoint;
    const lesson = this._iItems[cp.lessonIndex];
    if (!lesson) return this.nextStage();
    $('#commute-stage-label').textContent = `今日の英語 ${cp.lessonIndex + 1}/${this._iItems.length}`;

    if (cp.phase === 'output') return this.showImmersionOutput(lesson);
    if (cp.phase === 'quiz') return this.showImmersionQuiz(lesson);
    const sentence = lesson.sentences[cp.sentenceIndex];
    if (!sentence) return this.startImmersionOutput();

    if (cp.phase === 'listen' && !cp.recorded) {
      Store.recordEncounter('sentence:' + sentence.id, 'sentence', 'seen');
      if (cp.sentenceIndex === 0) Store.recordEncounter('lesson:' + lesson.id, 'lesson', 'seen');
      cp.recorded = true;
      this.saveSession();
    }

    const step = { listen: 1, read: 2, meaning: 3, relisten: 4 }[cp.phase] || 1;
    const showEnglish = cp.phase !== 'listen';
    const showMeaning = cp.phase === 'meaning' || cp.phase === 'relisten';
    const labels = {
      listen: ['まずは音だけ', '英文を見る'],
      read: ['聞こえた英文', '意味を確認'],
      meaning: ['意味と組み立て', 'もう一度聞く'],
      relisten: ['意味を知ってもう一度', cp.sentenceIndex + 1 >= lesson.sentences.length ? '瞬間英作文へ' : '次の英文へ'],
    };
    const [heading, nextLabel] = labels[cp.phase];
    $('#commute-body').innerHTML = `
      <div class="cm-stage imm-card" data-phase="${cp.phase}">
        <div class="imm-topic">${lesson.emoji} ${esc(lesson.cat)} · ${esc(lesson.level)}</div>
        <h2>${esc(lesson.titleJa)}</h2>
        <div class="imm-progress"><i style="width:${((cp.sentenceIndex * 4 + step) / (lesson.sentences.length * 4 + lesson.production.length) * 100)}%"></i></div>
        <div class="imm-step">${step}/4　${heading}</div>
        ${cp.phase === 'listen' ? `<div class="imm-listen-mark">🎧<b>画面を見ずに、音のまとまりを聞く</b><small>全部わからなくても大丈夫です</small></div>` : ''}
        ${showEnglish ? `<div class="imm-en">${esc(sentence.en)}</div>` : ''}
        ${showMeaning ? `<div class="imm-ja">${esc(sentence.ja)}</div>${this.breakdownHtml(sentence)}` : ''}
        ${showEnglish ? `<button class="q-say imm-replay" id="imm-replay">🔊 <span>この英文を聞く</span></button>` : ''}
        <button class="btn-primary" id="imm-next">${nextLabel} ▶</button>
      </div>`;

    if (showEnglish) $('#imm-replay').onclick = () => sayFrom($('#imm-replay'), sentence.en, cp.phase === 'relisten' ? 0.9 : 0.82);
    this.bindOnce('#imm-next', () => {
      if (cp.phase === 'listen') this.immersionCheckpoint({ phase: 'read' });
      else if (cp.phase === 'read') this.immersionCheckpoint({ phase: 'meaning' });
      else if (cp.phase === 'meaning') this.immersionCheckpoint({ phase: 'relisten' });
      else if (cp.sentenceIndex + 1 < lesson.sentences.length) {
        this.immersionCheckpoint({ sentenceIndex: cp.sentenceIndex + 1, phase: 'listen', recorded: false });
      } else this.startImmersionOutput();
    });

    /* 状態は変えず、現在のタップ操作の同期範囲で音声だけを開始する。 */
    if (cp.phase === 'listen' || cp.phase === 'relisten') Speech.say(sentence.en, cp.phase === 'listen' ? 0.78 : 0.9);
  },

  startImmersionOutput() {
    this.checkpoint = { ...this.checkpoint, phase: 'output', outputIndex: 0, revealed: false };
    this.saveSession();
    this.showImmersion();
  },

  showImmersionOutput(lesson) {
    const cp = this.checkpoint;
    const item = lesson.production[cp.outputIndex];
    if (!item) return this.completeImmersionLesson();
    $('#commute-stage-label').textContent = `確認 ${cp.outputIndex + 1}/${lesson.production.length}`;
    $('#commute-body').innerHTML = `
      <div class="cm-stage imm-card imm-output" data-revealed="${cp.revealed ? 'true' : 'false'}">
        <div class="imm-topic">${lesson.emoji} ${esc(lesson.titleJa)}</div>
        <div class="imm-step">直前の言い方を使う</div>
        <div class="imm-output-ja">${esc(item.ja)}</div>
        <div class="cm-hint">頭の中で英語にしてください。完璧でなくてもOKです</div>
        ${cp.revealed ? `
          <div class="imm-answer">${esc(item.answer)}</div>
          <button class="q-say imm-replay" id="imm-answer-audio">🔊 <span>答えの音声を聞く</span></button>
          <div class="imm-grade">
            <button class="btn-ghost" data-grade="wrong">要復習</button>
            <button class="btn-primary" data-grade="correct">できた</button>
          </div>` : `<button class="btn-primary" id="imm-reveal">答えを見る</button>`}
      </div>`;

    if (!cp.revealed) {
      this.bindOnce('#imm-reveal', () => this.immersionCheckpoint({ revealed: true }));
      return;
    }
    $('#imm-answer-audio').onclick = () => sayFrom($('#imm-answer-audio'), item.answer, 0.86);
    $$('#commute-body [data-grade]').forEach(button => {
      button.onclick = () => {
        if (button.disabled) return;
        $$('#commute-body [data-grade]').forEach(x => { x.disabled = true; });
        Speech.stop();
        const result = button.dataset.grade;
        Store.recordEncounter('production:' + item.id, 'production', result);
        if (result === 'correct') Store.addXp(10); else Store.addXp(3);
        if (cp.outputIndex + 1 >= lesson.production.length) this.completeImmersionLesson();
        else this.immersionCheckpoint({ outputIndex: cp.outputIndex + 1, revealed: false });
      };
    });
  },

  completeImmersionLesson() {
    if (this._transitionLocked) return;
    const lesson = this._iItems[this.checkpoint.lessonIndex];
    if (!this.checkpoint.quizDone) {
      this.checkpoint = { ...this.checkpoint, phase: 'quiz', quizAnswered: false };
      this.saveSession();
      this.showImmersionQuiz(lesson);
      return;
    }
    this._transitionLocked = true;
    this.planDone++;
    this.updateBar();
    const nextLesson = this.checkpoint.lessonIndex + 1;
    if (nextLesson < this._iItems.length) {
      this.checkpoint = { ...this.checkpoint, lessonIndex: nextLesson, sentenceIndex: 0, phase: 'listen', outputIndex: 0, revealed: false, recorded: false, quizDone: false, quizAnswered: false };
      this.saveSession();
      this._transitionLocked = false;
      this.showImmersion();
    } else {
      this._transitionLocked = false;
      if (!this._voiceOffered && typeof RealtimePractice !== 'undefined') {
        this._voiceOffered = true;
        this.saveSession();
        RealtimePractice.offer(lesson, () => this.nextStage());
      } else this.nextStage();
    }
  },

  showImmersionQuiz(lesson) {
    const cp = this.checkpoint;
    const index = (Number(ymd(new Date()).replaceAll('-', '')) + cp.lessonIndex) % lesson.sentences.length;
    const sentence = lesson.sentences[index];
    const distractors = IMMERSION_LESSONS
      .flatMap(x => x.sentences)
      .filter(x => x.id !== sentence.id && x.ja !== sentence.ja)
      .slice(0, 8);
    const picked = sample(distractors, 2);
    const choices = shuffle([sentence.ja, ...picked.map(x => x.ja)]);
    const answer = choices.indexOf(sentence.ja);
    $('#commute-stage-label').textContent = '今日のミニクイズ';
    $('#commute-body').innerHTML = `
      <div class="cm-stage imm-card imm-quiz">
        <div class="imm-topic">${lesson.emoji} 今日の仕上げ</div>
        <div class="imm-step">意味が近いものを選ぶ</div>
        <div class="imm-en">${esc(sentence.en)}</div>
        <div class="q-choices">
          ${choices.map((choice, i) => `<button class="q-choice" data-n="${i}">${esc(choice)}</button>`).join('')}
        </div>
      </div>`;
    $$('#commute-body .q-choice').forEach(button => {
      button.onclick = () => {
        if (cp.quizAnswered) return;
        cp.quizAnswered = true;
        const selected = +button.dataset.n;
        const ok = selected === answer;
        Store.recordEncounter('immersion-quiz:' + sentence.id, 'quiz', ok ? 'correct' : 'wrong');
        $$('#commute-body .q-choice').forEach((choice, i) => {
          choice.disabled = true;
          if (i === answer) choice.classList.add('ok');
          else if (i === selected) choice.classList.add('ng');
          else choice.classList.add('dim');
        });
        const note = document.createElement('div');
        note.className = 'q-note';
        note.innerHTML = `${ok ? '<b>正解</b>' : '<b>不正解</b>'}<br>${esc(sentence.ja)}`;
        $('#commute-body .cm-stage').appendChild(note);
        const next = document.createElement('button');
        next.className = 'q-next';
        next.textContent = '今日の英語を完了';
        next.onclick = () => {
          this.checkpoint = { ...this.checkpoint, quizDone: true, quizAnswered: true };
          this.saveSession();
          this.completeImmersionLesson();
        };
        $('#commute-body .cm-stage').appendChild(next);
      };
    });
  },

  /* ---------- 今日の読みもの ---------- */
  runTopic(n) {
    const daily = topicForToday();
    const rest = pickFresh(TOPICS.filter(x => x.id !== daily.id), 'topic', x => x.id, Math.max(0, n - 1));
    this._tItems = [daily, ...rest];
    this._tIdx = 0;
    this.showTopic();
  },

  showTopic() {
    this.clearTimers();
    if (this._tIdx >= this._tItems.length) return this.nextStage();
    this.planDone++; this.updateBar();
    const it = this._tItems[this._tIdx];
    $('#commute-stage-label').textContent = `今日の読みもの ${this._tIdx + 1}/${this._tItems.length}`;
    $('#commute-body').innerHTML = `
      <div class="cm-stage cm-topic">
        <div class="topic-label">${it.emoji} ${esc(it.cat)}</div>
        <h2>${esc(it.titleJa)}</h2>
        <div class="topic-lines">${it.sentences.map((s, i) => `
          <button data-sentence="${i}"><span>${esc(s)}</span><i>▶</i></button>`).join('')}</div>
        <div class="topic-ja">${esc(it.ja)}</div>
        <div class="cm-hint">英文をタップすると、その文だけ聞き直せます</div>
        <button class="btn-primary" id="cm-topic-next">次へ ▶</button>
      </div>`;
    $$('#commute-body [data-sentence]').forEach(b => {
      b.onclick = () => { Speech.stop(); Speech.say(it.sentences[+b.dataset.sentence], 0.86); };
    });
    $('#cm-topic-next').onclick = () => { Speech.stop(); this.clearTimers(); this._tIdx++; this.showTopic(); };
    Store.addXp(5);
    Speech.chain(it.sentences, 0.82);
  },

  /* ---------- ①今日の文法 ----------
     要点を読んで、例文を耳で受ける。読み終えたら app.js 側の grammarRead に記録され、
     「学習の道すじ」の進捗と文法講座のチェックが同時に進む。 */
  runGrammar(n) {
    this._gItems = this.pickGrammar(n);
    this._gIdx = 0;
    this.showGrammar();
  },

  showGrammar() {
    this.clearTimers();
    if (this._gIdx >= this._gItems.length) return this.nextStage();
    this.planDone++; this.updateBar();

    const g = this._gItems[this._gIdx];
    const step = (GRAMMAR_STEPS.find(s => s.n === g.step) || {}).title || '';
    const read = (Store.d.grammarRead || []).includes(g.id);
    $('#commute-stage-label').textContent = `今日の文法 ${this._gIdx + 1}/${this._gItems.length}`;

    $('#commute-body').innerHTML = `
      <div class="cm-stage cm-gram">
        <div class="cm-cat">STEP ${g.step} · ${esc(step)}${read ? ' · 復習' : ''}</div>
        <div class="cmg-title">${esc(g.titleJa)}</div>
        <div class="cmg-en">${esc(g.title)}</div>

        <div class="cmg-why">${g.why}</div>

        <ul class="cmg-rules">
          ${g.rules.map(r => `<li>${r}</li>`).join('')}
        </ul>

        <div class="cmg-exs">
          ${g.ex.slice(0, 2).map((e, i) => `
            <div class="cmg-ex" data-ex="${i}">
              <div class="cmge-en">${esc(e.en)}</div>
              <div class="cmge-ja">${esc(e.ja)}</div>
              ${e.note ? `<div class="cmge-note">${esc(e.note)}</div>` : ''}
            </div>`).join('')}
        </div>

        ${g.trap && g.trap.length ? `
          <div class="cmg-trap">
            <div class="gt-bad">✕ ${esc(g.trap[0].bad)}</div>
            <div class="gt-good">○ ${esc(g.trap[0].good)}</div>
          </div>` : ''}

        <div class="cm-hint">例文が読み上げられます。声に出せる場所なら真似してみてください</div>
        <button class="btn-primary" id="cm-gnext">わかった ▶</button>
      </div>`;

    /* 例文をタップすると聞き直せる */
    $$('#commute-body .cmg-ex').forEach(el => {
      el.onclick = () => Speech.say(g.ex[+el.dataset.ex].en, 0.85);
    });

    const advance = () => {
      const list = Store.d.grammarRead || (Store.d.grammarRead = []);
      const i = list.indexOf(g.id);
      if (i >= 0) { list.splice(i, 1); Store.addXp(4); }   /* 既読 → 末尾へ回して復習の順番を下げる */
      else Store.addXp(20);
      list.push(g.id);
      Store.save();
      this._gIdx++;
      this.showGrammar();
    };
    $('#cm-gnext').onclick = () => { Speech.stop(); this.clearTimers(); advance(); };

    /* 例文は続けて読むが、次の項目へはボタン操作でのみ進む。 */
    const lines = g.ex.slice(0, 2).map(e => e.en);
    Speech.chain(lines, 0.82);
  },

  /* ---------- ②精読 ----------
     文をかたまりに割って、部分ごとに聞く。app.js の Parse と同じデータを使う。 */
  runParse(n) {
    this._pItems = this.pickParseSentences(n);
    this._pIdx = 0;
    this.showParse();
  },

  showParse() {
    this.clearTimers();
    if (this._pIdx >= this._pItems.length) return this.nextStage();
    this.planDone++; this.updateBar();

    const sentence = this._pItems[this._pIdx];
    const p = PARSE[sentence];
    if (!p) { this._pIdx++; return this.showParse(); }

    $('#commute-stage-label').textContent = `精読 ${this._pIdx + 1}/${this._pItems.length}`;

    $('#commute-body').innerHTML = `
      <div class="cm-stage cm-parse">
        <div class="cm-cat">かたまりで捉える</div>
        <div class="cmp-en">${esc(sentence)}</div>

        <div class="p-chunks cmp-chunks">
          ${p.chunks.map((c, i) => {
            const r = ROLE_INFO[c.role] || ROLE_INFO.M;
            return `
            <button class="pc" data-i="${i}" style="--rc:${r.c}">
              <span class="pc-role">${r.short}</span>
              <span class="pc-en">${esc(c.t)}</span>
              <span class="pc-ja">${esc(c.ja)}</span>
            </button>`;
          }).join('<span class="pc-sep">›</span>')}
        </div>

        <div class="cmp-point">${p.point}</div>

        <div class="cm-hint">かたまりをタップすると、その部分だけ聞けます</div>
        <button class="btn-primary" id="cm-pnext">次へ ▶</button>
      </div>`;

    $$('#commute-body .pc').forEach(b => {
      b.onclick = () => {
        const c = p.chunks[+b.dataset.i];
        b.classList.add('hit');
        setTimeout(() => b.classList.remove('hit'), 700);
        Speech.say(c.t, 0.7);
      };
    });

    const advance = () => {
      const seen = Store.d.parseRead || (Store.d.parseRead = []);
      const i = seen.indexOf(sentence);
      if (i >= 0) { seen.splice(i, 1); Store.addXp(2); }    /* 既読 → 末尾へ回す */
      else Store.addXp(8);
      seen.push(sentence);
      Store.save();
      this._pIdx++;
      this.showParse();
    };
    $('#cm-pnext').onclick = () => { Speech.stop(); this.clearTimers(); advance(); };

    /* 通しで1回 → かたまりごとに1回 → 通しでもう1回。遷移はボタンのみ。 */
    Speech.say(sentence, 0.82, () => {
      this.after(600, () => {
        Speech.chain(p.chunks.map(c => c.t), 0.68, () => {
          this.after(500, () => Speech.say(sentence, 0.9));
        });
      });
    });
  },

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
    Speech.say(it.en, 0.72, () => this.after(500, () => Speech.say(it.en, 1.0)));
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
        ${it.setup ? `<div class="cm-setup">${esc(it.setup)}</div>` : ''}
        ${it.partner ? `<div class="cm-partner"><span>相手</span><b>${esc(it.partner)}</b><small>${esc(it.partnerJa || '')}</small></div>` : ''}
        <div class="cm-cue">${esc(it.cueJa)}</div>
        <div class="cm-hint">頭の中で（小声でもOK）英語にしてみてください</div>
        <button class="btn-primary" id="cm-reveal2">お手本を見る</button>
      </div>`;
    $('#cm-reveal2').onclick = () => this.revealDrill();
    if (it.partner) Speech.say(it.partner, 0.9);
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
        <div class="cm-speaker">あなた</div>
        <div class="cm-en">${esc(it.en)}</div>
        <div class="cm-ja">${esc(it.ja)}</div>
        ${it.note ? `<div class="cm-note">${esc(it.note)}</div>` : ''}
        ${it.reply ? `<div class="cm-partner cm-partner-reply"><span>相手の返し</span><b>${esc(it.reply)}</b><small>${esc(it.replyJa || '')}</small></div>` : ''}
      </div>`);
    Store.addXp(3);
    const readyNext = () => {
      if ($('#cm-drill-next')) return;
      body.insertAdjacentHTML('beforeend', `<button class="btn-ghost small" id="cm-drill-next">次へ ▶</button>`);
      const nb = $('#cm-drill-next');
      if (nb) nb.onclick = () => { this._dIdx++; this.showDrill(); };
    };
    readyNext();
    Speech.say(it.en, 0.85, () => {
      if (it.reply) this.after(450, () => Speech.say(it.reply, 0.9, readyNext));
    });
  },

  /* ---------- 4) 仕上げクイズ（q() / shuffleWith() は app.js のものを再利用） ---------- */
  runQuiz(n) {
    let items;
    if (this.mode === 'quick') {
      const ranked = [...DRILLS].sort((a, b) => {
        const ar = Store.d.quiz['commuteq:' + a.en] || { ok: 0, ng: 0 };
        const br = Store.d.quiz['commuteq:' + b.en] || { ok: 0, ng: 0 };
        return (br.ng * 3 - br.ok) - (ar.ng * 3 - ar.ok);
      });
      const weak = ranked.filter(x => (Store.d.quiz['commuteq:' + x.en] || {}).ng).slice(0, n);
      items = [...weak, ...pickFresh(ranked.filter(x => !weak.includes(x)), 'commuteq', x => x.en, n - weak.length)];
    } else {
      items = pickFresh(DRILLS, 'commuteq', x => x.en, n);
    }
    this._qItems = items.map(d => {
      const others = sample(DRILLS.filter(x => x.en !== d.en), Math.min(3, DRILLS.length - 1));
      return q({
        kind: '通勤 · ' + COMMUTE_CATS[d.cat].ja,
        text: d.partnerJa ? `相手「${d.partnerJa}」\n${d.cueJa}` : d.cueJa, small: true, sub: '英語でどう返す？',
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
    this._qLocked = false;
    $('#commute-stage-label').textContent = `仕上げクイズ ${this._qIdx + 1}/${this._qItems.length}`;
    $('#commute-body').innerHTML = `
      <div class="cm-stage">
        <div class="q-kind">${esc(it.kind)}</div>
        <div class="q-text${it.small ? ' small' : ''}">${esc(it.text)}</div>
        ${it.sub ? `<div class="q-sub">${esc(it.sub)}</div>` : ''}
        ${it.promptAudio && Speech.hasNatural(it.promptAudio) ? `<button class="q-say" id="cm-q-say">🔊 <span>自然音声で問題を聞く</span></button>` : ''}
        <div class="q-choices">${it.choices.map((c, i) => `<button class="q-choice" data-n="${i}">${esc(c)}</button>`).join('')}</div>
      </div>`;
    if (it.promptAudio && Speech.hasNatural(it.promptAudio)) $('#cm-q-say').onclick = () => sayFrom($('#cm-q-say'), it.promptAudio, 0.88);
    $$('#commute-body .q-choice').forEach(b => { b.onclick = () => this.answerQuiz(+b.dataset.n); });
  },
  answerQuiz(n) {
    if (this._qLocked) return;
    this._qLocked = true;
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
    const note = document.createElement('div');
    note.className = 'q-note';
    note.innerHTML = (ok ? '<b>正解</b><br>' : '<b>不正解</b><br>') + it.note;
    $('#commute-body .cm-stage').appendChild(note);

    if (it.answerAudio && Speech.hasNatural(it.answerAudio)) {
      const audio = document.createElement('button');
      audio.className = 'q-say';
      audio.innerHTML = '🔊 <span>答えの音声を聞く</span>';
      audio.onclick = () => sayFrom(audio, it.answerAudio, 0.85);
      $('#commute-body .cm-stage').appendChild(audio);
    }

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
    try { localStorage.removeItem('bars-words-session'); } catch (e) {}
    Store.save();
    this._lastSummary = {
      items: this.planTotal,
      quizCorrect: this._quizCorrectTotal || 0,
      quizTotal: this._quizTotalAll || 0,
      xp: bonus,
      /* 今日どこまで進んだか */
      grammar: (this._gItems || []).map(g => g.titleJa),
      parseCount: (this._pItems || []).length,
      grammarDone: (Store.d.grammarRead || []).length,
      grammarTotal: typeof GRAMMAR !== 'undefined' ? GRAMMAR.length : 0,
      mode: this.mode,
    };
    Store.recordLearningSession({ mode: this.mode, minutes: this.minutes, lessons: this.planDone });
    Nav.go('commute');
    this.renderSetup(true);
    Home.render();
  },
};

document.addEventListener('DOMContentLoaded', () => {
  const cta = $('#commute-cta-btn');
  if (cta) cta.onclick = () => { Nav.go('commute'); Commute.renderSetup(false); };

  const today = $('#today-start-btn');
  if (today) today.onclick = () => Commute.start(+(today.dataset.minutes || 10), 'commute');
  $$('.start-times [data-start-min]').forEach(b => {
    b.onclick = () => {
      $$('.start-times [data-start-min]').forEach(x => x.classList.toggle('on', x === b));
      if (today) { today.dataset.minutes = b.dataset.startMin; today.querySelector('small').textContent = `通勤${b.dataset.startMin}分 · 内容はおまかせ`; }
    };
  });
  const quick = $('#quick-start-btn');
  if (quick) quick.onclick = () => Commute.start(5, 'quick');
  const resume = $('#resume-start-btn');
  if (resume) resume.onclick = () => Commute.resume();
  Commute.updateResumeButton();

  $$('.speech-rates [data-rate]').forEach(b => {
    b.onclick = () => {
      Speech.setRate(+b.dataset.rate);
      $$('.speech-rates [data-rate]').forEach(x => x.classList.toggle('on', x === b));
      const state = $('#speech-state'); if (state) state.textContent = `🔊 速度 ${b.dataset.rate}倍`;
    };
  });
  document.addEventListener('speech-state', e => {
    const el = $('#speech-state'); if (!el) return;
    const d = e.detail || {};
    el.className = d.state === 'error' && d.error ? 'error' : '';
    el.textContent = d.state === 'loading' ? '◌ 音声を読み込み中' : d.state === 'playing' ? '🔊 再生中' : d.state === 'error' && d.error ? `⚠ ${d.error}` : '🔊 再生準備OK';
  });

  const quit = $('#commute-quit');
  if (quit) quit.onclick = () => {
    Speech.stop(); Commute.clearTimers(); Commute.saveSession();
    if (typeof RealtimePractice !== 'undefined') RealtimePractice.abort();
    Nav.go('home');
  };
});
