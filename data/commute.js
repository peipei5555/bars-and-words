/* ===========================================================
   通勤モード用データ
   ヒップホップ教材とは別枠。日常会話に絞った実用フレーズ。
   カテゴリ: greet(あいさつ) / small(雑談) / travel(移動) / work(仕事) / eat(食事)
   増やすときはこのファイルだけ触ればいい（SHADOW / DRILLS に足すだけ）。
   =========================================================== */

'use strict';

const COMMUTE_CATS = {
  greet:  { emoji: '👋', ja: 'あいさつ・自己紹介' },
  small:  { emoji: '☕', ja: '雑談' },
  travel: { emoji: '✈️', ja: '移動' },
  work:   { emoji: '💼', ja: '仕事の話' },
  eat:    { emoji: '🍽️', ja: '食事・買い物' },
};

/* シャドーイング用の短いフレーズ。TTSが読み上げ、声を出さず口だけ追いかける用途 */
const SHADOW = [
  // greet
  { cat: 'greet', en: "Hi, nice to meet you. I'm Pei.", ja: "はじめまして、ペイです。" },
  { cat: 'greet', en: "How are you doing today?", ja: "今日の調子はどうですか？" },
  { cat: 'greet', en: "I'm doing well, thanks. How about you?", ja: "元気です、ありがとう。そちらは？" },
  { cat: 'greet', en: "This is my first time meeting you in person.", ja: "直接お会いするのは初めてですね。" },
  { cat: 'greet', en: "I've heard a lot about you.", ja: "お噂はかねがね伺っています。" },
  { cat: 'greet', en: "Please, call me Pei.", ja: "ペイと呼んでください。" },
  { cat: 'greet', en: "It's a pleasure to finally meet you.", ja: "ようやくお会いできて嬉しいです。" },
  { cat: 'greet', en: "Let me give you my business card.", ja: "名刺をお渡しします。" },
  // small
  { cat: 'small', en: "It's really hot today, isn't it?", ja: "今日は本当に暑いですね。" },
  { cat: 'small', en: "Did you have a good weekend?", ja: "良い週末でしたか？" },
  { cat: 'small', en: "I just watched a great movie last night.", ja: "昨日の夜、いい映画を観たんです。" },
  { cat: 'small', en: "What do you usually do in your free time?", ja: "普段、空いた時間は何をしていますか？" },
  { cat: 'small', en: "I'm really into 3D modeling these days.", ja: "最近3Dモデリングにはまっています。" },
  { cat: 'small', en: "Have you tried the new coffee shop near the station?", ja: "駅の近くの新しいカフェ、行きました？" },
  { cat: 'small', en: "Sorry I'm a bit late, the train was delayed.", ja: "少し遅れてすみません、電車が遅延して。" },
  { cat: 'small', en: "Time flies, doesn't it?", ja: "時が経つのは早いですね。" },
  // travel
  { cat: 'travel', en: "Excuse me, where is the nearest train station?", ja: "すみません、一番近い駅はどこですか？" },
  { cat: 'travel', en: "How long does it take to get there?", ja: "そこまでどのくらいかかりますか？" },
  { cat: 'travel', en: "Could you tell me which platform I need?", ja: "何番ホームか教えてもらえますか？" },
  { cat: 'travel', en: "I think I'm on the wrong train.", ja: "電車を間違えたみたいです。" },
  { cat: 'travel', en: "Is this seat taken?", ja: "この席は空いていますか？" },
  { cat: 'travel', en: "What time does the flight leave?", ja: "フライトは何時出発ですか？" },
  { cat: 'travel', en: "Could you help me with my luggage?", ja: "荷物を手伝ってもらえますか？" },
  { cat: 'travel', en: "I need to check in for my flight.", ja: "フライトのチェックインをしたいです。" },
  // work
  { cat: 'work', en: "Let's go over the schedule for this week.", ja: "今週のスケジュールを確認しましょう。" },
  { cat: 'work', en: "Can we push the meeting back an hour?", ja: "会議を1時間後ろにずらせますか？" },
  { cat: 'work', en: "I'll send you the file by tomorrow.", ja: "明日までにファイルを送ります。" },
  { cat: 'work', en: "Sorry for the late reply.", ja: "返信が遅くなってすみません。" },
  { cat: 'work', en: "Could you double-check these numbers?", ja: "この数字をもう一度確認してもらえますか？" },
  { cat: 'work', en: "We're a bit behind on this order.", ja: "この発注、少し遅れています。" },
  { cat: 'work', en: "Let's follow up on this next week.", ja: "この件は来週フォローしましょう。" },
  { cat: 'work', en: "Thanks for your patience.", ja: "お待たせしてすみません（お待ちいただきありがとう）。" },
  // eat
  { cat: 'eat', en: "Could I get a table for two, please?", ja: "2名でお願いできますか？" },
  { cat: 'eat', en: "What do you recommend?", ja: "おすすめは何ですか？" },
  { cat: 'eat', en: "Could we have the menu, please?", ja: "メニューをもらえますか？" },
  { cat: 'eat', en: "I'll have the same as him.", ja: "彼と同じものにします。" },
  { cat: 'eat', en: "Could I get this to go?", ja: "これ、持ち帰りにできますか？" },
  { cat: 'eat', en: "Do you have anything without seafood?", ja: "魚介が入っていないものはありますか？" },
  { cat: 'eat', en: "Could we get the check, please?", ja: "お会計をお願いします。" },
  { cat: 'eat', en: "This is delicious, thank you.", ja: "これ美味しいです、ありがとう。" },
];

/* 会話ドリル：日本語のお題を見て、まず自分で英語を組み立ててみる → お手本と比較 */
const DRILLS = [
  // greet
  { cat: 'greet', cueJa: "初対面の相手に、名前と出身(日本)を伝えて。",
    en: "Hi, I'm Pei. I'm from Japan.", ja: "こんにちは、ペイです。日本から来ました。" },
  { cat: 'greet', cueJa: "相手の名前を聞き取れなかったので、もう一度聞いて。",
    en: "Sorry, could you say your name again?", ja: "すみません、もう一度お名前を伺えますか？" },
  { cat: 'greet', cueJa: "しばらく会っていなかった相手に一言。",
    en: "It's been a while! How have you been?", ja: "お久しぶりです！元気にしていましたか？" },
  { cat: 'greet', cueJa: "自分の仕事を一言で説明して（靴の生産管理）。",
    en: "I work in production management for a shoe company.", ja: "靴の会社で生産管理をしています。" },
  { cat: 'greet', cueJa: "名刺交換のあと、相手に一言添えて。",
    en: "Thank you, I'll be in touch.", ja: "ありがとうございます、また連絡します。" },
  // small
  { cat: 'small', cueJa: "週末の予定を聞かれたので、特に予定はないと答えて。",
    en: "Not much, I'll probably just relax at home.", ja: "特にないです、たぶん家でゆっくりします。" },
  { cat: 'small', cueJa: "相手の趣味を尋ねて。",
    en: "What do you like to do outside of work?", ja: "仕事以外だと、何をするのが好きですか？" },
  { cat: 'small', cueJa: "自分の趣味（3DCG）について話して。",
    en: "I make short animations using 3D software, it's a hobby of mine.", ja: "3Dソフトで短いアニメを作るのが趣味なんです。" },
  { cat: 'small', cueJa: "天気の話題を振って。",
    en: "Looks like it might rain later today.", ja: "今日この後、雨が降りそうですね。" },
  { cat: 'small', cueJa: "電車が遅れて到着が遅くなったことを謝って。",
    en: "Sorry I'm late, my train got delayed.", ja: "遅れてすみません、電車が遅延したんです。" },
  // travel
  { cat: 'travel', cueJa: "空港でチェックインカウンターの場所を聞いて。",
    en: "Excuse me, where's the check-in counter for this airline?", ja: "すみません、この航空会社のチェックインカウンターはどこですか？" },
  { cat: 'travel', cueJa: "タクシーの運転手に行き先の住所を伝えて。",
    en: "Could you take me to this address, please?", ja: "この住所まで連れて行ってもらえますか？" },
  { cat: 'travel', cueJa: "ホテルのチェックインで、予約名を伝えて。",
    en: "Hi, I have a reservation under the name Pei.", ja: "こんにちは、ペイの名前で予約しています。" },
  { cat: 'travel', cueJa: "近くに両替できる場所があるか聞いて。",
    en: "Is there a place nearby where I can exchange money?", ja: "近くに両替できる場所はありますか？" },
  { cat: 'travel', cueJa: "道に迷ったので、近くの人に助けを求めて。",
    en: "Sorry, I think I'm lost. Could you help me?", ja: "すみません、道に迷ったみたいです。手伝ってもらえますか？" },
  // work
  { cat: 'work', cueJa: "会議の開始を切り出して。",
    en: "Let's get started, shall we?", ja: "それでは始めましょうか。" },
  { cat: 'work', cueJa: "相手の意見を求めて。",
    en: "What do you think about this?", ja: "これについてどう思いますか？" },
  { cat: 'work', cueJa: "納期がいつまでか確認して。",
    en: "When do you need this by?", ja: "これはいつまでに必要ですか？" },
  { cat: 'work', cueJa: "資料は後で送ると伝えて。",
    en: "I'll send you the documents after this.", ja: "この後、資料をお送りします。" },
  { cat: 'work', cueJa: "相手の説明が分かりやすかったのでお礼を言って。",
    en: "Thanks for explaining that so clearly.", ja: "分かりやすい説明をありがとうございました。" },
  // eat
  { cat: 'eat', cueJa: "レストランで2名の予約をしたいと伝えて。",
    en: "I'd like to make a reservation for two, please.", ja: "2名で予約をお願いしたいのですが。" },
  { cat: 'eat', cueJa: "店員さんにおすすめを聞いて。",
    en: "What would you recommend?", ja: "何がおすすめですか？" },
  { cat: 'eat', cueJa: "辛いものが苦手なので、控えめにしてほしいと伝えて。",
    en: "Could you make it not too spicy? I'm not great with spicy food.", ja: "あまり辛くしないでもらえますか？辛いものが得意じゃなくて。" },
  { cat: 'eat', cueJa: "食後、会計をお願いして。",
    en: "Could we get the bill, please?", ja: "お会計をお願いできますか？" },
  { cat: 'eat', cueJa: "食事の後、お店の人にお礼を言って。",
    en: "That was great, thank you very much.", ja: "とても美味しかったです、ありがとうございました。" },
];
