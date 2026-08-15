/* ===========================================================
   知識クイズ（英語で出題 → 読解の練習も兼ねる）
   q      : 英語の問題文
   qJa    : 日本語訳（答えたあとに表示）
   choices: 選択肢
   answer : 正解の index
   note   : 解説（日本語）
   era    : 関連する時代 id（history.js の id と対応）
   =========================================================== */

const QUIZ = [
  { q: "In which New York borough did hip hop begin?",
    qJa: "ヒップホップはニューヨークのどの区で始まった？",
    choices: ["Brooklyn", "The Bronx", "Queens", "Harlem"], answer: 1, era: 'origins',
    note: "1973年、サウスブロンクスのアパートのレクリエーションルームが最初の現場。borough は「区」" },

  { q: "What did DJ Kool Herc extend by using two copies of the same record?",
    qJa: "Kool Herc が同じレコード2枚を使って引き伸ばしたものは？",
    choices: ["The chorus", "The intro", "The drum break", "The guitar solo"], answer: 2, era: 'origins',
    note: "歌の入らないドラムだけの部分＝break。これがヒップホップの土台になった" },

  { q: "Which of these is NOT one of the four elements of hip hop?",
    qJa: "ヒップホップの4大要素でないものは？",
    choices: ["DJing", "Breaking", "Producing", "Graffiti"], answer: 2, era: 'origins',
    note: "4要素は DJ・MC・ブレイキン（ダンス）・グラフィティ" },

  { q: "The 1982 song 'The Message' was important because it was about ___.",
    qJa: "1982年の『The Message』が重要だった理由は、それが何について歌ったから？",
    choices: ["Dancing all night", "Life and poverty in the city", "Love", "Cars"], answer: 1, era: 'oldschool',
    note: "パーティー音楽だったラップが、初めて社会を報告した瞬間" },

  { q: "Run-DMC's 1986 collaboration with Aerosmith helped rap reach ___.",
    qJa: "Run-DMC と Aerosmith の1986年の共演が、ラップを何に届けた？",
    choices: ["Jazz clubs", "MTV and rock fans", "Classical radio", "Broadway"], answer: 1, era: 'newschool',
    note: "「Walk This Way」。ラップがMTVに乗り、白人郊外の層に届いた転換点" },

  { q: "Which album did Nas release at the age of 21?",
    qJa: "Nas が21歳で発表したアルバムは？",
    choices: ["Ready to Die", "Illmatic", "The Chronic", "Enter the Wu-Tang"], answer: 1, era: 'golden',
    note: "1994年。史上最高のラップアルバムとしばしば呼ばれる" },

  { q: "What made the dense sampling of the Golden Age fade after 1991?",
    qJa: "黄金期の密なサンプリングが1991年以降に消えた原因は？",
    choices: ["Bad reviews", "Copyright lawsuits", "New dances", "Radio bans"], answer: 1, era: 'golden',
    note: "訴訟でサンプルの権利処理が必要になり、費用が跳ね上がった" },

  { q: "'Boom bap' describes a sound built mainly on ___.",
    qJa: "「ブーンバップ」が指す音の中心は？",
    choices: ["Fast hi-hats", "Hard drums and samples", "Auto-Tune vocals", "Electric guitar"], answer: 1, era: 'golden',
    note: "太いキックとスネアの90年代的な質感。名前は音の擬音から" },

  { q: "Dr. Dre's G-funk style is known for ___.",
    qJa: "Dr. Dre の G-funk の特徴は？",
    choices: ["Slow tempo and high synth lines", "Shouted vocals", "Acoustic guitars", "Very fast drums"], answer: 0, era: 'westcoast',
    note: "遅いテンポ、太いベース、高く鳴くシンセ。70年代ファンクが原料" },

  { q: "At the 1995 Source Awards, André 3000 famously said that ___ had something to say.",
    qJa: "1995年の授賞式で André 3000 が「言うことがある」と言ったのは誰について？",
    choices: ["The East Coast", "The South", "The West Coast", "The UK"], answer: 1, era: 'south',
    note: "ブーイングを浴びた壇上での一言。南部台頭の号砲になった" },

  { q: "'Chopped and screwed' means the track is ___.",
    qJa: "「chopped and screwed」とは曲をどうすること？",
    choices: ["Sped up", "Slowed down and cut up", "Played backwards", "Recorded live"], answer: 1, era: 'south',
    note: "ヒューストンの DJ Screw が生んだ手法。極端に遅くして刻む" },

  { q: "Which city is most associated with trap music?",
    qJa: "トラップと最も結びつきの強い都市は？",
    choices: ["Atlanta", "Detroit", "Philadelphia", "Miami"], answer: 0, era: 'trap',
    note: "アトランタ。2010年代に世界のポップスの標準になった" },

  { q: "In trap, the '808' refers to ___.",
    qJa: "トラップにおける「808」とは？",
    choices: ["A tempo", "A deep bass sound", "A studio", "A year"], answer: 1, era: 'trap',
    note: "Roland TR-808 というドラムマシン由来。長く伸びる低音を指す" },

  { q: "Auto-Tune was originally made to ___.",
    qJa: "Auto-Tune はもともと何のために作られた？",
    choices: ["Add echo", "Correct pitch", "Slow down songs", "Remove noise"], answer: 1, era: 'trap',
    note: "音程の修正ツール。それを効果として使ったのが表現になった" },

  { q: "UK drill developed from Chicago drill by changing the ___.",
    qJa: "UKドリルはシカゴのドリルの何を変えて生まれた？",
    choices: ["Language", "Drum patterns", "Album covers", "Song length"], answer: 1, era: 'global',
    note: "滑って跳ねるドラムに変えたことで別のジャンルになった" },

  { q: "Grime came out of London's ___.",
    qJa: "グライムはロンドンの何から生まれた？",
    choices: ["Opera houses", "Pirate radio", "Jazz clubs", "Churches"], answer: 1, era: 'global',
    note: "無許可のラジオ局。速く、怒鳴るように吐くスタイル" },

  { q: "Afrobeats came mainly from ___.",
    qJa: "アフロビーツは主にどこから来た？",
    choices: ["Nigeria and Ghana", "Kenya", "South Africa", "Egypt"], answer: 0, era: 'global',
    note: "2010年代後半から世界的に広がった" },

  { q: "Which style is usually easiest for English learners to follow?",
    qJa: "英語学習者が一番聞き取りやすいのは？",
    choices: ["Fast drill", "Neo-soul", "Hardcore rap", "Grime"], answer: 1, era: 'offshoots',
    note: "テンポが遅く発音が明瞭。ここから始めて遡るのが現実的" },

  /* ---------- 語彙クイズ（英語の意味を問う） ---------- */
  { q: "If someone says a song 'goes hard', they mean it is ___.",
    qJa: "曲が goes hard とは、どういう意味？",
    choices: ["Difficult to play", "Powerful and great", "Too loud", "Old"], answer: 1, era: null,
    note: "hard は「難しい」ではなく「硬派でかっこいい」。goes hard で1つの塊" },

  { q: "'Don't sleep on this album' means ___.",
    qJa: "Don't sleep on this album の意味は？",
    choices: ["Don't fall asleep", "Don't overlook it", "Don't buy it", "Don't play it at night"], answer: 1, era: null,
    note: "sleep on ～ で「良さに気づかず見過ごす」。頻出表現" },

  { q: "If a track 'grew on you', it means ___.",
    qJa: "It grew on me の意味は？",
    choices: ["You liked it immediately", "You came to like it over time", "You wrote it", "You forgot it"], answer: 1, era: null,
    note: "音楽の感想で最も使える表現のひとつ" },

  { q: "'No cap' means ___.",
    qJa: "No cap の意味は？",
    choices: ["No hat", "I'm not lying", "No limit", "Not finished"], answer: 1, era: null,
    note: "cap = 嘘。文末につけて「マジで」" },

  { q: "'My bad' is used to ___.",
    qJa: "My bad はどんなときに使う？",
    choices: ["Complain", "Apologize lightly", "Praise someone", "Say goodbye"], answer: 1, era: null,
    note: "軽い謝罪。sorry より気楽で日常的" },

  { q: "An 'OG' is someone who is ___.",
    qJa: "OG とはどんな人？",
    choices: ["New to the scene", "Experienced and respected", "Very rich", "A producer"], answer: 1, era: null,
    note: "original gangster の略だが、今は「元祖・ベテラン」として広く使う" },

  { q: "'The GOAT' stands for ___.",
    qJa: "GOAT は何の略？",
    choices: ["Greatest Of All Time", "Group Of Artists Together", "Good Old Alternative Track", "Get Off All Trends"], answer: 0, era: null,
    note: "スポーツでも音楽でも使う。🐐 の絵文字で表すことも" },

  { q: "If you're 'tryna' do something, you are ___.",
    qJa: "tryna の意味は？",
    choices: ["Tired of it", "Trying to do it", "Not doing it", "Finished with it"], answer: 1, era: null,
    note: "trying to の縮約。ラップと日常会話の両方で頻出" },

  { q: "'Imma' is short for ___.",
    qJa: "Imma は何の短縮？",
    choices: ["I am not", "I'm going to", "I made a", "I must"], answer: 1, era: null,
    note: "I'm going to が1音節に潰れた形" },

  { q: "In 'I told 'em already', 'em means ___.",
    qJa: "'em は何を指す？",
    choices: ["him", "them", "me", "us"], answer: 1, era: null,
    note: "them の th が消えた形。会話ではほぼ常にこう発音される" },

  { q: "If a rapper is 'underrated', people ___.",
    qJa: "underrated とは？",
    choices: ["Praise him too much", "Don't appreciate him enough", "Have never heard him", "Dislike him"], answer: 1, era: null,
    note: "反対は overrated。音楽の議論で最も使う対の語" },

  { q: "'Real talk' at the start of a sentence means ___.",
    qJa: "文頭の Real talk はどういう合図？",
    choices: ["I'm joking", "I'm being honest now", "Let's change topic", "I'm angry"], answer: 1, era: null,
    note: "honestly と同じ働き。本音を切り出す合図" },

  { q: "If someone replies 'Bet.', they are ___.",
    qJa: "返事の Bet. はどういう意味？",
    choices: ["Refusing", "Agreeing", "Asking a question", "Gambling"], answer: 1, era: null,
    note: "OK の現代版。賭けの意味ではない" },
];
