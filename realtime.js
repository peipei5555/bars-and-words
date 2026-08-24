/* ともやの家 — 学んだ英文を使う2分間のRealtime音声実践 */
'use strict';

const REALTIME_MAX_SECONDS = 120;
const REALTIME_MODEL = 'gpt-realtime-2.1-mini';
const REALTIME_CLIENT_KEY = 'bars-words-realtime-client';

function realtimeFeedback(text, lesson) {
  const fallback = {
    understood: '学んだ英文を使って会話を最後まで続けました。',
    oneFix: '次は、短い文を一つずつはっきり言ってみましょう。',
    review: lesson?.sentences?.[0]?.en || '',
  };
  if (!text) return fallback;
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    const parsed = JSON.parse(text.slice(start, end + 1));
    return {
      understood: String(parsed.understood || fallback.understood),
      oneFix: String(parsed.oneFix || fallback.oneFix),
      review: String(parsed.review || fallback.review),
    };
  } catch (e) { return fallback; }
}

const RealtimePractice = {
  pc: null,
  dc: null,
  stream: null,
  audio: null,
  timer: null,
  deadlineTimer: null,
  startedAt: 0,
  deadlineAt: 0,
  historyId: '',
  lesson: null,
  onDone: null,
  textBuffer: '',
  stopping: false,

  isMock() {
    return ['127.0.0.1', 'localhost'].includes(location.hostname)
      && new URLSearchParams(location.search).get('realtime-mock') === '1';
  },

  endpoint() {
    if (typeof window.REALTIME_SESSION_ENDPOINT === 'string') return window.REALTIME_SESSION_ENDPOINT;
    return ['127.0.0.1', 'localhost'].includes(location.hostname) ? '/api/realtime/session' : '';
  },

  clientId() {
    let id = '';
    try { id = localStorage.getItem(REALTIME_CLIENT_KEY) || ''; } catch (e) {}
    if (!id) {
      id = globalThis.crypto?.randomUUID?.() || `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      try { localStorage.setItem(REALTIME_CLIENT_KEY, id); } catch (e) {}
    }
    return id;
  },

  offer(lesson, onDone) {
    this.closeTransport();
    this.lesson = lesson;
    this.onDone = onDone;
    this.stopping = false;
    const used = Store.realtimeUsedToday();
    const endpoint = this.endpoint();
    $('#commute-stage-label').textContent = '2分会話（任意）';
    $('#commute-body').innerHTML = `
      <div class="cm-stage voice-card">
        <div class="voice-kicker">VOICE PRACTICE · 1日1回</div>
        <h2>今日の3文で、2分だけ話す</h2>
        <p class="voice-lead">話題は「${esc(lesson.titleJa)}」。詰まった時は日本語で短く助けます。</p>
        <div class="voice-lines">${lesson.sentences.map(x => `<span>${esc(x.en)}</span>`).join('')}</div>
        <div class="voice-notice"><b>開始するとOpenAI APIの残高を使います</b><small>最大2分・今日は1回。自動では始まりません。音声自体は保存しません。</small></div>
        ${used ? `<div class="voice-unavailable">今日はすでに実践済みです。明日また使えます。</div>` : !endpoint ? `<div class="voice-unavailable">公開版では音声会話はまだ使えません。APIキーを守れるローカル版でのみ利用できます。</div>` : ''}
        <div class="voice-actions">
          ${!used && endpoint ? `<button class="btn-primary" id="voice-start">マイクを許可して開始</button>` : ''}
          <button class="btn-ghost" id="voice-skip">${used || !endpoint ? '学習を完了する' : '今日は使わない'}</button>
        </div>
        <div class="voice-state" id="voice-state" aria-live="polite"></div>
      </div>`;
    $('#voice-skip').onclick = () => this.finishStage();
    const start = $('#voice-start');
    if (start) start.onclick = () => { start.disabled = true; this.start().catch(error => this.showError(error)); };
  },

  async start() {
    if (Store.realtimeUsedToday()) throw new Error('今日はすでに音声実践を行っています。');
    this.setState('接続を準備しています…');
    if (this.isMock()) return this.startMock();
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === 'undefined') {
      throw new Error('このブラウザは音声会話に対応していません。');
    }

    const pc = new RTCPeerConnection();
    this.pc = pc;
    this.audio = document.createElement('audio');
    this.audio.autoplay = true;
    this.audio.setAttribute('aria-hidden', 'true');
    pc.ontrack = event => { this.audio.srcObject = event.streams[0]; };

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.stream.getTracks().forEach(track => pc.addTrack(track, this.stream));
    const dc = pc.createDataChannel('oai-events');
    this.dc = dc;
    dc.addEventListener('message', event => this.onEvent(event));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const response = await fetch(this.endpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
        'X-Lesson-Id': this.lesson.id,
        'X-Realtime-Client': this.clientId(),
      },
      body: offer.sdp,
    });
    if (!response.ok) {
      let message = `接続できませんでした（${response.status}）`;
      try { message = (await response.json()).error || message; } catch (e) {}
      throw new Error(message);
    }
    const serverDeadline = Number(response.headers.get('X-Realtime-Expires-At')) || 0;
    await pc.setRemoteDescription({ type: 'answer', sdp: await response.text() });
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('接続がタイムアウトしました。')), 10000);
      dc.addEventListener('open', () => { clearTimeout(timeout); resolve(); }, { once: true });
      dc.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('会話用の接続を開けませんでした。')); }, { once: true });
    });
    this.beginConnected(serverDeadline);
    this.send({ type: 'response.create', response: { output_modalities: ['audio'], instructions: 'Begin now with one short, friendly English question about today’s lesson.' } });
  },

  startMock() {
    this.beginConnected();
    this.setState('無音モックで接続中（音声・API・マイクは使っていません）');
  },

  beginConnected(serverDeadline = 0) {
    this.startedAt = Date.now();
    this.deadlineAt = Math.min(this.startedAt + REALTIME_MAX_SECONDS * 1000, serverDeadline || Infinity);
    this.historyId = Store.startRealtimeSession(this.lesson.id);
    this.renderLive();
    this.updateTimer();
    this.timer = setInterval(() => this.updateTimer(), 1000);
    this.deadlineTimer = setTimeout(() => this.stop(), Math.max(0, this.deadlineAt - Date.now()));
  },

  renderLive() {
    $('#commute-body').innerHTML = `
      <div class="cm-stage voice-card voice-live">
        <div class="voice-kicker">VOICE PRACTICE · ${esc(REALTIME_MODEL)}</div>
        <div class="voice-timer" id="voice-timer">2:00</div>
        <h2>短くてOK。英語で返してみる</h2>
        <div class="voice-lines">${this.lesson.sentences.map(x => `<span>${esc(x.en)}</span>`).join('')}</div>
        <p class="voice-help">困ったら「日本語でヒント」と言ってOKです。</p>
        <button class="btn-primary voice-stop" id="voice-stop">終了して振り返る</button>
        <div class="voice-state" id="voice-state" aria-live="polite">接続中</div>
      </div>`;
    $('#voice-stop').onclick = () => this.stop();
  },

  updateTimer() {
    const left = Math.max(0, Math.ceil((this.deadlineAt - Date.now()) / 1000));
    const el = $('#voice-timer');
    if (el) el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    if (!left && !this.stopping) this.stop();
  },

  onEvent(event) {
    let data;
    try { data = JSON.parse(event.data); } catch (e) { return; }
    if (data.type === 'response.output_text.delta') this.textBuffer += data.delta || '';
    if (data.type === 'response.output_text.done' && data.text) this.textBuffer += data.text;
    if (data.type === 'error') this.setState(`会話エラー: ${data.error?.message || '不明なエラー'}`, true);
  },

  send(data) {
    if (this.dc?.readyState === 'open') this.dc.send(JSON.stringify(data));
  },

  async stop() {
    if (this.stopping) return;
    this.stopping = true;
    clearInterval(this.timer); clearTimeout(this.deadlineTimer);
    this.stream?.getTracks().forEach(track => { track.enabled = false; });
    this.setState('振り返りを作っています…');
    if (!this.isMock() && this.dc?.readyState === 'open') {
      this.textBuffer = '';
      this.send({
        type: 'response.create',
        response: {
          output_modalities: ['text'],
          instructions: 'Return only JSON in Japanese: {"understood":"通じた点","oneFix":"直す一点","review":"復習する英語1文"}. Be kind and concise. Do not add markdown.',
        },
      });
      await new Promise(resolve => setTimeout(resolve, 3500));
    }
    const feedback = realtimeFeedback(this.textBuffer, this.lesson);
    const durationSeconds = Math.min(REALTIME_MAX_SECONDS, Math.round((Date.now() - this.startedAt) / 1000));
    Store.finishRealtimeSession(this.historyId, { durationSeconds, feedback });
    this.historyId = '';
    this.closeTransport();
    this.renderFeedback(feedback, durationSeconds);
  },

  renderFeedback(feedback, seconds) {
    $('#commute-body').innerHTML = `
      <div class="cm-stage voice-card voice-result">
        <div class="voice-kicker">${seconds}秒の実践を記録しました</div>
        <h2>今日の振り返り</h2>
        <div class="voice-feedback"><span>通じた点</span><p>${esc(feedback.understood)}</p></div>
        <div class="voice-feedback"><span>直す一点</span><p>${esc(feedback.oneFix)}</p></div>
        <div class="voice-feedback"><span>復習候補</span><p lang="en">${esc(feedback.review)}</p></div>
        <button class="btn-primary" id="voice-done">今日の学習を完了する</button>
      </div>`;
    $('#voice-done').onclick = () => this.finishStage();
  },

  showError(error) {
    this.closeTransport();
    const el = $('#voice-state');
    if (el) { el.textContent = `⚠ ${error?.message || '接続できませんでした。'}`; el.classList.add('error'); }
    const button = $('#voice-start');
    if (button) button.disabled = false;
  },

  setState(text, error = false) {
    const el = $('#voice-state');
    if (el) { el.textContent = text; el.classList.toggle('error', error); }
  },

  closeTransport() {
    clearInterval(this.timer); clearTimeout(this.deadlineTimer);
    this.timer = null; this.deadlineTimer = null;
    this.stream?.getTracks().forEach(track => track.stop());
    try { this.dc?.close(); } catch (e) {}
    try { this.pc?.close(); } catch (e) {}
    if (this.audio) this.audio.srcObject = null;
    this.pc = null; this.dc = null; this.stream = null; this.audio = null;
  },

  abort() {
    if (this.historyId && this.startedAt) {
      Store.finishRealtimeSession(this.historyId, {
        durationSeconds: Math.min(REALTIME_MAX_SECONDS, Math.round((Date.now() - this.startedAt) / 1000)),
        feedback: {},
      });
      this.historyId = '';
    }
    this.closeTransport();
  },

  finishStage() {
    this.closeTransport();
    const done = this.onDone;
    this.onDone = null;
    if (done) done();
  },
};

addEventListener('beforeunload', () => RealtimePractice.abort());
