/* ===========================================================
   英文の構造解説（試作）
   ペーさんの要望③④に対応するデータ。
   キーは history.js の英文そのまま（完全一致で引く）。

   role の意味:
     S  主語        V  動詞        O  目的語      C  補語
     M  修飾語（いつ・どこで・どうやって）
     conj 接続詞    prep 前置詞のかたまり

   ★これは origins（STAGE 1）の6文だけの試作。
     見た目と操作感をペーさんに確認してから、残り約220文へ広げる。
   =========================================================== */

const PARSE = {

  "Hip hop started at a house party in the Bronx in 1973.": {
    chunks: [
      { t: 'Hip hop',           role: 'S', ja: 'ヒップホップが' },
      { t: 'started',           role: 'V', ja: '始まった' },
      { t: 'at a house party',  role: 'M', ja: 'ある家のパーティーで' },
      { t: 'in the Bronx',      role: 'M', ja: 'ブロンクスの' },
      { t: 'in 1973',           role: 'M', ja: '1973年に' },
    ],
    point: '英語は「動詞のすぐ後ろ」から情報を足していく。ここでは <b>場所（狭い→広い）→ 時</b> の順。日本語だと「1973年にブロンクスの家のパーティーで始まった」と逆順になる。<b>この並び順が英語の骨</b>。',
    grammar: {
      title: '過去形（started）',
      body: '規則動詞は <b>-ed</b> を付けるだけで過去になる。start → started。<br>会話では「いつの話か」を最初に決めてから喋り出すと、時制で迷わなくなる。',
    },
    alts: [
      { en: 'Hip hop was born at a house party in the Bronx in 1973.',
        ja: '「誕生した」に近い言い方。ものごとの始まりには was born が使える' },
      { en: 'It all started at a house party in the Bronx back in 1973.',
        ja: 'It all started 〜 は「すべてはここから始まった」。back in 1973 で「1973年当時」の含み' },
    ],
  },

  "A DJ called Kool Herc noticed something.": {
    chunks: [
      { t: 'A DJ',            role: 'S', ja: 'あるDJが' },
      { t: 'called Kool Herc', role: 'M', ja: 'Kool Hercと呼ばれる' },
      { t: 'noticed',         role: 'V', ja: '気づいた' },
      { t: 'something',       role: 'O', ja: 'あることに' },
    ],
    point: '<b>called Kool Herc</b> が後ろから <b>A DJ</b> を説明している。日本語は「Kool Hercと呼ばれるDJ」と前から飾るが、<b>英語は名詞の後ろから飾る</b>。この「後ろから説明」は英語で最も多い形。',
    grammar: {
      title: '過去分詞の後置修飾（called 〜）',
      body: '<b>名詞 + 過去分詞</b> で「〜される名詞」。<br>a DJ called Herc（Hercと呼ばれるDJ）／a song written in 1982（1982年に書かれた曲）。<br>間に <b>who is</b> を入れても同じ意味（a DJ <u>who is</u> called Herc）。会話では省くほうが自然。',
    },
    alts: [
      { en: 'A DJ named Kool Herc noticed something.',
        ja: 'named のほうが人名には自然。called とほぼ同じ' },
      { en: 'There was a DJ called Kool Herc, and he noticed something.',
        ja: '2文に割った形。話しながら考えるときはこう言うと楽' },
    ],
  },

  "Dancers went wild during the drum break — the short part with no singing.": {
    chunks: [
      { t: 'Dancers',              role: 'S', ja: '踊り手たちが' },
      { t: 'went wild',            role: 'V', ja: '熱狂した' },
      { t: 'during the drum break', role: 'M', ja: 'ドラムのブレイクの間' },
      { t: 'the short part with no singing', role: 'M', ja: '（言い換え）歌の入らない短い部分' },
    ],
    point: 'ダッシュ（—）の後ろは<b>直前の語の言い換え</b>。難しい語を出したあとで、やさしい言葉に置き直す型。<b>会話でも使える技</b>で、単語が出てこないとき「A — つまり B」と繋げば通じる。',
    grammar: {
      title: 'go + 形容詞（went wild）',
      body: '<b>go は「〜の状態になる」</b>という意味でも使う。go wild（熱狂する）／go crazy（おかしくなる）／go quiet（静まる）。<br>「行く」ではないので注意。become の口語版と考えるとよい。',
    },
    alts: [
      { en: 'Dancers loved the drum break, the part with no vocals.',
        ja: 'シンプルに loved で言い換え。vocals は「歌のパート」' },
      { en: 'The crowd lost it during the drum break.',
        ja: 'lost it は「我を忘れた」。かなり口語的で、ライブの感想に使える' },
    ],
  },

  "So he used two copies of the same record and played that break over and over.": {
    chunks: [
      { t: 'So',                          role: 'conj', ja: 'だから' },
      { t: 'he',                          role: 'S', ja: '彼は' },
      { t: 'used',                        role: 'V', ja: '使った' },
      { t: 'two copies of the same record', role: 'O', ja: '同じレコード2枚を' },
      { t: 'and',                         role: 'conj', ja: 'そして' },
      { t: 'played',                      role: 'V', ja: '鳴らした' },
      { t: 'that break',                  role: 'O', ja: 'そのブレイクを' },
      { t: 'over and over',               role: 'M', ja: '何度も繰り返して' },
    ],
    point: '<b>and で動詞2つを繋いだ形</b>。主語（he）は1回だけ言えばよく、2つ目の動詞の前で繰り返さない。日本語の「〜して、〜した」と同じ感覚。',
    grammar: {
      title: '同じ主語なら繰り返さない',
      body: 'He used A and played B.（○）<br>He used A and he played B.（△ 間違いではないが、くどい）<br><b>主語が同じなら2つ目は省く。</b>これだけで文が英語らしくなる。',
    },
    alts: [
      { en: 'So he played the same break again and again using two records.',
        ja: 'again and again も「何度も」。over and over と同じ' },
      { en: "So he'd loop that break with two copies of the record.",
        ja: "loop（ループさせる）を動詞で使った形。would（'d）は「よくそうしていた」" },
    ],
  },

  "He called it the break beat.": {
    chunks: [
      { t: 'He',             role: 'S', ja: '彼は' },
      { t: 'called',         role: 'V', ja: '呼んだ' },
      { t: 'it',             role: 'O', ja: 'それを' },
      { t: 'the break beat', role: 'C', ja: 'ブレイクビーツと' },
    ],
    point: '<b>call A B = 「AをBと呼ぶ」</b>。目的語（it）の後ろに、その名前（the break beat）が直接くる。前置詞は入らない。<b>call it as 〜 は誤り。</b>',
    grammar: {
      title: 'SVOC — 目的語のあとに補語がくる形',
      body: 'この形をとる動詞は数が限られる。覚えるべきはこの4つ:<br>' +
            '<b>call</b> A B（AをBと呼ぶ）／<b>make</b> A B（AをBにする）／' +
            '<b>find</b> A B（AがBだと分かる）／<b>keep</b> A B（AをBのままにする）<br>' +
            '例: They call him the GOAT.（彼をGOATと呼ぶ）／That beat makes me happy.',
    },
    alts: [
      { en: 'He named it the break beat.',
        ja: 'name も同じ形をとる。「名付けた」のニュアンス' },
      { en: 'That is what he called the break beat.',
        ja: '「それが彼の言うブレイクビーツだ」。what を使った言い換え' },
    ],
  },

  "The city was broke and burning.": {
    chunks: [
      { t: 'The city', role: 'S', ja: 'その街は' },
      { t: 'was',      role: 'V', ja: '〜だった' },
      { t: 'broke',    role: 'C', ja: '金がなく' },
      { t: 'and burning', role: 'C', ja: 'そして燃えていた' },
    ],
    point: '<b>be動詞1つで、形容詞を2つ並べた</b>。was broke and (was) burning。2つ目の was は省く。<br><b>broke</b> は「壊れた」ではなく<b>「金がない」</b>。スラング欄にも入っている実用語。',
    grammar: {
      title: 'be動詞は「=（イコール）」',
      body: '<b>The city = broke, burning</b> という関係。<br>be動詞のあとには「主語がどんな状態か」がくる。動作を表す一般動詞（start, play）とはっきり区別する。<br>これが分かると、is / was の使い分けで迷わなくなる。',
    },
    alts: [
      { en: 'The city had no money and was falling apart.',
        ja: 'fall apart は「崩れていく」。broke を具体的に言い換えた形' },
      { en: 'New York was broke back then.',
        ja: 'back then（当時は）を付けると時代の話だとはっきりする' },
    ],
  },
};

/* 役割ラベルの表示名と色 */
const ROLE_INFO = {
  S:    { ja: '主語',   short: 'S',  c: '#F2C13D' },
  V:    { ja: '動詞',   short: 'V',  c: '#E8453C' },
  O:    { ja: '目的語', short: 'O',  c: '#3FA9E8' },
  C:    { ja: '補語',   short: 'C',  c: '#C24FE0' },
  M:    { ja: '修飾語', short: 'M',  c: '#2FD9AE' },
  conj: { ja: '接続詞', short: '接', c: '#9E9EB2' },
  prep: { ja: '前置詞句', short: '前', c: '#2FD9AE' },
};
