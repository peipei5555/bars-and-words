import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read } from './helpers.mjs';

function makeStore(oldData) {
  const memory = new Map([['bars-and-words-v1', JSON.stringify(oldData)]]);
  const context = {
    localStorage: { getItem:k => memory.get(k) || null, setItem:(k,v) => memory.set(k,v) },
    document: { querySelector:()=>null, querySelectorAll:()=>[], addEventListener:()=>{}, dispatchEvent:()=>{} },
    window: {}, navigator: {}, CustomEvent: class {}, Audio: class {},
    setTimeout, clearTimeout, console,
  };
  vm.createContext(context);
  vm.runInContext(read('app.js') + '\nglobalThis.STORE_OUT = Store;', context, { filename:'app.js' });
  return context.STORE_OUT;
}

test('旧localStorageを壊さずlearningを補完する', () => {
  const old = { xp:42, quiz:{legacy:{ok:2,ng:1}}, readEras:[], clearedEras:[], grammarRead:[], parseRead:[], answered:3, correct:2, streak:1, lastDay:'', days:[] };
  const store = makeStore(old);
  store.load();
  assert.equal(store.d.xp, 42);
  assert.deepEqual(JSON.parse(JSON.stringify(store.d.quiz.legacy)), {ok:2,ng:1});
  assert.equal(store.d.learning.version, 2);
  assert.deepEqual(Object.keys(store.d.learning.items), []);
  assert.deepEqual(JSON.parse(JSON.stringify(store.d.learning.realtime.sessions)), []);
});

test('Realtime実践は1日判定と構造化フィードバックを保存する', () => {
  const store = makeStore({ xp:0, quiz:{}, learning:{ version:1, items:{}, sessions:[] } });
  store.load();
  const id = store.startRealtimeSession('immersion-ai-judgment');
  assert.equal(store.realtimeUsedToday(), true);
  store.finishRealtimeSession(id, {
    durationSeconds: 150,
    feedback: { understood:'通じた', oneFix:'語尾', review:'AI can create options.' },
  });
  const item = store.d.learning.realtime.sessions[0];
  assert.equal(item.durationSeconds, 120);
  assert.equal(item.feedback.oneFix, '語尾');
  assert.ok(item.endedAt);
});

test('項目単位の遭遇・正誤・日時を記録する', () => {
  const store = makeStore({ xp:0, quiz:{}, learning:{ version:1, items:{ old:{ kind:'sentence' } }, sessions:[] } });
  store.load();
  assert.equal(store.d.learning.items.old.encounterCount, 0);
  store.recordEncounter('production:test', 'production', 'wrong');
  store.recordEncounter('production:test', 'production', 'correct');
  const item = store.d.learning.items['production:test'];
  assert.equal(item.encounterCount, 2);
  assert.equal(item.correctCount, 1);
  assert.equal(item.wrongCount, 1);
  assert.ok(Date.parse(item.lastSeenAt));
  assert.ok(Date.parse(item.nextDueAt));
});
