/* ===========================================================
   ヒップホップ史データ
   ・en は学習用の英文（中学英会話＋αで読める語彙に抑えてある）
   ・ja は対訳。直訳ではなく自然な日本語
   ・terms はその時代を語るのに要る英単語
   ・listen は聴くための検索リンク（曲そのものは埋め込まない）
   時代を足したいときは、この配列に同じ形で追加するだけ。
   =========================================================== */

const ERAS = [
  /* ------------------------------------------------------- */
  {
    id: 'origins',
    years: '1973–1979',
    title: 'The Birth of Hip Hop',
    titleJa: 'ヒップホップの誕生',
    place: 'South Bronx, New York',
    color: '#E8A33D',
    en: [
      "Hip hop started at a house party in the Bronx in 1973.",
      "A DJ called Kool Herc noticed something. Dancers went wild during the drum break — the short part with no singing.",
      "So he used two copies of the same record and played that break over and over. He called it the break beat.",
      "The city was broke and burning. Music programs in schools were cut. Kids had turntables instead of instruments.",
      "Four elements grew out of those parties: DJing, MCing, breaking, and graffiti.",
      "Nobody was making money yet. It was block parties, parks, and stolen electricity from street lamps.",
    ],
    ja: [
      "ヒップホップは1973年、ブロンクスのある家のパーティーから始まった。",
      "Kool Herc というDJが気づいた。踊り手は「ブレイク」——歌の入らないドラムだけの短い部分——で一番盛り上がる。",
      "そこで彼は同じレコードを2枚使い、その部分だけを繰り返した。これがブレイクビーツ。",
      "当時の街は財政破綻し、火事が絶えなかった。学校の音楽の授業は打ち切られた。子どもたちは楽器の代わりにターンテーブルを持った。",
      "パーティーから4つの要素が育った。DJ、MC、ブレイクダンス、グラフィティ。",
      "まだ誰も稼いでいない。公園とブロックパーティー、電源は街灯から拝借していた。",
    ],
    figures: [
      { name: 'DJ Kool Herc', role: 'The originator', note: 'ジャマイカ移民。ブレイクビーツの発明者' },
      { name: 'Afrika Bambaataa', role: 'The organizer', note: 'ギャングを音楽に転向させた Zulu Nation の創設者' },
      { name: 'Grandmaster Flash', role: 'The technician', note: 'スクラッチとミックスの技術を確立' },
    ],
    terms: [
      { en: 'break', ja: 'ブレイク（歌のないドラムだけの部分）' },
      { en: 'turntable', ja: 'ターンテーブル、レコードプレーヤー' },
      { en: 'block party', ja: '通りを封鎖してやる近所のパーティー' },
      { en: 'crate digging', ja: 'レコード箱を漁ってネタを探すこと' },
      { en: 'the four elements', ja: '4大要素（DJ・MC・ダンス・グラフィティ）' },
    ],
    listen: [
      { artist: 'The Incredible Bongo Band', track: 'Apache', year: 1973, why: '最も使われたブレイクの一つ' },
      { artist: 'James Brown', track: 'Funky Drummer', year: 1970, why: 'サンプリング史上最多のドラム' },
    ],
  },

  /* ------------------------------------------------------- */
  {
    id: 'oldschool',
    years: '1979–1983',
    title: 'Old School — Hip Hop on Record',
    titleJa: 'オールドスクール ― レコードになった日',
    place: 'New York / New Jersey',
    color: '#D9564F',
    en: [
      "For six years hip hop lived only in parks and clubs. Then in 1979, a small label put it on vinyl.",
      "'Rapper's Delight' was a hit. Suddenly the whole country heard this new sound.",
      "Old school rhymes were simple and made to move a crowd: party, party, keep going.",
      "Then in 1982 came a record that changed the subject. 'The Message' was about poverty and pressure in the city.",
      "It proved rap could report on real life, not just keep a party going.",
      "The look was leather, gold chains, and Adidas. The sound was drum machines.",
    ],
    ja: [
      "6年間、ヒップホップは公園とクラブの中だけにあった。1979年、小さなレーベルがそれをレコードにした。",
      "『Rapper's Delight』がヒット。国中が突然この新しい音を聴いた。",
      "オールドスクールのライムは単純で、客を踊らせるためのものだった。パーティー、パーティー、止めるな。",
      "そして1982年、話題を変える一枚が出る。『The Message』は都市の貧困と重圧を歌った。",
      "ラップは盛り上げ役だけでなく、現実を報告できると証明した。",
      "見た目はレザーと金のチェーンとアディダス。音はドラムマシン。",
    ],
    figures: [
      { name: 'The Sugarhill Gang', role: 'First hit', note: '「Rapper\'s Delight」でラップを商業化' },
      { name: 'Grandmaster Flash & The Furious Five', role: 'First social record', note: '「The Message」で社会を語った' },
      { name: 'Kurtis Blow', role: 'First major deal', note: 'メジャー契約した最初のラッパー' },
    ],
    terms: [
      { en: 'vinyl / record', ja: 'レコード盤' },
      { en: 'label', ja: 'レコード会社、レーベル' },
      { en: 'drum machine', ja: 'ドラムマシン（自動でリズムを鳴らす機械）' },
      { en: 'rhyme', ja: '韻／韻を踏む' },
      { en: 'crowd', ja: '観客、群衆' },
    ],
    listen: [
      { artist: 'The Sugarhill Gang', track: "Rapper's Delight", year: 1979, why: '最初の大ヒット' },
      { artist: 'Grandmaster Flash', track: 'The Message', year: 1982, why: '社会派ラップの原点' },
    ],
  },

  /* ------------------------------------------------------- */
  {
    id: 'newschool',
    years: '1983–1988',
    title: 'New School — Harder and Louder',
    titleJa: 'ニュースクール ― 硬く、大きく',
    place: 'Queens, New York',
    color: '#4C6FD4',
    en: [
      "A group from Queens stripped everything down. No disco band, just drums, guitar, and two loud voices.",
      "Run-DMC wore what regular kids wore: black hats, Adidas with no laces, and jeans.",
      "In 1986 they made a rock song with Aerosmith. It put rap on MTV and sold to white suburbs.",
      "Def Jam, a label started in a college dorm room, became the center of it all.",
      "Rappers stopped being party hosts and became artists with a point of view.",
      "This is when hip hop stopped asking for permission.",
    ],
    ja: [
      "クイーンズ出身のグループが、余計なものを全部削ぎ落とした。ディスコのバンドは無し。ドラムとギターと、大声のふたり。",
      "Run-DMC は普通の若者と同じ格好をした。黒いハット、紐を抜いたアディダス、ジーンズ。",
      "1986年、Aerosmith とロックをやった。ラップがMTVに乗り、白人郊外に売れた。",
      "大学の寮の一室で始まったレーベル Def Jam が、その中心になった。",
      "ラッパーはパーティーの司会をやめ、主張を持つ表現者になった。",
      "ヒップホップが許可を求めるのをやめた時期である。",
    ],
    figures: [
      { name: 'Run-DMC', role: 'The bridge', note: 'ロックと融合させ、MTVに乗せた' },
      { name: 'LL Cool J', role: 'First solo star', note: 'Def Jam の看板。硬派もラブソングも' },
      { name: 'Beastie Boys', role: 'Crossover', note: '白人3人組。パンクからの越境' },
      { name: 'Rick Rubin', role: 'Producer', note: 'Def Jam 共同創設。音を削ぎ落とす手法' },
    ],
    terms: [
      { en: 'sample', ja: 'サンプリング（既存の音を切り取って使う）' },
      { en: 'crossover', ja: '別ジャンルの客層にも売れること' },
      { en: 'mainstream', ja: '主流、一般層' },
      { en: 'suburb', ja: '郊外' },
      { en: 'point of view', ja: '視点、主張' },
    ],
    listen: [
      { artist: 'Run-DMC', track: 'Walk This Way', year: 1986, why: 'ロックとの合流点' },
      { artist: 'LL Cool J', track: 'I Need Love', year: 1987, why: '最初のラップ・ラブソング' },
    ],
  },

  /* ------------------------------------------------------- */
  {
    id: 'golden',
    years: '1988–1996',
    title: 'The Golden Age',
    titleJa: '黄金期',
    place: 'New York',
    color: '#E0B33C',
    en: [
      "Many people call this the best period in hip hop. New styles appeared almost every month.",
      "Producers layered dozens of samples into one track. Sampling laws were still loose, so anything was possible.",
      "Public Enemy made political noise. A Tribe Called Quest made jazz feel cool and calm.",
      "Nas released 'Illmatic' at twenty-one. Many still call it the best rap album ever made.",
      "Wu-Tang Clan came from Staten Island with nine members and kung fu movie samples.",
      "Then lawsuits arrived. After 1991, clearing every sample got expensive, and the dense collage sound faded.",
    ],
    ja: [
      "多くの人がこの時期を最高だと言う。新しいスタイルが毎月のように現れた。",
      "プロデューサーは何十ものサンプルを一曲に重ねた。サンプリングの法規制がまだ緩く、何でもできた。",
      "Public Enemy は政治的な騒音を鳴らし、A Tribe Called Quest はジャズを涼しく響かせた。",
      "Nas は21歳で『Illmatic』を出した。今も史上最高のラップアルバムと呼ばれる。",
      "Wu-Tang Clan はスタテンアイランドから9人で現れ、カンフー映画をサンプリングした。",
      "そこへ訴訟が来る。1991年以降、サンプルの権利処理に金がかかるようになり、あの密な音は消えていった。",
    ],
    figures: [
      { name: 'Nas', role: 'The writer', note: '『Illmatic』。街の描写の精度' },
      { name: 'The Notorious B.I.G.', role: 'The storyteller', note: 'ブルックリン。語り口とフロウ' },
      { name: 'Wu-Tang Clan', role: 'The collective', note: '9人組。RZAの荒いプロダクション' },
      { name: 'A Tribe Called Quest', role: 'Jazz rap', note: 'ジャズをネタにした涼しい音' },
      { name: 'Public Enemy', role: 'The political', note: 'Chuck D の声と密なノイズ' },
    ],
    terms: [
      { en: 'sample clearance', ja: 'サンプルの権利処理' },
      { en: 'producer', ja: 'トラックを作る人' },
      { en: 'lyricist', ja: '歌詞の書き手' },
      { en: 'boom bap', ja: 'ブーンバップ（太いキックとスネアの90s的な音）' },
      { en: 'crew / collective', ja: '集団、チーム' },
      { en: 'lawsuit', ja: '訴訟' },
    ],
    listen: [
      { artist: 'Nas', track: 'N.Y. State of Mind', year: 1994, why: '黄金期の代表曲' },
      { artist: 'A Tribe Called Quest', track: 'Can I Kick It?', year: 1990, why: 'ジャズラップの入口' },
      { artist: 'Wu-Tang Clan', track: 'C.R.E.A.M.', year: 1993, why: '荒い音の象徴' },
    ],
  },

  /* ------------------------------------------------------- */
  {
    id: 'westcoast',
    years: '1988–1996',
    title: 'West Coast & G-Funk',
    titleJa: 'ウェストコーストとGファンク',
    place: 'Los Angeles / Compton',
    color: '#3FA97A',
    en: [
      "While New York got dense and fast, Los Angeles went slow, warm, and wide.",
      "N.W.A. reported what happened in Compton. The FBI sent their label a warning letter.",
      "Dr. Dre then built G-funk: slow tempo, thick bass, and a high whining synth line borrowed from 1970s funk.",
      "It was made for driving with the windows down, and it sold enormously.",
      "The East–West rivalry became personal and then deadly. Both Tupac and Biggie were shot and killed.",
      "After 1997, the fighting stopped being entertainment. The industry changed for good.",
    ],
    ja: [
      "ニューヨークが密で速くなる一方、ロサンゼルスは遅く、温かく、広くなった。",
      "N.W.A. はコンプトンで起きていることを報告した。FBIがレーベルに警告書を送った。",
      "その後 Dr. Dre がGファンクを組み立てる。遅いテンポ、太いベース、70年代ファンク由来の高く鳴くシンセ。",
      "窓を開けて運転するための音楽で、桁違いに売れた。",
      "東西の対立は私怨になり、やがて死者を出す。Tupac と Biggie が銃撃で死亡した。",
      "1997年以降、対立は娯楽ではなくなった。業界は決定的に変わった。",
    ],
    figures: [
      { name: 'N.W.A.', role: 'The reporters', note: 'Compton から。検閲との衝突' },
      { name: 'Dr. Dre', role: 'The architect', note: 'G-funk の設計者。後にEminem, 50 Centを発掘' },
      { name: '2Pac', role: 'The voice', note: '政治性と感情。俳優としても' },
      { name: 'Snoop Dogg', role: 'The flow', note: '力を抜いた独特のフロウ' },
    ],
    terms: [
      { en: 'synth', ja: 'シンセサイザー' },
      { en: 'bass line', ja: 'ベースの旋律' },
      { en: 'tempo', ja: '曲の速さ' },
      { en: 'rivalry / beef', ja: '対立、いさかい（beefは口語）' },
      { en: 'censorship', ja: '検閲' },
      { en: 'lowrider', ja: '車高を下げた改造車。西海岸の象徴' },
    ],
    listen: [
      { artist: 'Dr. Dre', track: 'Nuthin but a G Thang', year: 1992, why: 'G-funkの完成形' },
      { artist: '2Pac', track: 'Dear Mama', year: 1995, why: '感情表現の代表' },
    ],
  },

  /* ------------------------------------------------------- */
  {
    id: 'south',
    years: '1994–2005',
    title: 'The South Takes Over',
    titleJa: '南部の台頭',
    place: 'Atlanta / New Orleans / Houston / Memphis',
    color: '#B15FD6',
    en: [
      "For years, New York and LA acted like the South did not count.",
      "In 1995 OutKast won a New York award and got booed. On stage, André 3000 said the South had something to say.",
      "He was right. Within ten years, Atlanta was the center of rap.",
      "Every southern city built its own sound. Houston slowed songs down. Memphis went dark and rough. New Orleans went fast.",
      "Labels like No Limit and Cash Money sold millions without help from New York.",
      "This is where trap music was born, and trap still shapes pop music worldwide today.",
    ],
    ja: [
      "長年、ニューヨークとLAは南部を数に入れていなかった。",
      "1995年、OutKast がニューヨークの授賞式でブーイングを浴びる。壇上で André 3000 は「南部には言うことがある」と言った。",
      "彼は正しかった。10年のうちにアトランタがラップの中心になる。",
      "南部の各都市が独自の音を作った。ヒューストンは曲を遅くし、メンフィスは暗く粗く、ニューオーリンズは速くした。",
      "No Limit や Cash Money といったレーベルが、ニューヨークの手を借りずに何百万枚も売った。",
      "トラップが生まれたのもここで、トラップは今も世界のポップスを形作っている。",
    ],
    figures: [
      { name: 'OutKast', role: 'The pioneers', note: 'アトランタ。南部の格を上げた' },
      { name: 'UGK / DJ Screw', role: 'Houston', note: '曲を極端に遅くする "chopped and screwed"' },
      { name: 'Three 6 Mafia', role: 'Memphis', note: '暗く粗い音。トラップの祖先' },
      { name: 'Lil Wayne', role: 'New Orleans', note: 'Cash Money。比喩の密度' },
    ],
    terms: [
      { en: 'boo (someone)', ja: 'ブーイングする' },
      { en: 'take over', ja: '主導権を握る、乗っ取る' },
      { en: 'count / not count', ja: '数に入る／入らない、重要とみなす' },
      { en: 'chopped and screwed', ja: '曲を極端に遅くして刻む手法' },
      { en: 'independent label', ja: '大手に属さないレーベル' },
    ],
    listen: [
      { artist: 'OutKast', track: 'Ms. Jackson', year: 2000, why: '南部が世界に届いた曲' },
      { artist: 'Three 6 Mafia', track: 'Sippin on Some Syrup', year: 2000, why: 'トラップ以前の暗い音' },
    ],
  },

  /* ------------------------------------------------------- */
  {
    id: 'mainstream',
    years: '1999–2009',
    title: 'Pop Takeover & the Backpack Reply',
    titleJa: 'ポップ化と、それへの反論',
    place: 'Detroit / Chicago / New York',
    color: '#5BA9CC',
    en: [
      "Rap became the best-selling music in America. That brought money and a problem: it had to sound like pop.",
      "Eminem sold more records than anyone, partly because a white rapper reached listeners who never bought rap before.",
      "50 Cent turned the mixtape into a weapon and became a business.",
      "Kanye West arrived as a producer who wanted to rap about being insecure, not being tough.",
      "Around him, 'backpack rap' pushed back against the pop sound with samples and long verses.",
      "Meanwhile the internet was quietly taking record sales apart.",
    ],
    ja: [
      "ラップはアメリカで最も売れる音楽になった。金が入り、同時に問題も来た。ポップに聞こえねばならない。",
      "Eminem は誰より売った。白人ラッパーが、ラップを買ったことのない層に届いたことも大きい。",
      "50 Cent はミックステープを武器に変え、ビジネスそのものになった。",
      "Kanye West はプロデューサーとして現れ、強がりではなく弱さをラップしたがった。",
      "その周辺で「バックパック・ラップ」が、サンプリングと長いヴァースでポップ化に抵抗した。",
      "その裏で、インターネットが静かにレコードの売上を解体していた。",
    ],
    figures: [
      { name: 'Eminem', role: 'The technician', note: '韻の密度と語数。Dr. Dre が見出した' },
      { name: 'Kanye West', role: 'The shift', note: 'プロデューサー出身。テーマを内面へ' },
      { name: '50 Cent', role: 'The businessman', note: 'ミックステープ戦略の完成' },
      { name: 'Jay-Z', role: 'The executive', note: 'ラッパーから経営者へ' },
    ],
    terms: [
      { en: 'mixtape', ja: '正規流通させない無料の作品集' },
      { en: 'verse', ja: 'ヴァース（サビ以外の歌のパート）' },
      { en: 'hook / chorus', ja: 'サビ' },
      { en: 'insecure', ja: '自信がない、不安な' },
      { en: 'push back (against)', ja: '抵抗する、反発する' },
      { en: 'record sales', ja: 'レコード（音源）の売上' },
    ],
    listen: [
      { artist: 'Kanye West', track: 'Through the Wire', year: 2003, why: 'サンプリング回帰の象徴' },
      { artist: 'Eminem', track: 'Lose Yourself', year: 2002, why: '技術と物語' },
    ],
  },

  /* ------------------------------------------------------- */
  {
    id: 'trap',
    years: '2010–2020',
    title: 'The Trap Era',
    titleJa: 'トラップの時代',
    place: 'Atlanta',
    color: '#D64F7A',
    en: [
      "Trap took over everything: rap, pop, K-pop, and adverts.",
      "The recipe is simple to hear. Booming 808 bass, fast rattling hi-hats, and dark synth chords.",
      "Rappers started using Auto-Tune as an instrument, not a repair tool. Melody and rap mixed together.",
      "Streaming changed the rules again. An album could be twenty tracks long because every play counted.",
      "SoundCloud let anyone release music with no label at all.",
      "Some people said rap stopped being about words. Others said the voice had simply become another instrument.",
    ],
    ja: [
      "トラップが全部を飲み込んだ。ラップも、ポップも、K-POPも、CMも。",
      "作り方は聴けば分かる。轟く808のベース、細かく刻むハイハット、暗いシンセの和音。",
      "ラッパーは Auto-Tune を修正道具ではなく楽器として使い始めた。メロディとラップが混ざった。",
      "ストリーミングがまたルールを変えた。再生回数が全てなので、アルバムは20曲入りになった。",
      "SoundCloud は、レーベル無しで誰でも発表できるようにした。",
      "ラップは言葉のものではなくなったと言う人もいた。声がただの楽器になっただけだと言う人もいた。",
    ],
    figures: [
      { name: 'Future', role: 'The mood', note: 'Auto-Tuneで感情を歪ませる手法' },
      { name: 'Migos', role: 'The flow', note: '三連のフロウを一般化させた' },
      { name: 'Kendrick Lamar', role: 'The counterweight', note: '構成と主題で評価された例外的存在' },
      { name: 'Metro Boomin', role: 'The producer', note: 'トラップの音を定義した一人' },
    ],
    terms: [
      { en: '808', ja: '808（太く長く鳴る低音。ドラムマシンの名前から）' },
      { en: 'hi-hat', ja: 'ハイハット（シャカシャカ鳴るシンバル）' },
      { en: 'Auto-Tune', ja: '音程を補正するソフト。効果として使う' },
      { en: 'streaming', ja: 'ストリーミング配信' },
      { en: 'take over', ja: '席巻する' },
      { en: 'count (v.)', ja: '数に入る、意味を持つ' },
    ],
    listen: [
      { artist: 'Migos', track: 'Bad and Boujee', year: 2016, why: '三連フロウの代表' },
      { artist: 'Kendrick Lamar', track: 'HUMBLE.', year: 2017, why: 'トラップ期の批評性' },
    ],
  },

  /* ------------------------------------------------------- */
  {
    id: 'global',
    years: '2012–now',
    title: 'Drill, UK and the Global Map',
    titleJa: 'ドリルとUK、そして世界地図',
    place: 'Chicago → London → Lagos → everywhere',
    color: '#7E8CF0',
    en: [
      "Drill started in Chicago around 2012: slow, cold, and blunt.",
      "London took it and changed the drums, making them slide and skip. UK drill became its own thing.",
      "British rap already had grime, which is faster and shouted, built on London pirate radio.",
      "At the same time, Afrobeats from Nigeria and Ghana went worldwide, and rappers started borrowing its rhythm.",
      "Today the map has no center. Paris, Lagos, Seoul, Tokyo and São Paulo all have their own scenes.",
      "For a learner, this is useful: you can now hear many English accents inside one genre.",
    ],
    ja: [
      "ドリルは2012年頃シカゴで始まった。遅く、冷たく、そっけない。",
      "ロンドンがそれを受け取ってドラムを変え、滑って跳ねるリズムにした。UKドリルは別物になった。",
      "英国にはもともとグライムがあった。速く、怒鳴るように吐く、海賊ラジオ発の音楽だ。",
      "同じ頃、ナイジェリアとガーナのアフロビーツが世界に出て、ラッパーがそのリズムを借り始めた。",
      "今や地図に中心はない。パリ、ラゴス、ソウル、東京、サンパウロにそれぞれの現場がある。",
      "学習者には好都合だ。ひとつのジャンルの中で、多くの英語の訛りが聴けるようになった。",
    ],
    figures: [
      { name: 'Chief Keef', role: 'Chicago drill', note: 'ドリルの起点' },
      { name: 'Central Cee', role: 'UK drill', note: 'ロンドン。英国英語のリスニング教材として優秀' },
      { name: 'Stormzy', role: 'Grime', note: '英国の主流に届いたグライム' },
      { name: 'Burna Boy', role: 'Afrobeats', note: 'ナイジェリア。世界的な広がりの中心' },
    ],
    terms: [
      { en: 'blunt', ja: 'そっけない、率直な' },
      { en: 'accent', ja: '訛り、アクセント' },
      { en: 'scene', ja: 'シーン、その土地の音楽界隈' },
      { en: 'pirate radio', ja: '無許可のラジオ局' },
      { en: 'borrow', ja: '借りる、取り入れる' },
      { en: 'worldwide', ja: '世界中に' },
    ],
    listen: [
      { artist: 'Central Cee', track: 'Doja', year: 2022, why: 'UK英語のリスニングに' },
      { artist: 'Burna Boy', track: 'Last Last', year: 2022, why: 'アフロビーツの入口' },
    ],
  },

  /* ------------------------------------------------------- */
  {
    id: 'offshoots',
    years: 'parallel',
    title: 'The Offshoots — Soul, Jazz and R&B',
    titleJa: '派生 ― ソウル、ジャズ、R&B',
    place: 'everywhere',
    color: '#4FBFA8',
    en: [
      "Hip hop never grew alone. It took from soul and jazz, and then gave something back.",
      "Neo-soul in the 1990s used live musicians and hip hop drums at the same time.",
      "Jazz rap did the opposite: rappers over upright bass and horns.",
      "In the 2010s, artists stopped choosing. One album could be rap, soul, funk and gospel at once.",
      "For listening practice these styles are the easiest place to start. The tempo is slower and the words are clearer.",
      "If fast rap is hard to follow, begin here and work backwards.",
    ],
    ja: [
      "ヒップホップは単独で育っていない。ソウルとジャズから取り、そして返した。",
      "90年代のネオソウルは、生演奏とヒップホップのドラムを同時に使った。",
      "ジャズラップは逆をやった。ウッドベースとホーンの上でラップする。",
      "2010年代には、もう選ばなくなった。一枚の中でラップもソウルもファンクもゴスペルも鳴る。",
      "リスニング練習にはこの層が一番入りやすい。テンポが遅く、言葉がはっきりしている。",
      "速いラップが追えないなら、ここから始めて遡るとよい。",
    ],
    figures: [
      { name: "D'Angelo", role: 'Neo-soul', note: '生演奏とヒップホップの間' },
      { name: 'Erykah Badu', role: 'Neo-soul', note: '発音が明瞭で聴き取りやすい' },
      { name: 'Anderson .Paak', role: 'Modern fusion', note: 'ドラムを叩きながら歌う' },
      { name: 'A Tribe Called Quest', role: 'Jazz rap', note: 'ジャズラップの基準点' },
    ],
    terms: [
      { en: 'live musicians', ja: '生演奏の演奏者' },
      { en: 'horn', ja: '管楽器' },
      { en: 'upright bass', ja: 'ウッドベース' },
      { en: 'work backwards', ja: '遡って辿る' },
      { en: 'follow (a song)', ja: '（歌詞を）追う、聞き取る' },
    ],
    listen: [
      { artist: 'Erykah Badu', track: 'On & On', year: 1997, why: '発音が明瞭で聴きやすい' },
      { artist: 'Anderson .Paak', track: 'Come Down', year: 2016, why: '現代の融合形' },
    ],
  },
];
