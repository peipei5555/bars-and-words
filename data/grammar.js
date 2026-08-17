/* ===========================================================
   文法講座 — 順を追って理解する（ペーさんの要望④）
   ・黒坂式の「精読・文法が先、多読はその後」という順序に合わせ、
     この順番どおりに進めば土台ができるよう並べてある
   ・例文は原則、このアプリの中に実際に出てくる英文を使う（要望⑤への答え）
     教科書の "This is a pen." ではなく、ヒップホップ史の本文から取る
   ・sentence が入っている例文は、そのまま「文のしくみ」（parse.js）へ繋がる

   step  : 学習の段階（1=土台 2=骨格 3=広げる 4=仕上げ）
   why   : なぜ要るのか。日本語話者がどこでつまずくか
   rules : 要点。ここだけ読めば用は足りる
   ex    : 例文（en / ja / note）
   trap  : よくある間違い（誤り → 正しい形）
   =========================================================== */

const GRAMMAR = [

/* ============ STEP 1：土台 ============ */
{
  id: 'order', step: 1,
  title: 'Word Order', titleJa: '語順 ── これが英語の骨',
  why: '日本語は「だれが → なにを → どうした」。英語は「<b>だれが → どうした → なにを</b>」。' +
       'この違いを体に入れないと、単語を覚えても文が組めません。逆に、ここが入れば中学英語の半分は終わりです。',
  rules: [
    '<b>主語 → 動詞</b> を必ず先に置く。英語は動詞が早い',
    '動詞のあとに「なにを（目的語）」',
    '「いつ・どこで」は<b>いちばん後ろ</b>。しかも<b>場所 → 時</b>の順',
    '日本語は最後に動詞が来るので、<b>順番が完全に逆</b>だと覚える',
  ],
  ex: [
    { en: 'Hip hop started at a house party in the Bronx in 1973.',
      ja: 'ヒップホップは1973年にブロンクスの家のパーティーで始まった。',
      note: '英語は「始まった → 家のパーティーで → ブロンクスの → 1973年に」。日本語と真逆の順',
      sentence: 'Hip hop started at a house party in the Bronx in 1973.' },
    { en: 'He called it the break beat.',
      ja: '彼はそれをブレイクビーツと呼んだ。',
      note: '主語 → 動詞 → なにを → なんと呼ぶか',
      sentence: 'He called it the break beat.' },
  ],
  trap: [
    { bad: 'In 1973 hip hop in the Bronx started.', good: 'Hip hop started in the Bronx in 1973.',
      why: '日本語の順で並べると不自然になる。まず「主語＋動詞」' },
  ],
},

{
  id: 'be', step: 1,
  title: 'Be Verbs', titleJa: 'be動詞 ── 「＝」の記号',
  why: 'be動詞（am / is / are / was / were）は<b>イコール記号</b>だと思ってください。' +
       '「主語 ＝ どんな状態か」を結ぶだけの働きです。動作は表しません。' +
       'ここを一般動詞と混ぜると、is と does の使い分けで一生迷います。',
  rules: [
    '<b>A is B</b> は「A ＝ B」。それだけ',
    'be動詞のあとには<b>名詞</b>（職業・立場）か<b>形容詞</b>（状態）が来る',
    '過去は <b>was / were</b>。主語が複数なら were',
    '<b>動作を言いたいときはbe動詞ではない。</b>「走る」は He runs（He is run ではない）',
  ],
  ex: [
    { en: 'The city was broke and burning.',
      ja: 'その街は金がなく、燃えていた。',
      note: 'The city ＝ broke, burning。形容詞を2つ並べ、2つ目の was は省いている',
      sentence: 'The city was broke and burning.' },
    { en: "He's the most underrated rapper alive.",
      ja: '彼は今生きてる中で一番過小評価されているラッパーだ。',
      note: 'He ＝ the most underrated rapper。He is の短縮が He\'s' },
  ],
  trap: [
    { bad: 'I am agree with you.', good: 'I agree with you.',
      why: 'agree は動作の動詞。be動詞と重ねない。日本人が最も多くやる間違い' },
    { bad: 'He is have a car.', good: 'He has a car.',
      why: '同じ理由。have も動作の動詞' },
  ],
},

{
  id: 'verb', step: 1,
  title: 'Action Verbs', titleJa: '一般動詞 ── 動きを表す',
  why: 'be動詞以外の動詞です。<b>三人称単数（he / she / it）のときだけ -s が付く</b>という、' +
       '日本語には存在しないルールがあります。ここは慣れるしかありませんが、' +
       'ルールは1つだけなので恐れる必要はありません。',
  rules: [
    '<b>he / she / it が主語のとき、現在形に -s</b>。He plays. / She drops an album.',
    'I / you / we / they はそのまま。I play.',
    '<b>過去形はどの主語でも同じ形</b>（-s の心配が消える）',
    '否定と疑問には <b>do / does / did</b> を使う',
  ],
  ex: [
    { en: 'He dropped a new album last night.',
      ja: '彼は昨夜、新しいアルバムを出した。',
      note: 'drop は「（作品を）出す」。release よりずっとよく使う' },
    { en: 'She samples old soul records.',
      ja: '彼女は古いソウルのレコードをサンプリングする。',
      note: '主語が she なので samples と -s が付く' },
  ],
  trap: [
    { bad: 'He drop a new album.', good: 'He dropped a new album.',
      why: '過去の話なら過去形。時間を先に決めてから喋り出すと迷わない' },
    { bad: 'She sample old records.', good: 'She samples old records.',
      why: 'she のときは -s' },
  ],
},

/* ============ STEP 2：骨格 ============ */
{
  id: 'tense', step: 2,
  title: 'Past & Present', titleJa: '時制 ── いつの話か',
  why: '日本語は時間をあいまいにできますが、<b>英語は動詞の形で必ず時間を示します</b>。' +
       'まず「現在」と「過去」の2つだけ確実にしてください。この2つで会話の8割が回ります。',
  rules: [
    '<b>過去</b>：規則動詞は -ed（start → started）。不規則は覚える（go → went, make → made）',
    '<b>現在</b>：いま繰り返していること・事実。I listen to hip hop.（習慣）',
    '<b>未来</b>：will か be going to。会話では <b>gonna</b> がほぼ全部',
    '<b>時間を表す語を先に決める</b>と時制が自動で決まる（last night → 過去、these days → 現在）',
  ],
  ex: [
    { en: 'Nas released Illmatic at twenty-one.',
      ja: 'Nasは21歳でIllmaticを出した。',
      note: 'released（過去）。歴史の話は基本すべて過去形' },
    { en: "I'm gonna listen to that album tonight.",
      ja: '今夜あのアルバムを聴くつもり。',
      note: 'going to → gonna。会話ではこちらが普通' },
  ],
  trap: [
    { bad: 'Yesterday I go to the show.', good: 'Yesterday I went to the show.',
      why: 'yesterday があるなら過去形。時間の語と動詞の形を揃える' },
  ],
},

{
  id: 'question', step: 2,
  title: 'Questions & Negatives', titleJa: '疑問文と否定文',
  why: '会話は<b>質問できるかどうか</b>で決まります。聞き返せれば会話は続きます。' +
       'be動詞と一般動詞で作り方が違うので、そこだけ分けて覚えてください。',
  rules: [
    '<b>be動詞</b>：ひっくり返すだけ。Is it good? / It is not good.',
    '<b>一般動詞</b>：do / does / did を借りてくる。Do you like it? / I don\'t like it.',
    '<b>疑問詞は文の頭</b>。What / Who / Where / When / Why / How',
    '<b>語尾を上げるだけでも疑問になる</b>。You like this?（口語）',
  ],
  ex: [
    { en: "Who's your favorite MC?",
      ja: '好きなラッパーは誰？',
      note: '会話の入口として最強のひとこと。Who is の短縮' },
    { en: 'Have you heard the new album?',
      ja: '新しいアルバム聴いた？',
      note: 'Have you 〜? は「もう〜した？」' },
    { en: "I'm not gonna lie, I skipped that track.",
      ja: '正直、その曲は飛ばした。',
      note: 'not gonna lie は「正直に言うと」。切り出しの定型' },
  ],
  trap: [
    { bad: 'Do you can play?', good: 'Can you play?',
      why: 'can 自体が疑問文を作れる。do を重ねない' },
    { bad: 'What you think?', good: 'What do you think?',
      why: '口語では省くこともあるが、まずは do を入れる形を覚える' },
  ],
},

{
  id: 'postmod', step: 2,
  title: 'Describing from Behind', titleJa: '後ろから説明する ── 英語の核心',
  why: '<b>これが英語で最も重要な感覚です。</b>日本語は「Hercと呼ばれるDJ」と<b>前から</b>飾りますが、' +
       '英語は「a DJ called Herc」と<b>後ろから</b>飾ります。' +
       'リスニングで置いていかれる原因の大半がこれです。名詞が出たら「後ろに説明が来るぞ」と構えてください。',
  rules: [
    '<b>名詞 + 過去分詞</b>：a DJ called Herc（Hercと呼ばれるDJ）',
    '<b>名詞 + 現在分詞(-ing)</b>：the guy standing there（そこに立っている男）',
    '<b>名詞 + 前置詞のかたまり</b>：the part with no singing（歌のない部分）',
    '<b>名詞 + to不定詞</b>：the best way to learn（学ぶ最良の方法）',
    'どれも <b>which is / who is を省いた形</b>だと考えれば繋がる',
  ],
  ex: [
    { en: 'A DJ called Kool Herc noticed something.',
      ja: 'Kool Hercと呼ばれるDJが、あることに気づいた。',
      note: 'called Kool Herc が後ろから A DJ を説明している',
      sentence: 'A DJ called Kool Herc noticed something.' },
    { en: 'Dancers went wild during the drum break — the short part with no singing.',
      ja: '踊り手は、歌の入らない短い部分＝ドラムのブレイクで熱狂した。',
      note: 'with no singing が後ろから the short part を説明',
      sentence: 'Dancers went wild during the drum break — the short part with no singing.' },
  ],
  trap: [
    { bad: 'the called Herc DJ', good: 'the DJ called Herc',
      why: '日本語の語順で前に置くと通じない。<b>説明は後ろ</b>' },
  ],
},

{
  id: 'prep', step: 2,
  title: 'Prepositions', titleJa: '前置詞 ── 場所と時をつなぐ',
  why: '前置詞は数が多くて嫌われますが、<b>よく使うのは10個ほど</b>です。' +
       '日本語の助詞（に・で・へ）にあたるもので、<b>感覚をつかめば丸暗記は不要</b>です。',
  rules: [
    '<b>in</b>：中／広い場所・年月（in the Bronx, in 1973）',
    '<b>at</b>：点／狭い場所・時刻（at a party, at eight）',
    '<b>on</b>：接している／曜日・日付（on the record, on Monday）',
    '<b>with</b>：一緒に／持っている（with no singing＝歌なしで）',
    '<b>場所は「狭い→広い」、時は「小さい→大きい」の順</b>に並べる',
  ],
  ex: [
    { en: 'It started at a house party in the Bronx in 1973.',
      ja: '1973年にブロンクスの家のパーティーで始まった。',
      note: 'at（狭い）→ in the Bronx（広い）→ in 1973（時）。この順番が英語' },
    { en: "He's from the block.",
      ja: '彼は地元育ちだ。',
      note: 'from は出身。ヒップホップで最も大事な概念のひとつ' },
  ],
  trap: [
    { bad: 'in 1973 in the Bronx at a party it started', good: 'It started at a party in the Bronx in 1973.',
      why: '日本語の順で並べない。狭い場所から始めて、時で締める' },
  ],
},

/* ============ STEP 3：広げる ============ */
{
  id: 'modal', step: 3,
  title: 'Modal Verbs', titleJa: '助動詞 ── 気持ちを乗せる',
  why: '助動詞は<b>話し手の気持ち</b>を足す道具です。事実だけを言うのと、' +
       '「〜かもしれない」「〜すべきだ」と含みを持たせるのでは、会話の柔らかさが全く違います。' +
       '<b>would と should が使えると、一気に大人の英語になります。</b>',
  rules: [
    '<b>助動詞のあとの動詞は必ず原形</b>。can plays ではなく can play',
    '<b>can</b>できる／<b>will</b>するつもり／<b>may</b>かもしれない',
    '<b>should</b>したほうがいい（提案）／<b>would</b>〜だろう（控えめ・仮定）',
    '<b>柔らかく言いたいときは would を使う</b>。I would say 〜（〜だと思うけどね）',
  ],
  ex: [
    { en: 'You should check this out.',
      ja: 'これ聴いてみなよ。',
      note: 'should は「命令」ではなく「勧め」。押しつけにならない' },
    { en: "I'd argue he's just consistent, not underrated.",
      ja: '過小評価というより、単に安定してるだけだと思うな。',
      note: "I would argue（I'd argue）は「私はこう主張したい」。議論で角が立たない言い方" },
    { en: 'You shoulda been there.',
      ja: '君も来ればよかったのに。',
      note: 'should have → shoulda。「〜すればよかった」の後悔' },
  ],
  trap: [
    { bad: 'He can plays the drums.', good: 'He can play the drums.',
      why: '助動詞のあとは原形。-s は付かない' },
  ],
},

{
  id: 'progressive', step: 3,
  title: 'Progressive', titleJa: '進行形 ── いま起きている',
  why: '<b>be動詞 + -ing</b> で「いま最中」を表します。' +
       '日本語の「〜している」とほぼ同じなので、日本人には比較的やさしい形です。' +
       'ただし<b>be動詞を落とすと文にならない</b>ので、そこだけ注意。',
  rules: [
    '<b>be + -ing</b>。I am listening. / He was playing.',
    '「いま最中」だけでなく、<b>最近の傾向</b>も表す。I\'m listening to a lot of jazz these days.',
    '<b>状態を表す動詞は進行形にしない</b>。know, like, want など',
    '会話では <b>-ing の g が落ちる</b>（listenin\'）。聞き取りで戸惑わないように',
  ],
  ex: [
    { en: "I'm just vibing to this album.",
      ja: 'このアルバム、ただ気持ちよく聴いてる。',
      note: 'vibe は「波長が合う・いい感じでいる」。進行形で使うのが定番' },
    { en: 'The internet was quietly taking record sales apart.',
      ja: 'インターネットが静かにレコードの売上を解体していた。',
      note: 'was taking＝過去のある時点で進行中だった' },
  ],
  trap: [
    { bad: 'I listening to music.', good: "I'm listening to music.",
      why: 'be動詞を落とさない。ここが抜けると文として成立しない' },
    { bad: "I'm knowing him.", good: 'I know him.',
      why: 'know は状態。進行形にしない' },
  ],
},

{
  id: 'perfect', step: 3,
  title: 'Present Perfect', titleJa: '完了形 ── 過去と今をつなぐ',
  why: '日本語に対応する形がないので、日本人が最後まで苦労する項目です。' +
       'コツは<b>「過去の話」ではなく「今どうなっているか」の話</b>だと捉えること。' +
       '<b>have + 過去分詞</b>＝「その結果、今こうだ」。',
  rules: [
    '<b>have / has + 過去分詞</b>',
    '<b>経験</b>：Have you heard it?（もう聴いた？＝今知ってる？）',
    '<b>継続</b>：I\'ve had it on repeat all week.（今週ずっとリピートしてる）',
    '<b>過去形との違い</b>：I heard it.（あのとき聴いた）／I\'ve heard it.（聴いたことがある＝今知ってる）',
    '<b>yesterday など「過去の一点」とは一緒に使えない</b>',
  ],
  ex: [
    { en: 'Have you heard the new album?',
      ja: '新しいアルバム聴いた？',
      note: '「もう聴いた？」＝今の状態を聞いている。Did you hear より自然' },
    { en: "Same, I've had it on repeat all week.",
      ja: '同じ、今週ずっとリピートしてる。',
      note: '先週から今まで続いている＝継続' },
    { en: "I've been meaning to listen to it.",
      ja: '聴こうと思ってはいたんだ。',
      note: 'have been meaning to は「ずっとそう思っていた」。言い訳の定型句' },
  ],
  trap: [
    { bad: 'I have heard it yesterday.', good: 'I heard it yesterday.',
      why: 'yesterday は過去の一点。完了形とは同居できない' },
  ],
},

{
  id: 'passive', step: 3,
  title: 'Passive Voice', titleJa: '受動態 ── される側から言う',
  why: '<b>be + 過去分詞</b>で「〜される」。' +
       '「誰がやったか」を言わずに済むので、<b>歴史や事実の説明で多用されます</b>。' +
       'このアプリの本文にも頻繁に出てきます。',
  rules: [
    '<b>be + 過去分詞</b>。It was sampled.（サンプリングされた）',
    '<b>誰がやったかを言う必要があれば by 〜</b>',
    '<b>やった人が分からない・重要でないときに使う</b>',
    '<b>get + 過去分詞</b>は口語版。He got booed.（ブーイングされた）',
  ],
  ex: [
    { en: 'Music programs in schools were cut.',
      ja: '学校の音楽の授業は打ち切られた。',
      note: '誰が切ったかは言っていない。事実だけを述べる形' },
    { en: 'In 1995 OutKast won a New York award and got booed.',
      ja: '1995年、OutKastはニューヨークの賞を獲り、ブーイングを浴びた。',
      note: 'got booed＝受動態の口語形。was booed より生っぽい' },
  ],
  trap: [
    { bad: 'The album released last year.', good: 'The album was released last year.',
      why: 'アルバムは自分では出せない。される側なので be + 過去分詞' },
  ],
},

/* ============ STEP 4：仕上げ ============ */
{
  id: 'toing', step: 4,
  title: 'To-infinitive & Gerund', titleJa: 'to不定詞と動名詞',
  why: '動詞を<b>名詞のように使う</b>方法が2つあります。' +
       '<b>to + 動詞</b>は「これから／目的」、<b>-ing</b>は「すでに／事実」。' +
       'この感覚の差だけ押さえれば、どちらを使うかで悩まなくなります。',
  rules: [
    '<b>to + 動詞原形</b>：これから・目的（I want to learn＝学びたい）',
    '<b>動詞 + -ing</b>：すでに・一般的な事実（I enjoy learning＝学ぶのが楽しい）',
    '<b>to だけをとる動詞</b>：want, decide, hope, need',
    '<b>-ing だけをとる動詞</b>：enjoy, finish, stop, keep',
    '会話では <b>trying to → tryna</b> のように縮む',
  ],
  ex: [
    { en: "I'm tryna learn English.",
      ja: '英語を身につけようとしてる。',
      note: 'trying to の縮約。ラップと日常会話の両方で最頻出' },
    { en: 'It took him ten years to make it.',
      ja: '成功するのに10年かかった。',
      note: 'It takes 人 時間 to do＝「〜するのに時間がかかる」。型で覚える' },
    { en: 'Keep it real.',
      ja: '嘘をつくな。自分を偽るな。',
      note: 'keep + 目的語 + 形容詞。ヒップホップの中心的な価値観' },
  ],
  trap: [
    { bad: 'I enjoy to listen music.', good: 'I enjoy listening to music.',
      why: 'enjoy は -ing。あと listen には to が要る' },
  ],
},

{
  id: 'relative', step: 4,
  title: 'Relative Clauses', titleJa: '関係代名詞 ── 文で名詞を説明する',
  why: '「後ろから説明する」の発展形です。<b>単語ではなく文まるごとで名詞を飾ります</b>。' +
       'これが読めると長い文が一気に読めるようになります。' +
       '<b>会話では who / that を省くことが多い</b>ので、聞き取りではその前提で構えてください。',
  rules: [
    '<b>who</b>（人）／<b>which・that</b>（もの）',
    '<b>名詞 + who/that + 文</b>の形。the guy who made this beat',
    '<b>目的語の位置なら省ける</b>。the album (that) I bought',
    '前項の「後ろから説明」と同じ発想。<b>who is / which is を省くと分詞の形になる</b>',
  ],
  ex: [
    { en: 'Kanye West arrived as a producer who wanted to rap about being insecure.',
      ja: 'Kanye Westは、弱さについてラップしたいプロデューサーとして現れた。',
      note: 'who 以下がまるごと a producer を説明している' },
    { en: "Depends on what you mean by greatest.",
      ja: '「最高」の定義によるね。',
      note: 'what＝「〜すること・もの」。議論で便利' },
  ],
  trap: [
    { bad: 'The guy which made this beat', good: 'The guy who made this beat',
      why: '人には who。ものには which / that' },
  ],
},

{
  id: 'article', step: 4,
  title: 'Articles', titleJa: '冠詞 a / the ── 日本語にない感覚',
  why: '日本語に無いので<b>完璧にはなりません。それでいい</b>と割り切ってください。' +
       'ただし<b>大まかな原則</b>だけ知っていると、通じ方が変わります。間違えても意味は伝わります。',
  rules: [
    '<b>a / an</b>：相手が知らない・どれでもいい1つ（a DJ＝あるDJ）',
    '<b>the</b>：<b>お互いに「あれ」と分かっているもの</b>（the album＝いま話しているあのアルバム）',
    '<b>1回目は a、2回目からは the</b>。これが基本の流れ',
    '<b>数えられない名詞には a を付けない</b>（music, money, advice）',
    '固有名詞にも付かない（Nas, New York）',
  ],
  ex: [
    { en: 'A DJ called Kool Herc noticed something. ... So he used two copies of the same record.',
      ja: 'あるDJが気づいた。…そこで彼は同じレコードを2枚使った。',
      note: '初登場は A DJ。既に話題にした「その」レコードは the same record' },
    { en: "That's a banger.",
      ja: 'それは盛り上がる曲だ。',
      note: '数ある中の1つ＝a。特定していない' },
  ],
  trap: [
    { bad: 'I like a hip hop.', good: 'I like hip hop.',
      why: 'ジャンル名や数えられないものに a は付けない' },
    { bad: 'He is best rapper.', good: 'He is the best rapper.',
      why: '最上級には the。1つに決まるので' },
  ],
},

{
  id: 'reduction', step: 4,
  title: 'Spoken Reductions', titleJa: '会話の縮約 ── 教科書に無い本番',
  why: '<b>ネイティブの会話はほぼ全部これです。</b>文法を完璧にしても、' +
       'この形を知らないと一言も聞き取れません。<b>「発音・縮約」モードと合わせて練習してください。</b>',
  rules: [
    '<b>going to → gonna</b> / want to → wanna / got to → gotta',
    '<b>trying to → tryna</b> / about to → boutta / I\'m going to → imma',
    '<b>them → \'em</b>（th が消える）',
    '<b>ain\'t</b> は is not / are not / am not / has not を全部まとめた否定',
    '<b>t が「ラ行」に化ける</b>（water→ワラー、gotta→ガラ）',
  ],
  ex: [
    { en: "Imma call you later.",
      ja: 'あとで電話するわ。',
      note: 'I am going to が1音節に潰れている' },
    { en: "I told 'em already.",
      ja: 'もう言ってあるよ。',
      note: 'them の th が完全に消える' },
    { en: "That ain't my style.",
      ja: 'それは俺の趣味じゃない。',
      note: "ain't は便利だが、仕事の場では使わない" },
  ],
  trap: [
    { bad: '（書き言葉で）Imma send you the report.', good: 'I will send you the report.',
      why: '縮約は<b>会話専用</b>。メールや書類では正式な形を使う' },
  ],
},
];

/* 学習の段階 */
const GRAMMAR_STEPS = [
  { n: 1, title: '土台', sub: 'まずこの3つ。ここが英語の骨組み' },
  { n: 2, title: '骨格', sub: '時間・質問・後ろから説明。会話がここで回り出す' },
  { n: 3, title: '広げる', sub: '気持ちを乗せる・時間の幅を出す' },
  { n: 4, title: '仕上げ', sub: '長い文が読めるようになる。縮約は聞き取りの本番' },
];
