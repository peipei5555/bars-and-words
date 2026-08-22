/* ===========================================================
   ともや — 毎日の学習を案内する銀色の魚
   既存画面との互換性のため、公開変数名（MC_* / mcSvg）は維持する。
   =========================================================== */

const MC_NAME = 'ともや';

const MC_LINES = {
  home: [
    'おはよう。今日の分だけ、一緒に進めよう。',
    '内容はこちらで組んであるよ。STARTを押せばOK。',
    '短い日も積み重なる。今日は今日のペースで。',
    '昨日の続きも、復習も、順番はこちらに任せて。',
    '聞こえなかった英文は、何度でもゆっくり聞こう。',
    '好きな話から、使える英語を増やしていこう。',
  ],
  era: {
    origins:   'ここは1973年のブロンクス。文化が生まれた場所から見ていこう。',
    oldschool: '音楽がレコードになり、街の外へ広がり始めた時代だよ。',
    newschool: '音も服も、ぐっと研ぎ澄まされていく。変化に注目しよう。',
    golden:    '表現の幅が一気に広がる黄金期。言葉の違いも面白いよ。',
    westcoast: '西海岸へ。土地が変わると、音や言葉の空気も変わる。',
    south:     '南部から新しい流れが育つ。地域ごとの違いを見てみよう。',
    mainstream:'世界規模になった時代。成功と課題の両方を読んでみよう。',
    trap:      '808と細かなハイハットが中心になる。耳でも確認してみよう。',
    global:    'ロンドン、ラゴス、東京へ。英語が世界をつなぐ時代だよ。',
    offshoots: '最後はルーツへ戻ろう。ソウルやジャズとのつながりを読むよ。',
  },
  battleIntro: [
    '読んだ内容を、短い確認クイズで定着させよう。',
    '5問中4問で次へ進めるよ。落ち着いていこう。',
    '迷ったら、本文に戻って確認して大丈夫。',
  ],
  win: [
    'よくできた。次の時代へ進もう。',
    'しっかり読めていたね。今日の積み重ね完了。',
    '合格。水の色もひとつ増えたよ。',
  ],
  lose: [
    'あと少し。間違えたところだけ見直そう。',
    '聞き直せば大丈夫。次はもっと分かりやすくなる。',
    'ここは復習の合図。急がず、もう一度いこう。',
  ],
  cheer: [
    'その調子。ひとつずつで大丈夫。',
    '分からなかった言葉が、次の伸びしろだよ。',
    '今日も前に進んでいるよ。',
  ],
};

const MC_OUTFITS = {
  base:       { accent: '#5b9ea0', water: '#cdeceb' },
  origins:    { accent: '#bd8b5d', water: '#e9dcc8' },
  oldschool:  { accent: '#d87363', water: '#f2d3cc' },
  newschool:  { accent: '#547f91', water: '#d3e5ea' },
  golden:     { accent: '#d3a34d', water: '#f1e4bb' },
  westcoast:  { accent: '#5c90ba', water: '#cfE5f3' },
  south:      { accent: '#a475a8', water: '#e5d5e7' },
  mainstream: { accent: '#4e9aa7', water: '#cbe7e9' },
  trap:       { accent: '#9b657d', water: '#e5d2da' },
  global:     { accent: '#586f9c', water: '#d4dced' },
  offshoots:  { accent: '#4e927a', water: '#cfe5dc' },
};

let _tomoyaUid = 0;

function mcSvg(id) {
  const O = MC_OUTFITS[id] || MC_OUTFITS.base;
  const u = `t${++_tomoyaUid}`;

  return `
<svg class="tomoya-fish" viewBox="0 0 320 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="銀色の魚のともや">
  <defs>
    <linearGradient id="water-${u}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f6fffe"/>
      <stop offset="1" stop-color="${O.water}"/>
    </linearGradient>
    <linearGradient id="silver-${u}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f9ffff"/>
      <stop offset=".34" stop-color="#c9e2e3"/>
      <stop offset=".62" stop-color="#87acb1"/>
      <stop offset="1" stop-color="#50757d"/>
    </linearGradient>
    <linearGradient id="fin-${u}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${O.accent}" stop-opacity=".9"/>
      <stop offset="1" stop-color="#315d64" stop-opacity=".72"/>
    </linearGradient>
    <pattern id="scales-${u}" width="15" height="12" patternUnits="userSpaceOnUse">
      <path d="M0 2 Q7.5 13 15 2" fill="none" stroke="#ffffff" stroke-opacity=".34" stroke-width="1.4"/>
    </pattern>
    <filter id="soft-${u}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="5"/>
    </filter>
  </defs>

  <rect x="6" y="8" width="308" height="204" rx="52" fill="url(#water-${u})" opacity=".82"/>
  <g class="tomoya-bubbles" fill="none" stroke="${O.accent}" stroke-width="2" opacity=".45">
    <circle cx="268" cy="48" r="7"/><circle cx="287" cy="29" r="4"/><circle cx="281" cy="70" r="3"/>
  </g>
  <ellipse class="mc-floor" cx="164" cy="177" rx="99" ry="12" fill="#315d64" opacity=".18" filter="url(#soft-${u})"/>

  <g class="mc-all tomoya-all">
    <path class="tomoya-tail" d="M246 105 C280 73 303 78 297 109 C304 142 280 149 246 120 Z" fill="url(#fin-${u})" stroke="#315d64" stroke-width="3"/>
    <path d="M139 75 C160 44 193 44 207 80" fill="url(#fin-${u})" stroke="#315d64" stroke-width="3"/>
    <path d="M155 139 C174 164 201 163 209 135" fill="url(#fin-${u})" stroke="#315d64" stroke-width="3"/>
    <path class="tomoya-body" d="M42 110 C70 57 170 54 251 94 C270 104 270 120 251 129 C164 169 72 158 42 122 C35 117 35 114 42 110 Z" fill="url(#silver-${u})" stroke="#315d64" stroke-width="4"/>
    <path d="M101 73 C150 61 205 70 251 95" fill="none" stroke="#ffffff" stroke-width="7" opacity=".42" stroke-linecap="round"/>
    <path d="M104 81 C148 71 207 79 242 98 L238 132 C191 151 137 154 96 140 Z" fill="url(#scales-${u})" opacity=".8"/>
    <path class="mc-arm-front" d="M142 111 C164 98 188 105 192 122 C174 129 157 135 139 132 Z" fill="url(#fin-${u})" stroke="#315d64" stroke-width="3"/>
    <path d="M87 78 C102 92 104 132 88 145" fill="none" stroke="#557c83" stroke-width="3" opacity=".78"/>
    <g class="mc-head">
      <circle cx="70" cy="105" r="18" fill="#f7ffff" stroke="#315d64" stroke-width="3"/>
      <circle cx="72" cy="107" r="9" fill="#183f46"/>
      <circle cx="68" cy="102" r="3.6" fill="#fff"/>
      <ellipse cx="62" cy="129" rx="9" ry="5" fill="${O.accent}" opacity=".2"/>
      <path class="mc-mouth" d="M45 126 Q55 133 67 126" fill="none" stroke="#315d64" stroke-width="3" stroke-linecap="round"/>
    </g>
    <path d="M211 84 Q229 106 217 139" fill="none" stroke="${O.accent}" stroke-width="5" opacity=".75" stroke-linecap="round"/>
  </g>
</svg>`;
}

const mcLine = list => list[Math.floor(Math.random() * list.length)];
