/* ===========================================================
   BGM — ビートをその場で合成する（Web Audio API）
   ・音源ファイルを一切持たない。すべて波形から作るので 0 バイト・圏外でも鳴る
   ・歌詞がないので学習の邪魔をしない
   ・時代ごとにビートが変わる（読んでいる時代の音が流れる）
   ・読み上げ中は自動で音量を下げ、終わったら戻す
   =========================================================== */

'use strict';

/* -----------------------------------------------------------
   パターン定義
   16分音符 × 16 ステップ = 1小節。1 が発音。
   bass は音名（null は休符）。オクターブは低め固定。
   ----------------------------------------------------------- */
const NOTE = { C: 32.70, D: 36.71, Eb: 38.89, E: 41.20, F: 43.65,
               G: 49.00, Ab: 51.91, A: 55.00, Bb: 58.27, B: 61.74 };

const BEATS = {
  /* 70〜80年代：ファンクのブレイク */
  funk: {
    name: 'Funk Break', bpm: 98, swing: .14, era: '1973–1983',
    about: {
      ja: 'ヒップホップの原型。曲そのものではなく、ファンクのレコードの「歌が入らないドラムだけの部分」を2枚使いで延々と繰り返した。生ドラムなので、人が叩いた揺れ（スイング）が残っているのが最大の特徴。',
      ear: '4つ打ちではなく、キックが3拍目の裏で跳ねる。ハイハットが8分で細かく刻み続ける。',
      makers: ['DJ Kool Herc', 'Grandmaster Flash', 'Afrika Bambaataa'],
      tracks: ['The Incredible Bongo Band — Apache', 'James Brown — Funky Drummer'],
      term: { en: 'break', ja: 'ブレイク（歌の入らないドラムだけの部分）' },
    },
    kick:  [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
    hat:   [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    open:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0],
    bass:  ['E',null,null,'E', null,null,'G',null, 'A',null,null,null, 'E',null,null,null],
    tone: { kickHi: 160, kickLo: 48, bassDecay: .34, hatGain: .22 },
  },

  /* 80年代後半：削ぎ落とした硬いドラム */
  hard: {
    name: '808 Hard', bpm: 104, swing: 0, era: '1983–1988',
    about: {
      ja: 'ドラムマシン（Roland TR-808）で組んだ、無駄を全部削いだ音。生演奏をやめて機械にしたので、揺れが消えて硬く直線的になった。Run-DMCがバンドを外し、ドラムと声だけで成立させた時代の音。',
      ear: 'スイングがゼロ。音数が極端に少なく、隙間が多い。スネアが痛いほど硬い。',
      makers: ['Rick Rubin', 'Run-DMC', 'LL Cool J'],
      tracks: ['Run-DMC — Walk This Way', 'LL Cool J — Rock the Bells'],
      term: { en: 'drum machine', ja: 'ドラムマシン（自動でリズムを鳴らす機械）' },
    },
    kick:  [1,0,0,0, 0,0,0,0, 1,0,0,1, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hat:   [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
    open:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,1],
    bass:  ['A',null,null,null, null,null,null,null, 'A',null,null,'G', null,null,null,null],
    tone: { kickHi: 190, kickLo: 42, bassDecay: .42, hatGain: .18 },
  },

  /* 90年代：ブーンバップ */
  boombap: {
    name: 'Boom Bap', bpm: 92, swing: .16, era: '1988–1996',
    about: {
      ja: '黄金期の音。名前は「ブーン（キック）」「バップ（スネア）」という擬音から。サンプラーで切り刻んだ生ドラムを、あえて少しヨレたまま並べる。そのヨレが人間っぽさを生む。90年代のニューヨークの音そのもの。',
      ear: 'キックが太く低く、スネアが乾いて鋭い。スイングが強く、16分がわずかに後ろへ引っ張られる。',
      makers: ['DJ Premier', 'Pete Rock', 'RZA', 'Q-Tip', 'J Dilla'],
      tracks: ['Nas — N.Y. State of Mind', 'Gang Starr — Mass Appeal', 'Wu-Tang Clan — C.R.E.A.M.'],
      term: { en: 'boom bap', ja: 'ブーンバップ（太いキックと鋭いスネアの90s的な音）' },
    },
    kick:  [1,0,0,0, 0,0,1,0, 0,0,0,0, 0,1,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hat:   [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1],
    open:  [0,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
    bass:  ['C',null,null,null, 'C',null,null,'Eb', 'F',null,null,null, 'G',null,'F',null],
    tone: { kickHi: 150, kickLo: 46, bassDecay: .38, hatGain: .20 },
  },

  /* 西海岸：Gファンク。高いシンセが鳴く */
  gfunk: {
    name: 'G-Funk', bpm: 94, swing: .08, era: '1988–1996 West',
    about: {
      ja: 'Dr. Dreが組み立てたロサンゼルスの音。70年代のPファンク（Parliament / Funkadelic）を下敷きに、遅いテンポ・太いベース・高く鳴くシンセを乗せた。窓を開けて運転するための音楽で、東海岸の密で速い音とは正反対。',
      ear: '高い音域で「ピーヒョロロ」と鳴き続けるシンセ。ベースが歌うように動く。テンポが遅く空間が広い。',
      makers: ['Dr. Dre', 'Warren G', 'DJ Quik'],
      tracks: ['Dr. Dre — Nuthin but a G Thang', 'Warren G — Regulate'],
      term: { en: 'synth', ja: 'シンセサイザー（電子音）' },
    },
    kick:  [1,0,0,0, 0,0,0,1, 0,0,1,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hat:   [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    open:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0],
    bass:  ['G',null,'G',null, null,null,'Bb',null, 'C',null,null,null, 'Bb',null,'G',null],
    lead:  [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],   /* 高いシンセ */
    tone: { kickHi: 145, kickLo: 44, bassDecay: .45, hatGain: .16, leadFreq: 880 },
  },

  /* 南部〜メインストリーム：ゆったり重い */
  south: {
    name: 'Dirty South', bpm: 76, swing: .10, era: '1994–2009',
    about: {
      ja: 'アトランタ・ヒューストン・メンフィスの音。ニューヨークにもLAにも従わず、各都市が独自に作った。ヒューストンは曲を極端に遅くする「chopped and screwed」、メンフィスは暗く粗い音。この層からトラップが生まれた。',
      ear: 'テンポが遅く、体を揺らす感じ。ハイハットが所々で細かく詰まる。低音が重い。',
      makers: ['Organized Noize', 'Mannie Fresh', 'DJ Screw', 'Three 6 Mafia'],
      tracks: ['OutKast — Ms. Jackson', 'UGK — Int\'l Players Anthem'],
      term: { en: 'chopped and screwed', ja: '曲を極端に遅くして刻む手法' },
    },
    kick:  [1,0,0,0, 0,0,1,0, 0,1,0,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hat:   [1,0,1,1, 1,0,1,0, 1,0,1,1, 1,0,1,0],
    open:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,1],
    bass:  ['D',null,null,null, null,null,'D',null, 'F',null,null,null, 'C',null,null,null],
    tone: { kickHi: 130, kickLo: 38, bassDecay: .60, hatGain: .17 },
  },

  /* トラップ：808 と刻むハイハット */
  trap: {
    name: 'Trap', bpm: 70, swing: 0, era: '2010–2020',
    about: {
      ja: '2010年代に世界のポップスを飲み込んだ音。特徴は3つ——長く伸びる808のベース、細かく刻むハイハットのロール、そしてスネアがほとんど鳴らないこと。K-POPからCMまで、いま世界中で鳴っているのはこの構造。',
      ear: 'ハイハットが3連符で「タタタタ」と走る。ベースが音程を持って長く伸びる。スネアは1小節に1回だけ。',
      makers: ['Metro Boomin', 'Zaytoven', 'Lex Luger', 'Southside'],
      tracks: ['Migos — Bad and Boujee', 'Future — Mask Off'],
      term: { en: '808', ja: '808（太く長く伸びる低音。ドラムマシンの名前から）' },
    },
    kick:  [1,0,0,0, 0,0,1,0, 0,0,0,1, 0,0,0,0],
    snare: [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    hat:   [1,0,1,0, 1,1,1,0, 1,0,1,0, 1,1,1,1],
    roll:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,1],   /* 3連ロール */
    bass:  ['F',null,null,null, null,null,'F',null, null,null,null,'Ab', null,null,null,null],
    tone: { kickHi: 120, kickLo: 34, bassDecay: .95, hatGain: .15, sub: true },
  },

  /* ドリル：滑る808 */
  drill: {
    name: 'Drill', bpm: 72, swing: 0, era: '2012–now',
    about: {
      ja: '2012年頃のシカゴで生まれ、ロンドンが作り替えた音。UKドリルの決定的な特徴は「滑る808」——ベースが音程を変えながらズルッと動く。冷たく、そっけない。英語学習者にはUKドリルが有用で、アメリカ英語とは違う訛りを聴き取る訓練になる。',
      ear: 'ベースが音を伸ばしながら下へ滑る（スライド）。ドラムが跳ねて転がる。全体が暗く冷たい。',
      makers: ['Chief Keef', 'Central Cee', 'Pop Smoke', '808Melo'],
      tracks: ['Central Cee — Doja', 'Pop Smoke — Dior'],
      term: { en: 'blunt', ja: 'そっけない、率直な' },
    },
    kick:  [1,0,0,0, 0,0,0,1, 0,0,1,0, 0,0,0,0],
    snare: [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,1,0],
    hat:   [1,0,1,1, 0,1,1,0, 1,0,1,1, 0,1,1,0],
    roll:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,1,1,1],
    bass:  ['G',null,null,null, null,null,'F',null, 'Eb',null,null,null, null,null,null,null],
    tone: { kickHi: 115, kickLo: 30, bassDecay: 1.05, hatGain: .14, sub: true, slide: true },
  },

  /* ネオソウル：柔らかく、聴き取りやすい */
  soul: {
    name: 'Neo-Soul', bpm: 84, swing: .20, era: 'offshoots',
    about: {
      ja: '90年代後半、生演奏とヒップホップのドラムを同時に鳴らした層。わざとタイミングをずらして「よれた」感じを作るのが肝で、J Dillaの手法として知られる。テンポが遅く発音が明瞭なので、リスニング練習はここから始めるのが一番入りやすい。',
      ear: 'スイングが一番強く、拍が前後によれる。音が柔らかく、角が丸い。スネアが引っ込んでいる。',
      makers: ['J Dilla', "D'Angelo", 'Erykah Badu', 'Robert Glasper'],
      tracks: ["D'Angelo — Untitled", 'Erykah Badu — On & On', 'Anderson .Paak — Come Down'],
      term: { en: 'live musicians', ja: '生演奏の演奏者' },
    },
    kick:  [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hat:   [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    open:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0],
    bass:  ['A',null,null,'C', 'E',null,null,null, 'D',null,null,null, 'E',null,'D',null],
    lead:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,0,0],
    tone: { kickHi: 140, kickLo: 50, bassDecay: .50, hatGain: .13, leadFreq: 523, soft: true },
  },
};

/* 時代 → ビート の割り当て */
const ERA_BEAT = {
  origins: 'funk', oldschool: 'funk', newschool: 'hard',
  golden: 'boombap', westcoast: 'gfunk', south: 'south',
  mainstream: 'south', trap: 'trap', global: 'drill', offshoots: 'soul',
};

/* -----------------------------------------------------------
   合成エンジン
   ----------------------------------------------------------- */
const Beat = {
  ctx: null, master: null, noise: null,
  playing: false,
  key: 'boombap',
  vol: 0.34,
  enabled: false,
  _timer: null, _step: 0, _next: 0, _ducked: false,

  /* iOS は画面を触ったあとでないと音が出せない */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    this.ctx = new AC();

    this.master = this.ctx.createGain();
    this.master.gain.value = this.vol;

    /* 少し丸めて、耳に刺さらないようにする */
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 12000;
    this.master.connect(lp);
    lp.connect(this.ctx.destination);

    /* ノイズは1秒ぶん作って使い回す */
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    return true;
  },

  /* ---- 音のパーツ ---- */
  kick(t, tone) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(tone.kickHi, t);
    o.frequency.exponentialRampToValueAtTime(tone.kickLo, t + .09);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + .004);
    g.gain.exponentialRampToValueAtTime(.001, t + .34);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + .36);
  },

  snare(t, tone) {
    /* 胴の音 */
    const o = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(185, t);
    o.frequency.exponentialRampToValueAtTime(120, t + .08);
    og.gain.setValueAtTime(.5, t);
    og.gain.exponentialRampToValueAtTime(.001, t + .13);
    o.connect(og); og.connect(this.master);
    o.start(t); o.stop(t + .15);

    /* 響き線 */
    const n = this.ctx.createBufferSource();
    n.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = tone.soft ? 1600 : 2100;
    f.Q.value = .8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(tone.soft ? .32 : .5, t);
    g.gain.exponentialRampToValueAtTime(.001, t + (tone.soft ? .12 : .17));
    n.connect(f); f.connect(g); g.connect(this.master);
    n.start(t); n.stop(t + .2);
  },

  hat(t, tone, open) {
    const n = this.ctx.createBufferSource();
    n.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 8200;
    const g = this.ctx.createGain();
    const dur = open ? .22 : .035;
    g.gain.setValueAtTime(tone.hatGain * (open ? 1.15 : 1), t);
    g.gain.exponentialRampToValueAtTime(.001, t + dur);
    n.connect(f); f.connect(g); g.connect(this.master);
    n.start(t); n.stop(t + dur + .02);
  },

  bassNote(t, name, tone, nextName) {
    const base = NOTE[name];
    if (!base) return;
    const freq = base * (tone.sub ? 1 : 2);   /* 808 系は1オクターブ下 */

    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = tone.sub ? 'sine' : 'triangle';
    o.frequency.setValueAtTime(freq, t);

    /* ドリルの滑る808 */
    if (tone.slide && nextName && NOTE[nextName]) {
      o.frequency.exponentialRampToValueAtTime(
        NOTE[nextName] * (tone.sub ? 1 : 2), t + tone.bassDecay * .9);
    }

    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(.42, t + .012);
    g.gain.exponentialRampToValueAtTime(.001, t + tone.bassDecay);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + tone.bassDecay + .05);
  },

  lead(t, tone) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(tone.leadFreq, t);
    o.frequency.linearRampToValueAtTime(tone.leadFreq * 1.02, t + .5);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2600, t);
    f.frequency.exponentialRampToValueAtTime(700, t + .55);
    f.Q.value = 6;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(.11, t + .04);
    g.gain.exponentialRampToValueAtTime(.001, t + .6);
    o.connect(f); f.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + .65);
  },

  /* ---- 進行 ---- */
  schedule() {
    const p = BEATS[this.key];
    const spb = 60 / p.bpm;
    const stepDur = spb / 4;                       /* 16分 */

    while (this._next < this.ctx.currentTime + 0.18) {
      const s = this._step % 16;
      /* スイング：偶数番目の16分を後ろにずらす */
      const sw = (s % 2 === 1) ? stepDur * (p.swing || 0) : 0;
      const t = this._next + sw;
      const tone = p.tone;

      if (p.kick[s])  this.kick(t, tone);
      if (p.snare[s]) this.snare(t, tone);
      if (p.hat[s])   this.hat(t, tone, p.open && p.open[s]);
      if (p.open && p.open[s] && !p.hat[s]) this.hat(t, tone, true);
      if (p.lead && p.lead[s]) this.lead(t, tone);

      /* 3連ロール */
      if (p.roll && p.roll[s]) {
        for (let i = 0; i < 3; i++) this.hat(t + stepDur * i / 3, tone, false);
      }

      if (p.bass && p.bass[s]) {
        let nxt = null;
        for (let i = 1; i <= 8; i++) {
          const v = p.bass[(s + i) % 16];
          if (v) { nxt = v; break; }
        }
        this.bassNote(t, p.bass[s], tone, nxt);
      }

      this._next += stepDur;
      this._step++;
    }
  },

  start(key) {
    if (key && BEATS[key]) this.key = key;
    if (!this.ensure()) return false;
    if (this.playing) return true;
    this.playing = true;
    this.enabled = true;
    this._step = 0;
    this._next = this.ctx.currentTime + .06;
    this.schedule();
    this._timer = setInterval(() => this.schedule(), 40);
    this.save();
    return true;
  },

  stop() {
    this.playing = false;
    this.enabled = false;
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    this.save();
  },

  toggle() { this.playing ? this.stop() : this.start(); },

  /* 曲調を切り替える。鳴っている最中でも途切れさせない */
  switchTo(key) {
    if (!BEATS[key] || key === this.key) return;
    this.key = key;
    this._step = 0;                       /* 小節の頭から */
    this.save();
  },

  setEraBeat(eraId) {
    const k = ERA_BEAT[eraId];
    if (k) this.switchTo(k);
  },

  setVolume(v) {
    this.vol = Math.max(0, Math.min(1, v));
    if (this.master && !this._ducked) {
      this.master.gain.setTargetAtTime(this.vol, this.ctx.currentTime, .05);
    }
    this.save();
  },

  /* 読み上げ中は音量を落とす */
  duck(on) {
    this._ducked = on;
    if (!this.master) return;
    const target = on ? this.vol * 0.18 : this.vol;
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, on ? .04 : .25);
  },

  save() {
    try {
      localStorage.setItem('bars-words-beat',
        JSON.stringify({ on: this.enabled, key: this.key, vol: this.vol }));
    } catch (e) {}
  },

  load() {
    try {
      const o = JSON.parse(localStorage.getItem('bars-words-beat'));
      if (!o) return;
      if (BEATS[o.key]) this.key = o.key;
      if (typeof o.vol === 'number') this.vol = o.vol;
      this.enabled = !!o.on;
    } catch (e) {}
  },
};
