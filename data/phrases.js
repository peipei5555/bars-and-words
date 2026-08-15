/* ===========================================================
   音楽を語るための英会話
   場面ごとの実用フレーズ。すべて書き下ろしで、歌詞の引用ではない。
   scene : 場面
   en/ja : フレーズと訳
   reply : 想定される返し（会話として練習できるように）
   =========================================================== */

const TALK = [
  /* ---------- 好みを聞く・言う ---------- */
  { scene: 'ask', sceneJa: '好みを聞く', en: "Who's your favorite MC?", ja: "好きなラッパーは誰？",
    reply: "Hard to pick just one, but probably Nas.", replyJa: "一人に絞るのは難しいけど、たぶんNasかな。" },
  { scene: 'ask', sceneJa: '好みを聞く', en: "What are you into these days?", ja: "最近は何にハマってる？",
    reply: "Mostly 90s stuff lately.", replyJa: "最近はだいたい90年代のやつだね。" },
  { scene: 'ask', sceneJa: '好みを聞く', en: "Have you heard the new album?", ja: "新しいアルバム聴いた？",
    reply: "Not yet. Is it any good?", replyJa: "まだ。良かった？" },
  { scene: 'ask', sceneJa: '好みを聞く', en: "What got you into hip hop?", ja: "何がきっかけでヒップホップを聴くようになったの？",
    reply: "My older brother played it all the time.", replyJa: "兄がずっとかけてたんだ。" },
  { scene: 'ask', sceneJa: '好みを聞く', en: "Where should I start with him?", ja: "彼のどれから聴けばいい？",
    reply: "Start with his second album. It's the most accessible.", replyJa: "2枚目からがいいよ。一番とっつきやすい。" },

  /* ---------- 感想を言う ---------- */
  { scene: 'react', sceneJa: '感想を言う', en: "That beat goes hard.", ja: "あのビート、効くわ。",
    reply: "Right? The bass is insane.", replyJa: "だよね？ベースがやばい。" },
  { scene: 'react', sceneJa: '感想を言う', en: "It didn't click at first, but it grew on me.", ja: "最初はピンとこなかったけど、だんだん好きになった。",
    reply: "Same. It takes a few listens.", replyJa: "同じ。何回か聴かないとね。" },
  { scene: 'react', sceneJa: '感想を言う', en: "Honestly, I think it's overrated.", ja: "正直、持ち上げられすぎだと思う。",
    reply: "I get that, but the production is still great.", replyJa: "分かるよ、でもトラックは今でも素晴らしい。" },
  { scene: 'react', sceneJa: '感想を言う', en: "This one hits different at night.", ja: "これ、夜に聴くと全然違う。",
    reply: "Facts. It's a late-night album.", replyJa: "それな。夜向けのアルバムだよ。" },
  { scene: 'react', sceneJa: '感想を言う', en: "The hook is stuck in my head.", ja: "サビが頭から離れない。",
    reply: "Same, I've had it on repeat all week.", replyJa: "同じ、今週ずっとリピートしてる。" },
  { scene: 'react', sceneJa: '感想を言う', en: "His flow on that verse is crazy.", ja: "あのヴァースのフロウ、とんでもない。",
    reply: "He doesn't even take a breath.", replyJa: "息継ぎすらしてないよね。" },

  /* ---------- 勧める ---------- */
  { scene: 'recommend', sceneJa: '勧める', en: "You should check this out.", ja: "これ聴いてみなよ。",
    reply: "Send it to me.", replyJa: "送っといて。" },
  { scene: 'recommend', sceneJa: '勧める', en: "Don't sleep on this album.", ja: "このアルバム、見逃すなよ。",
    reply: "I've been meaning to listen to it.", replyJa: "聴こうと思ってはいたんだ。" },
  { scene: 'recommend', sceneJa: '勧める', en: "If you like that, you'll love this.", ja: "それが好きなら、これは絶対好きだよ。",
    reply: "Alright, I trust you.", replyJa: "分かった、信じるよ。" },
  { scene: 'recommend', sceneJa: '勧める', en: "It's a deep cut, but it's my favorite.", ja: "隠れた曲だけど、一番好きなんだ。",
    reply: "Never heard of it. Play it.", replyJa: "知らない。かけてよ。" },

  /* ---------- 議論する ---------- */
  { scene: 'debate', sceneJa: '議論する', en: "He's the most underrated rapper alive.", ja: "今生きてる中で一番過小評価されてる。",
    reply: "I'd argue he's just consistent, not underrated.", replyJa: "過小評価というより、単に安定してるだけだと思うな。" },
  { scene: 'debate', sceneJa: '議論する', en: "For me, it's still his best work.", ja: "俺にとっては今でも彼の最高傑作だ。",
    reply: "See, I'd go with the first one.", replyJa: "いや、俺なら1枚目を選ぶな。" },
  { scene: 'debate', sceneJa: '議論する', en: "I see what you mean, but I don't agree.", ja: "言いたいことは分かる、でも同意はしない。",
    reply: "Fair enough.", replyJa: "まあ、それもそうだね。" },
  { scene: 'debate', sceneJa: '議論する', en: "That's a hot take.", ja: "それは思い切った意見だな。",
    reply: "I'll die on this hill.", replyJa: "この意見は譲らないよ。" },
  { scene: 'debate', sceneJa: '議論する', en: "Who's the GOAT, in your opinion?", ja: "君の意見では、史上最高は誰？",
    reply: "Depends on what you mean by greatest.", replyJa: "「最高」の定義によるね。" },

  /* ---------- ライブ・現場 ---------- */
  { scene: 'live', sceneJa: 'ライブの話', en: "Are you going to the show?", ja: "ライブ行く？",
    reply: "I couldn't get tickets. They sold out in minutes.", replyJa: "チケット取れなかった。数分で完売だった。" },
  { scene: 'live', sceneJa: 'ライブの話', en: "The crowd went crazy.", ja: "客がめちゃくちゃ盛り上がった。",
    reply: "I bet. That song always does it.", replyJa: "だろうね。あの曲はいつもそうなる。" },
  { scene: 'live', sceneJa: 'ライブの話', en: "He sounds even better live.", ja: "ライブだともっといい。",
    reply: "That's rare these days.", replyJa: "最近だと珍しいよね。" },
  { scene: 'live', sceneJa: 'ライブの話', en: "Turn it up.", ja: "音量上げて。",
    reply: "Say less.", replyJa: "言わなくても分かってる。" },

  /* ---------- 自分のことを話す ---------- */
  { scene: 'self', sceneJa: '自分の話', en: "I'm still learning English, so bear with me.", ja: "まだ英語を勉強中だから、大目に見てね。",
    reply: "You're doing great, take your time.", replyJa: "上手だよ、ゆっくりでいい。" },
  { scene: 'self', sceneJa: '自分の話', en: "I use music to practice listening.", ja: "リスニングの練習に音楽を使ってる。",
    reply: "That's actually the best way.", replyJa: "実際それが一番いい方法だよ。" },
  { scene: 'self', sceneJa: '自分の話', en: "Could you say that again, slower?", ja: "もう一回、ゆっくり言ってもらえる？",
    reply: "Of course. No rush.", replyJa: "もちろん。急がなくていいよ。" },
  { scene: 'self', sceneJa: '自分の話', en: "What does that mean?", ja: "それどういう意味？",
    reply: "It just means 'really good'.", replyJa: "「すごくいい」って意味だよ。" },
  { scene: 'self', sceneJa: '自分の話', en: "I couldn't catch that.", ja: "聞き取れなかった。",
    reply: "My bad, I talk too fast.", replyJa: "ごめん、早口すぎたね。" },
];

const TALK_SCENES = {
  ask:       { ja: '好みを聞く',   emoji: '❓' },
  react:     { ja: '感想を言う',   emoji: '💭' },
  recommend: { ja: '勧める',       emoji: '👉' },
  debate:    { ja: '議論する',     emoji: '⚖️' },
  live:      { ja: 'ライブの話',   emoji: '🎤' },
  self:      { ja: '自分の話',     emoji: '🙋' },
};
