/* ===========================================================
   MC Fresh — 案内役のラッパーキャラ（立体シェーディング版）
   ・パーツを分けて描き、CSS 側で個別にアニメーションさせる
     （mc-all / mc-head / mc-arm-front / mc-arm-back / mc-chain / mc-mouth）
   ・色はベース1色から自動で光と影を作るので、衣装は base だけ指定すればよい
   ・ベクターなので拡大してもボケない。画像ファイルは一切使わない
   ・実在のラッパーではない、このアプリのオリジナルキャラ
   =========================================================== */

const MC_NAME = 'MC Fresh';

const MC_LINES = {
  home: [
    "Yo! 今日も一緒にやるかい？",
    "What's good? 続きから行こうぜ",
    "毎日ちょっとずつ。それが the grind ってやつだ",
    "Real talk、続けてるやつが一番強い",
    "ツアーの続き、行くかい？",
    "No cap、あんたは伸びてるよ",
    "耳が慣れてくると、急に聞こえ出す瞬間が来る",
  ],
  era: {
    origins:   "Yo! ここが全部の始まりだ。1973年のブロンクス、電気は街灯から拝借してた時代だぜ",
    oldschool: "初めてラップがレコードになった瞬間だ。Party over here!",
    newschool: "Run-DMCが全部削ぎ落とした。ここからラップは「本物」になる",
    golden:    "黄金期へようこそ。俺が一番好きな時代だ、real talk",
    westcoast: "West side! 窓を開けて、ゆっくり流すぜ",
    south:     "The South got something to say ── 南部の逆襲だ",
    mainstream:"ラップが世界一売れる音楽になった時代。金も問題も一緒に来た",
    trap:      "808が全部を飲み込んだ。hi-hatの刻みを聴きな",
    global:    "もう中心はどこにもない。ロンドンもラゴスも東京も現場だ",
    offshoots: "最後はルーツの話だ。ソウルとジャズ、ここから全部来てる",
  },
  battleIntro: [
    "この時代、ちゃんと覚えたか？ バトルで見せてみな",
    "5問中4問でクリアだ。Let's go!",
    "ビビるなよ、読んだままを答えりゃいい",
  ],
  win: [
    "Fire! 🔥 完璧だったぜ",
    "That's what I'm talking about! 次の時代へ進むぞ",
    "You killed it! 新しい衣装、もらったぜ",
  ],
  lose: [
    "Keep your head up. もう一回読み直して来な",
    "惜しい！ 間違えたところを聴き直すのが近道だ",
    "My bad, ちょっと難しかったか？ でも次は獲れるぜ",
  ],
  cheer: [
    "Not bad! その調子だ",
    "続けてりゃ GOAT になれるぜ",
    "間違えた言葉こそ、あんたの伸びしろだ",
  ],
};

/* -----------------------------------------------------------
   色の計算：ベース1色から明部と暗部を作る
   ----------------------------------------------------------- */
function shade(hex, p) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const f = v => Math.max(0, Math.min(255,
    Math.round(p > 0 ? v + (255 - v) * p : v * (1 + p))));
  return '#' + ch.map(v => f(v).toString(16).padStart(2, '0')).join('');
}

/* SVG を同じページに複数置いてもグラデーションIDがぶつからないようにする */
let _mcUid = 0;

/* -----------------------------------------------------------
   本体
   ----------------------------------------------------------- */
function mcSvg(id) {
  const O = MC_OUTFITS[id] || MC_OUTFITS.base;
  const u = 'm' + (++_mcUid);

  const SKIN = '#B87A47';
  const skinL = shade(SKIN, .30), skinD = shade(SKIN, -.32);

  const J  = O.color;                        // 上着のベース色
  const jL = shade(J, .26), jD = shade(J, -.38), jDD = shade(J, -.58);

  const H  = O.hatColor || shade(J, -.25);   // 帽子
  const hL = shade(H, .28), hD = shade(H, -.36);

  const HAIR = '#241812', hairL = '#3E2C1E';

  /* ---------- 定義（グラデーションと影） ---------- */
  const defs = `
  <defs>
    <radialGradient id="skin-${u}" cx="38%" cy="28%" r="78%">
      <stop offset="0%"  stop-color="${skinL}"/>
      <stop offset="58%" stop-color="${SKIN}"/>
      <stop offset="100%" stop-color="${skinD}"/>
    </radialGradient>
    <linearGradient id="jak-${u}" x1="15%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%"  stop-color="${jL}"/>
      <stop offset="45%" stop-color="${J}"/>
      <stop offset="100%" stop-color="${jD}"/>
    </linearGradient>
    <linearGradient id="jakArm-${u}" x1="0%" y1="0%" x2="100%" y2="60%">
      <stop offset="0%"  stop-color="${J}"/>
      <stop offset="100%" stop-color="${jDD}"/>
    </linearGradient>
    <linearGradient id="hat-${u}" x1="18%" y1="0%" x2="85%" y2="100%">
      <stop offset="0%"  stop-color="${hL}"/>
      <stop offset="52%" stop-color="${H}"/>
      <stop offset="100%" stop-color="${hD}"/>
    </linearGradient>
    <linearGradient id="gold-${u}" x1="0%" y1="0%" x2="60%" y2="100%">
      <stop offset="0%"   stop-color="#FFF0B8"/>
      <stop offset="32%"  stop-color="#F2C13D"/>
      <stop offset="62%"  stop-color="#A87814"/>
      <stop offset="100%" stop-color="#F7D96A"/>
    </linearGradient>
    <linearGradient id="ice-${u}" x1="0%" y1="0%" x2="70%" y2="100%">
      <stop offset="0%"   stop-color="#FFFFFF"/>
      <stop offset="45%"  stop-color="#BFD4F0"/>
      <stop offset="100%" stop-color="#7F96BC"/>
    </linearGradient>
    <linearGradient id="metal-${u}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#6E7280"/>
      <stop offset="40%"  stop-color="#2C2F3A"/>
      <stop offset="100%" stop-color="#4A4E5C"/>
    </linearGradient>
    <radialGradient id="rim-${u}" cx="50%" cy="50%" r="50%">
      <stop offset="70%"  stop-color="#fff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#fff" stop-opacity=".28"/>
    </radialGradient>
    <filter id="blur-${u}" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="7"/>
    </filter>
    <filter id="soft-${u}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3.2"/>
    </filter>
  </defs>`;

  /* ---------- 口（グリルの有無） ---------- */
  const mouth = O.grill ? `
    <g class="mc-mouth">
      <path d="M133 142 q17 4 34 0 l-3 11 q-14 5 -28 0 z" fill="#2A1208"/>
      <rect x="134" y="143" width="32" height="9" rx="3" fill="url(#gold-${u})"/>
      <line x1="142" y1="143" x2="142" y2="152" stroke="#8A6410" stroke-width="1.2"/>
      <line x1="150" y1="143" x2="150" y2="152" stroke="#8A6410" stroke-width="1.2"/>
      <line x1="158" y1="143" x2="158" y2="152" stroke="#8A6410" stroke-width="1.2"/>
    </g>` : `
    <g class="mc-mouth">
      <path d="M134 143 q16 13 32 0 q-16 6 -32 0 z" fill="#5C2A16"/>
      <path d="M136 144 q14 4 28 0" stroke="#F0E6E0" stroke-width="3" fill="none" stroke-linecap="round"/>
    </g>`;

  /* ---------- 目・サングラス ---------- */
  const eyes = {
    shades: `
      <path d="M112 116 h76 l-2 8 -33 2 -6 -2 -6 2 -33 -2 z" fill="#0C0C12"/>
      <rect x="112" y="114" width="33" height="19" rx="7" fill="#0C0C12"/>
      <rect x="155" y="114" width="33" height="19" rx="7" fill="#0C0C12"/>
      <rect x="115" y="117" width="14" height="6" rx="3" fill="#5A6478" opacity=".65"/>
      <rect x="158" y="117" width="14" height="6" rx="3" fill="#5A6478" opacity=".65"/>`,
    round: `
      <circle cx="128" cy="123" r="14" fill="#12121A" opacity=".9"/>
      <circle cx="172" cy="123" r="14" fill="#12121A" opacity=".9"/>
      <circle cx="128" cy="123" r="14" fill="none" stroke="url(#gold-${u})" stroke-width="3.5"/>
      <circle cx="172" cy="123" r="14" fill="none" stroke="url(#gold-${u})" stroke-width="3.5"/>
      <line x1="142" y1="123" x2="158" y2="123" stroke="url(#gold-${u})" stroke-width="3.5"/>
      <ellipse cx="123" cy="118" rx="5" ry="3.5" fill="#fff" opacity=".35" transform="rotate(-25 123 118)"/>`,
    thin: `
      <rect x="112" y="117" width="32" height="11" rx="5" fill="#0C0C12"/>
      <rect x="156" y="117" width="32" height="11" rx="5" fill="#0C0C12"/>
      <line x1="144" y1="122" x2="156" y2="122" stroke="#0C0C12" stroke-width="3.5"/>
      <rect x="115" y="119" width="12" height="3.5" rx="1.8" fill="#6A7488" opacity=".7"/>`,
    clear: `
      <circle cx="128" cy="123" r="13" fill="#DCE8F5" opacity=".14"/>
      <circle cx="172" cy="123" r="13" fill="#DCE8F5" opacity=".14"/>
      <circle cx="128" cy="123" r="13" fill="none" stroke="#3E4250" stroke-width="3"/>
      <circle cx="172" cy="123" r="13" fill="none" stroke="#3E4250" stroke-width="3"/>
      <line x1="141" y1="123" x2="159" y2="123" stroke="#3E4250" stroke-width="3"/>
      ${bareEyes()}`,
    none: bareEyes(),
  }[O.glasses || 'shades'];

  function bareEyes() {
    return `
      <ellipse cx="128" cy="122" rx="9" ry="7.5" fill="#F4EDE6"/>
      <ellipse cx="172" cy="122" rx="9" ry="7.5" fill="#F4EDE6"/>
      <circle cx="129" cy="123" r="5" fill="#2B1A0E"/>
      <circle cx="173" cy="123" r="5" fill="#2B1A0E"/>
      <circle cx="130.5" cy="121" r="1.8" fill="#fff"/>
      <circle cx="174.5" cy="121" r="1.8" fill="#fff"/>
      <path d="M118 111 q10 -5 20 -1" stroke="${HAIR}" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <path d="M162 110 q10 -4 20 1" stroke="${HAIR}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
  }

  /* ---------- 髪・帽子 ---------- */
  const hats = {
    /* つばを後ろに向けたキャップ */
    snapbackBack: `
      <path d="M104 92 a46 42 0 0 1 92 0 l0 9 -92 0 z" fill="url(#hat-${u})"/>
      <path d="M196 86 q26 2 30 10 q-2 7 -30 7 z" fill="${hD}"/>
      <path d="M108 80 a44 36 0 0 1 40 -22 q-26 8 -34 26 z" fill="#fff" opacity=".14"/>
      <rect x="104" y="95" width="92" height="7" rx="3" fill="${hD}"/>`,
    /* 前つばキャップ */
    snapback: `
      <path d="M104 92 a46 42 0 0 1 92 0 l0 9 -92 0 z" fill="url(#hat-${u})"/>
      <path d="M104 88 q-30 3 -34 12 q3 8 34 8 z" fill="${hD}"/>
      <path d="M112 78 a42 34 0 0 1 38 -20 q-24 8 -32 24 z" fill="#fff" opacity=".14"/>
      <rect x="104" y="95" width="92" height="7" rx="3" fill="${hD}"/>`,
    afro: `
      <circle cx="150" cy="76" r="50" fill="${HAIR}"/>
      <circle cx="108" cy="98" r="26" fill="${HAIR}"/>
      <circle cx="192" cy="98" r="26" fill="${HAIR}"/>
      <circle cx="126" cy="48" r="22" fill="${hairL}" opacity=".5"/>
      <circle cx="168" cy="42" r="17" fill="${hairL}" opacity=".35"/>
      <circle cx="112" cy="72" r="15" fill="${hairL}" opacity=".3"/>`,
    bucket: `
      <path d="M110 86 a40 34 0 0 1 80 0 l3 10 -86 0 z" fill="url(#hat-${u})"/>
      <ellipse cx="150" cy="98" rx="56" ry="11" fill="${H}"/>
      <ellipse cx="150" cy="96" rx="56" ry="11" fill="url(#hat-${u})"/>
      <path d="M118 74 a38 30 0 0 1 32 -18 q-22 7 -28 20 z" fill="#fff" opacity=".16"/>`,
    fedora: `
      <path d="M114 88 a37 30 0 0 1 72 0 l0 6 -72 0 z" fill="url(#hat-${u})"/>
      <path d="M136 62 q14 -8 28 0 l0 10 -28 0 z" fill="${hD}"/>
      <ellipse cx="150" cy="96" rx="56" ry="10" fill="url(#hat-${u})"/>
      <rect x="114" y="82" width="72" height="9" fill="${shade(H, -.55)}"/>
      <rect x="114" y="82" width="72" height="3" fill="#fff" opacity=".1"/>`,
    beanie: `
      <path d="M108 94 a43 38 0 0 1 84 0 l0 4 -84 0 z" fill="url(#hat-${u})"/>
      <rect x="106" y="92" width="88" height="15" rx="7" fill="${hD}"/>
      <path d="M106 99 h88" stroke="${shade(H, -.55)}" stroke-width="2" opacity=".6"/>
      <path d="M116 76 a40 32 0 0 1 34 -18 q-22 7 -28 20 z" fill="#fff" opacity=".14"/>`,
    bandana: `
      <path d="M106 96 a44 38 0 0 1 88 0 l0 3 -88 0 z" fill="url(#hat-${u})"/>
      <path d="M106 96 l88 0 l-5 10 -78 0 z" fill="${hD}"/>
      <path d="M194 96 q20 6 24 18 q-10 6 -18 -2 z" fill="${H}"/>
      ${[122, 140, 158, 176].map(x => `<circle cx="${x}" cy="90" r="3" fill="#fff" opacity=".22"/>`).join('')}`,
    headphones: `
      <path d="M108 94 a43 36 0 0 1 84 0 l0 6 -84 0 z" fill="url(#hat-${u})"/>
      <path d="M100 100 a52 46 0 0 1 100 0" fill="none" stroke="url(#metal-${u})" stroke-width="11" stroke-linecap="round"/>
      <rect x="86" y="98" width="24" height="38" rx="11" fill="url(#metal-${u})"/>
      <rect x="190" y="98" width="24" height="38" rx="11" fill="url(#metal-${u})"/>
      <rect x="92" y="104" width="12" height="26" rx="6" fill="#14141A"/>
      <rect x="196" y="104" width="12" height="26" rx="6" fill="#14141A"/>`,
    dreads: `
      <path d="M106 88 a44 38 0 0 1 88 0 l0 8 -88 0 z" fill="${HAIR}"/>
      ${[
        [104, 92, 60], [116, 84, 74], [128, 80, 66], [150, 76, 58],
        [172, 80, 70], [184, 84, 62], [196, 92, 56],
      ].map(([x, y, h], i) => `
        <rect x="${x - 5}" y="${y}" width="11" height="${h}" rx="5.5" fill="${i % 2 ? HAIR : hairL}"/>
        <circle cx="${x}" cy="${y + h}" r="5.5" fill="${i % 2 ? HAIR : hairL}"/>`).join('')}`,
    hood: `
      <path d="M100 98 a50 46 0 0 1 100 0 l0 16 -12 0 a38 36 0 0 0 -76 0 l-12 0 z" fill="url(#hat-${u})"/>
      <path d="M112 76 a44 38 0 0 1 38 -22 q-26 8 -32 24 z" fill="#fff" opacity=".12"/>`,
    kangol: `
      <path d="M110 88 a40 32 0 0 1 80 0 l0 8 -80 0 z" fill="url(#hat-${u})"/>
      <path d="M110 94 l80 0 l9 7 -98 0 z" fill="${hD}"/>
      <circle cx="150" cy="60" r="6" fill="${hL}"/>`,
  }[O.hat || 'snapbackBack'];

  /* ---------- チェーン ---------- */
  const chains = {
    none: '',
    rope: `
      <g class="mc-chain">
        <path d="M124 196 q26 34 52 0" fill="none" stroke="#8A6410" stroke-width="10" stroke-linecap="round"/>
        <path d="M124 196 q26 34 52 0" fill="none" stroke="url(#gold-${u})" stroke-width="7.5" stroke-linecap="round" stroke-dasharray="2 8"/>
      </g>`,
    pendant: `
      <g class="mc-chain">
        <path d="M124 194 q26 32 52 0" fill="none" stroke="#8A6410" stroke-width="6.5"/>
        <path d="M124 194 q26 32 52 0" fill="none" stroke="url(#gold-${u})" stroke-width="4.5"/>
        <circle cx="150" cy="222" r="15" fill="#8A6410"/>
        <circle cx="150" cy="221" r="13.5" fill="url(#gold-${u})"/>
        <text x="150" y="227" text-anchor="middle" font-size="16" font-weight="800"
              font-family="Impact, sans-serif" fill="#6A4A08">${O.pendant || '$'}</text>
      </g>`,
    ice: `
      <g class="mc-chain">
        <path d="M124 194 q26 32 52 0" fill="none" stroke="#7F96BC" stroke-width="9" stroke-linecap="round"/>
        <path d="M124 194 q26 32 52 0" fill="none" stroke="url(#ice-${u})" stroke-width="6" stroke-linecap="round" stroke-dasharray="3 6"/>
        <path d="M150 210 l11 11 -11 15 -11 -15 z" fill="url(#ice-${u})" stroke="#6E86AC" stroke-width="1.5"/>
        <path d="M150 210 l11 11 -22 0 z" fill="#fff" opacity=".55"/>
      </g>`,
  }[O.chain || 'none'];

  /* ---------- 服の柄 ---------- */
  const stripes = O.stripes ? `
    <path d="M112 210 q-9 40 -11 92" stroke="#fff" stroke-width="5" fill="none" opacity=".85" stroke-linecap="round"/>
    <path d="M188 210 q9 40 11 92" stroke="#fff" stroke-width="5" fill="none" opacity=".85" stroke-linecap="round"/>` : '';
  const ribs = O.ribs ? `
    <path d="M118 232 h64 M115 254 h70 M113 276 h74" stroke="${jDD}" stroke-width="5" fill="none" opacity=".55"/>` : '';

  /* ---------- 手に持つもの ---------- */
  const propFront = O.prop === 'vinyl' ? `
    <g transform="translate(196 200)">
      <circle cx="0" cy="0" r="30" fill="#0E0E14"/>
      <circle cx="0" cy="0" r="30" fill="none" stroke="#33333F" stroke-width="1.5"/>
      <circle cx="0" cy="0" r="22" fill="none" stroke="#2A2A34" stroke-width="1"/>
      <circle cx="0" cy="0" r="15" fill="none" stroke="#2A2A34" stroke-width="1"/>
      <circle cx="0" cy="0" r="10" fill="${J}"/>
      <circle cx="0" cy="0" r="3" fill="#0E0E14"/>
      <path d="M-21 -21 a30 30 0 0 1 14 -7" stroke="#fff" stroke-width="2.5" fill="none" opacity=".45"/>
    </g>` : '';

  const boombox = O.prop === 'boombox' ? `
    <g transform="translate(214 262)">
      <rect x="0" y="0" width="76" height="46" rx="7" fill="url(#metal-${u})" stroke="#14141A" stroke-width="2.5"/>
      <circle cx="19" cy="23" r="14" fill="#14141A"/>
      <circle cx="19" cy="23" r="10" fill="none" stroke="#6E7280" stroke-width="2"/>
      <circle cx="57" cy="23" r="14" fill="#14141A"/>
      <circle cx="57" cy="23" r="10" fill="none" stroke="#6E7280" stroke-width="2"/>
      <rect x="33" y="12" width="10" height="13" rx="2" fill="#0E0E14"/>
      <rect x="33" y="29" width="10" height="4" rx="2" fill="#F2C13D"/>
      <rect x="24" y="-9" width="28" height="7" rx="3.5" fill="#4A4E5C"/>
    </g>` : '';

  /* マイクは常に前腕が持つ */
  const mic = `
    <g transform="translate(0 0)">
      <rect x="196" y="150" width="11" height="34" rx="5.5" fill="url(#metal-${u})"/>
      <circle cx="201.5" cy="146" r="14" fill="#1A1A22"/>
      <circle cx="201.5" cy="146" r="14" fill="url(#rim-${u})"/>
      <circle cx="201.5" cy="146" r="10.5" fill="none" stroke="#6E7280" stroke-width="1.6"/>
      <path d="M194 140 a10 10 0 0 1 12 -2" stroke="#9AA0AE" stroke-width="2" fill="none" opacity=".8"/>
    </g>`;

  /* ---------- 組み立て ---------- */
  return `
<svg viewBox="0 0 300 366" xmlns="http://www.w3.org/2000/svg">
  ${defs}

  <!-- 床の影 -->
  <ellipse class="mc-floor" cx="150" cy="342" rx="76" ry="13" fill="#000" opacity=".45" filter="url(#blur-${u})"/>
  ${boombox}

  <g class="mc-all">
    <!-- 後ろの腕（振り上げる方） -->
    <g class="mc-arm-back">
      <path d="M112 196 q-30 -6 -44 -34 l19 -11 q12 22 32 25 z" fill="url(#jakArm-${u})" stroke="${jDD}" stroke-width="1.5"/>
      <circle cx="66" cy="150" r="15" fill="url(#skin-${u})"/>
      <path d="M58 146 q8 -10 17 -2" stroke="${skinD}" stroke-width="2.5" fill="none" opacity=".7"/>
    </g>

    <!-- 脚 -->
    <g class="mc-legs">
      <path d="M120 290 l-4 44 26 0 4 -44 z" fill="${jDD}"/>
      <path d="M180 290 l4 44 -26 0 -4 -44 z" fill="${jD}"/>
      <path d="M110 330 h34 v11 h-38 q-2 -8 4 -11 z" fill="#E8E8EE"/>
      <path d="M190 330 h-34 v11 h38 q2 -8 -4 -11 z" fill="#E8E8EE"/>
      <path d="M106 338 h38 v3 h-38 z" fill="#B8B8C4"/>
      <path d="M156 338 h38 v3 h-38 z" fill="#B8B8C4"/>
    </g>

    <!-- 胴 -->
    <g class="mc-torso">
      <path d="M104 300 q-4 -84 24 -110 q22 -12 44 0 q28 26 24 110 z" fill="url(#jak-${u})"/>
      <path d="M128 190 q22 -10 44 0 l-16 26 -12 0 z" fill="${jDD}" opacity=".55"/>
      <path d="M110 214 q-6 44 -5 84" stroke="${jDD}" stroke-width="3" fill="none" opacity=".45"/>
      <path d="M190 214 q6 44 5 84" stroke="${jL}" stroke-width="3" fill="none" opacity=".3"/>
      ${ribs}${stripes}
      <path d="M104 300 q46 12 92 0 l0 6 q-46 12 -92 0 z" fill="${jDD}"/>
    </g>

    <!-- 首 -->
    <path d="M133 160 h34 v26 q-17 10 -34 0 z" fill="${skinD}"/>
    ${chains}

    <!-- 前の腕（マイクを持つ方） -->
    <g class="mc-arm-front">
      <path d="M188 194 q30 -4 42 -28 l-20 -12 q-10 18 -30 21 z" fill="url(#jakArm-${u})" stroke="${jDD}" stroke-width="1.5"/>
      ${mic}
      <circle cx="205" cy="176" r="16" fill="url(#skin-${u})"/>
      <path d="M197 170 q9 -8 17 -1" stroke="${skinD}" stroke-width="2.5" fill="none" opacity=".7"/>
    </g>

    <!-- 頭 -->
    <g class="mc-head">
      <!-- 耳 -->
      <ellipse cx="102" cy="124" rx="9" ry="13" fill="${skinD}"/>
      <ellipse cx="198" cy="124" rx="9" ry="13" fill="${skinD}"/>
      <!-- 顔 -->
      <path d="M106 108 q0 -46 44 -46 q44 0 44 46 q0 44 -44 56 q-44 -12 -44 -56 z" fill="url(#skin-${u})"/>
      <!-- 顎の陰 -->
      <path d="M124 150 q26 18 52 0 q-26 20 -52 0 z" fill="${skinD}" opacity=".5"/>
      <!-- 頬のハイライト -->
      <ellipse cx="120" cy="132" rx="12" ry="8" fill="${skinL}" opacity=".35"/>
      <ellipse cx="180" cy="132" rx="12" ry="8" fill="${skinL}" opacity=".35"/>
      <!-- 鼻 -->
      <path d="M150 124 q-6 12 -1 17 q4 3 8 0" stroke="${skinD}" stroke-width="3" fill="none" stroke-linecap="round"/>
      ${mouth}
      ${eyes}
      ${hats}
      <!-- リムライト -->
      <path d="M106 108 q0 -46 44 -46 q44 0 44 46 q0 44 -44 56 q-44 -12 -44 -56 z"
            fill="url(#rim-${u})" opacity=".5"/>
    </g>

    ${propFront}
  </g>
</svg>`;
}

/* -----------------------------------------------------------
   時代ごとの衣装（ERAS の id と対応。base は未クリアの初期状態）
   ----------------------------------------------------------- */
const MC_OUTFITS = {
  base:      { color: '#4A4F60', hat: 'snapbackBack', hatColor: '#23242E', glasses: 'none' },
  origins:   { color: '#7C5A34', hat: 'afro',        glasses: 'round',  prop: 'boombox' },
  oldschool: { color: '#C0332C', hat: 'bucket',      hatColor: '#C0332C', chain: 'rope', glasses: 'none' },
  newschool: { color: '#1A1A22', hat: 'fedora',      hatColor: '#20202A', glasses: 'shades', chain: 'rope', stripes: true },
  golden:    { color: '#2E7A57', hat: 'beanie',      hatColor: '#1E1E28', glasses: 'none', chain: 'pendant', pendant: '★' },
  westcoast: { color: '#2F5C8A', hat: 'bandana',     hatColor: '#274A72', glasses: 'thin' },
  south:     { color: '#6A3A94', hat: 'snapback',    hatColor: '#472763', glasses: 'shades', grill: true, chain: 'pendant', pendant: '$' },
  mainstream:{ color: '#3F7FA8', hat: 'headphones',  hatColor: '#2E5C7E', glasses: 'none', chain: 'pendant', pendant: '▶' },
  trap:      { color: '#9C2F55', hat: 'dreads',      glasses: 'thin',   chain: 'ice' },
  global:    { color: '#343A72', hat: 'hood',        hatColor: '#282C58', glasses: 'none', ribs: true },
  offshoots: { color: '#20705F', hat: 'kangol',      hatColor: '#175045', glasses: 'clear', prop: 'vinyl' },
};

/* ランダムに1つ選ぶ */
const mcLine = list => list[Math.floor(Math.random() * list.length)];
