import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read } from './helpers.mjs';

/* app.js とデータ、wordbuild.js を同じコンテキストで動かす。
   画面は触らないので document は最小限のダミーで足りる。 */
function load(saved = {}) {
  const memory = new Map([['bars-and-words-v1', JSON.stringify({
    xp: 0, quiz: {}, readEras: [], clearedEras: [], grammarRead: [], parseRead: [],
    answered: 0, correct: 0, streak: 0, lastDay: '', days: [], ...saved,
  })]]);
  const context = {
    localStorage: { getItem: k => memory.get(k) || null, setItem: (k, v) => memory.set(k, v) },
    document: { querySelector: () => null, querySelectorAll: () => [], addEventListener: () => {}, dispatchEvent: () => {} },
    window: {}, navigator: {}, CustomEvent: class {}, Audio: class {},
    setTimeout, clearTimeout, console,
  };
  vm.createContext(context);
  for (const file of ['data/history.js', 'data/phrases.js', 'data/slang.js', 'data/commute.js',
                      'data/immersion.js', 'app.js', 'wordbuild.js']) {
    vm.runInContext(read(file), context, { filename: file });
  }
  vm.runInContext(`globalThis.OUT = {
    Store, WordMemory, WordBuild, wbTokens, wbKey, wbPool, wbPick, wbScore, wbGrade,
    wbWordResults, wbDistractors, wbQuestion, WB_MASTER, WB_N,
  };`, context, { filename: 'export.js' });
  context.OUT.Store.load();
  return context.OUT;
}

/* vm の中で作られた配列・オブジェクトは prototype が別なので、
   deepEqual の前にこちら側の素の値へ移す */
const plain = v => JSON.parse(JSON.stringify(v));

test('英文を単語タイルへ割り、記録キーは記号を落として持つ', () => {
  const { wbTokens, wbKey } = load();
  assert.deepEqual(plain(wbTokens("Sorry I'm a bit late, the train was delayed.")),
    ['Sorry', "I'm", 'a', 'bit', 'late,', 'the', 'train', 'was', 'delayed.']);
  assert.equal(wbKey('Sorry'), 'sorry');
  assert.equal(wbKey('late,'), 'late');
  assert.equal(wbKey("I'm"), "i'm");
  assert.equal(wbKey('—'), '');
});

test('出題プールは既存教材から作られ、長さが指定の範囲に収まる', () => {
  const { wbPool } = load();
  const pool = wbPool();
  assert.ok(pool.length > 80, `プールが少なすぎる: ${pool.length}`);
  for (const item of pool) {
    assert.ok(item.en && item.ja && item.source);
    assert.ok(item.target.length >= 4 && item.target.length <= 10, item.en);
  }
  /* 同じ英文は1回だけ */
  assert.equal(new Set(pool.map(x => x.en.toLowerCase())).size, pool.length);
  /* 自然音声つきのImmersion教材も混ざっている */
  assert.ok(pool.some(x => x.source === '今日の英語'));
  assert.ok(pool.some(x => x.source === '日常会話'));
});

test('採点は位置ごとに見る', () => {
  const { wbGrade } = load();
  const target = ['I', 'like', 'this', 'song.'];
  assert.equal(wbGrade(target, ['I', 'like', 'this', 'song.']).ok, true);
  const wrong = wbGrade(target, ['I', 'this', 'like', 'song.']);
  assert.equal(wrong.ok, false);
  assert.deepEqual(plain(wrong.marks), [true, false, false, true]);
  /* 語数が足りなければ不正解 */
  assert.equal(wbGrade(target, ['I', 'like']).ok, false);
});

test('合った語は成功、外した語とおとりは失敗として拾う', () => {
  const { wbWordResults } = load();
  const target = ['I', 'like', 'this', 'song.'];
  const results = wbWordResults(target, ['I', 'like', 'that', 'song.']);
  assert.deepEqual(plain(results), [
    { token: 'I', ok: true },
    { token: 'like', ok: true },
    { token: 'this', ok: false },   // 置けなかった正解の語
    { token: 'that', ok: false },   // 使ってしまったおとり
    { token: 'song.', ok: true },
  ]);
  /* 正解なら全部成功 */
  assert.deepEqual(plain(wbWordResults(target, target).map(x => x.ok)), [true, true, true, true]);
  /* 同じ語の入れ替えでは、おとり扱いの重複記録をしない */
  const swapped = wbWordResults(['the', 'big', 'the', 'end'], ['the', 'the', 'big', 'end']);
  assert.deepEqual(plain(swapped.filter(x => !x.ok).map(x => x.token)), ['big', 'the']);
});

test('単語の記録は連続正解で「覚えた」、間違えると「苦手」へ戻る', () => {
  const { WordMemory, WB_MASTER } = load();
  for (let i = 0; i < WB_MASTER; i++) WordMemory.record('Dope,', true);
  const w = WordMemory.get('dope');
  assert.equal(w.en, 'dope');
  assert.equal(w.ok, WB_MASTER);
  assert.equal(WordMemory.mastered(w), true);
  assert.deepEqual(plain(WordMemory.weakList().map(x => x.en)), []);
  assert.deepEqual(plain(WordMemory.masteredList().map(x => x.en)), ['dope']);

  WordMemory.record('dope', false);
  assert.equal(WordMemory.get('dope').streak, 0);
  assert.equal(WordMemory.weak(WordMemory.get('dope')), true);
  assert.deepEqual(plain(WordMemory.weakList().map(x => x.en)), ['dope']);
  assert.deepEqual(plain(WordMemory.masteredList()), []);

  /* 記号だけの語は記録しない */
  assert.equal(WordMemory.record('—', false), null);
  assert.equal(Object.keys(WordMemory.all()).length, 1);
});

test('冠詞は記録も重みも続けるが、一覧と集計には出さない', () => {
  const { WordMemory, wbScore, WB_MASTER } = load();
  WordMemory.record('the', false);
  WordMemory.record('leather', false);
  for (let i = 0; i < WB_MASTER; i++) WordMemory.record('a', true);

  /* 記録そのものは残る */
  assert.equal(WordMemory.get('the').ng, 1);
  assert.equal(WordMemory.get('a').streak, WB_MASTER);
  /* 一覧と集計からは外れる */
  assert.deepEqual(plain(WordMemory.weakList().map(x => x.en)), ['leather']);
  assert.deepEqual(plain(WordMemory.masteredList()), []);
  assert.deepEqual(plain(WordMemory.counts()), { mastered: 0, weak: 1 });
  /* 出題の重みには効き続ける（語順の練習になるため） */
  const withThe = { en: 'x', ja: 'x', source: 't', target: ['the', 'end', 'is', 'near'] };
  const without = { en: 'y', ja: 'y', source: 't', target: ['we', 'end', 'is', 'near'] };
  assert.ok(wbScore(withThe) > wbScore(without), '冠詞の苦手が重みに効いていない');
});

test('苦手な語を含む文は重みが上がり、正解済みの文は下がる', () => {
  const { WordMemory, wbScore, Store, WB_MASTER } = load();
  const item = { en: 'I like this song.', ja: 'この曲が好きです。', source: 'test', target: ['I', 'like', 'this', 'song.'] };

  const base = wbScore(item);
  /* 何度も正解した文は下がる */
  Store.d.quiz['wb:I like this song.'] = { ok: 4, ng: 0 };
  assert.ok(wbScore(item) < base, '正解済みの文が下がっていない');
  /* 間違えた文は上がる */
  Store.d.quiz['wb:I like this song.'] = { ok: 0, ng: 2 };
  assert.ok(wbScore(item) > base, '間違えた文が上がっていない');

  /* 苦手な語を含むと、さらに上がる */
  delete Store.d.quiz['wb:I like this song.'];
  WordMemory.record('song.', false);
  assert.ok(wbScore(item) > base, '苦手な語を含む文が上がっていない');

  /* 覚えた語ばかりの文は下がる */
  const learned = { ...item, target: ['We', 'read', 'every', 'day.'] };
  const learnedBase = wbScore(learned);
  for (const t of learned.target) for (let i = 0; i < WB_MASTER; i++) WordMemory.record(t, true);
  assert.ok(wbScore(learned) < learnedBase, '覚えた語だけの文が下がっていない');
});

test('苦手モードは苦手な語を含む文だけを出す', () => {
  const { WordMemory, wbPool, wbPick, Store } = load();
  const pool = wbPool();
  const target = pool.find(x => x.target.length >= 5);
  for (const t of target.target) WordMemory.record(t, false);
  Store.save();

  /* 出題は抽選なので、何度引いても条件を外さないことを見る */
  for (let i = 0; i < 20; i++) {
    const picked = wbPick(pool, 8, 'weak');
    assert.equal(picked.length, 8);
    for (const p of picked) {
      assert.ok(p.target.some(t => WordMemory.isWeakToken(t)), p.en);
    }
  }
});

test('苦手が無いときの weak モードは全体から出す（空にしない）', () => {
  const { wbPool, wbPick } = load();
  const picked = wbPick(wbPool(), 8, 'weak');
  assert.equal(picked.length, 8);
});

test('おとりは正解に無い素の語だけを選ぶ', () => {
  const { wbPool, wbDistractors, wbKey } = load();
  const pool = wbPool();
  for (const item of pool.slice(0, 40)) {
    const used = new Set(item.target.map(wbKey));
    const extras = wbDistractors(item, pool, 3);
    assert.equal(extras.length, 3);
    assert.equal(new Set(extras).size, 3);
    for (const e of extras) {
      assert.ok(!used.has(wbKey(e)), `${item.en} に含まれる語がおとりになった: ${e}`);
      /* 末尾の「.」「?」で文の切れ目が分からないよう、記号なしの語だけ使う */
      assert.match(e, /^[a-z']+$/);
    }
  }
});

test('1問ぶんのタイルは正解＋おとりで、置き場は空から始まる', () => {
  const { wbPool, wbQuestion } = load();
  const pool = wbPool();
  const item = pool.find(x => x.target.length === 4) || pool[0];
  const q = wbQuestion(item, pool);
  assert.deepEqual(plain(q.placed), []);
  assert.equal(q.tiles.length, item.target.length + (item.target.length <= 5 ? 2 : 3));
  assert.deepEqual(plain(q.tiles.map(t => t.id)), plain(q.tiles).map((_, i) => i));
  /* 正解の語がすべてタイルに揃っている（同じ語の重複も数えて一致させる） */
  const bank = q.tiles.filter(t => !t.extra).map(t => t.w).sort();
  assert.deepEqual(plain(bank), plain(item.target.slice().sort()));
});

test('保存は既存の記録を壊さず、書き出し・読み込みで単語も往復する', () => {
  const { Store, WordMemory } = load({ xp: 120, quiz: { 'slang:dope': { ok: 2, ng: 1 } }, answered: 3, correct: 2 });
  WordMemory.record('train', false);
  WordMemory.record('platform', true);
  Store.d.wordbuildSessions = 2;
  Store.save();

  const text = Store.exportText();
  Store.reset();
  assert.deepEqual(plain(Store.d.words), {});
  const r = Store.importText(text);
  assert.equal(r.ok, true);
  assert.equal(Store.d.xp, 120);
  assert.equal(Store.d.quiz['slang:dope'].ok, 2);
  assert.equal(Store.d.words.train.ng, 1);
  assert.equal(Store.d.words.platform.ok, 1);
  assert.equal(Store.d.wordbuildSessions, 2);
});

test('単語を持たない古い記録も読み込める', () => {
  const { Store, WordMemory } = load();
  const r = Store.importText(JSON.stringify({
    app: 'bars-and-words', v: 1,
    data: { xp: 10, quiz: {}, answered: 0, correct: 0 },
  }));
  assert.equal(r.ok, true);
  assert.deepEqual(plain(Store.d.words), {});
  assert.equal(WordMemory.record('hello', true).ok, 1);
});

test('画面の接続が index.html / sw.js に入っている', () => {
  const html = read('index.html');
  const sw = read('sw.js');
  assert.ok(html.includes('<script src="wordbuild.js"></script>'));
  assert.ok(html.includes('id="screen-wordbuild"'));
  assert.ok(html.includes('id="screen-wordbuild-run"'));
  assert.ok(html.includes('data-go="wordbuild"'));
  assert.ok(sw.includes("'./wordbuild.js'"));
  /* 版数を上げないと端末に古い版が残り続ける */
  assert.ok(!sw.includes("tomoya-house-v16"));
});
