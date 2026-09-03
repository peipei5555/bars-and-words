import test from 'node:test';
import assert from 'node:assert/strict';
import { read, loadWordBuild } from './helpers.mjs';
import { listOpenAIAudioTargets } from '../tools/generate-openai-audio.mjs';

test('学習項目は音声やタイマーだけでは自動遷移しない', () => {
  const src = read('commute.js');
  for (const forbidden of [
    'this.after(3500, advance)',
    'this.after(2600, advance)',
    'this.after(6000, () => this.revealFlash())',
    'this.after(8000, () => { this._dIdx++',
    'this.after(1300, () => { this._sIdx++',
  ]) assert.ok(!src.includes(forbidden), forbidden);
});

test('回答音声は回答前の4択DOMへ置かない', () => {
  const app = read('app.js');
  const commute = read('commute.js');
  assert.ok(app.includes('${it.promptAudio && Speech.hasNatural(it.promptAudio) ? `<button class="q-say"'));
  assert.ok(!app.includes('${it.say ? `<button class="q-say" id="q-say"'));
  assert.ok(commute.includes('${it.promptAudio && Speech.hasNatural(it.promptAudio) ? `<button class="q-say"'));
  assert.ok(!commute.includes('${it.say ? `<button class="q-say" id="cm-q-say"'));
  assert.ok(app.includes("promptAudio: o.promptAudio || (o.autoSay ? o.say || '' : '')"));
  assert.ok(app.includes("answerAudio: o.answerAudio || (!o.autoSay ? o.say || '' : '')"));
});

test('旧セッションの不明なphaseは安全に破棄する', () => {
  const src = read('commute.js');
  assert.ok(src.includes("const phases = ['listen', 'read', 'meaning', 'relisten', 'output', 'quiz']"));
  assert.ok(src.includes('if (!phases.includes(s.checkpoint.phase)) s.checkpoint = null'));
});

test('音声生成はparse別表現の英文とImmersionを収集する', () => {
  const src = read('tools/generate-openai-audio.mjs');
  assert.ok(src.includes("add(items, alternate.en, 'cedar')"));
  assert.ok(src.includes('context.__IMMERSION'));
  const targets = listOpenAIAudioTargets();
  assert.equal(targets.length, 666);
  assert.equal(targets.filter(x => !x.exists).length, 434);
});

/* タイルの発音は端末の読み上げに任せるとiPhoneで無音になった。
   出題に出る語はすべてMP3の生成対象に入っていること */
test('音声生成は単語で組み立てのタイル語をすべて拾う', () => {
  const targets = listOpenAIAudioTargets();
  const words = new Set(targets.filter(x => x.kind === 'word').map(x => x.text));
  assert.ok(words.size > 300, `単語が少なすぎる: ${words.size}`);
  /* 前後の記号は落ちている。語中のハイフンとアポストロフィ（double-check, I'm）は残す */
  for (const w of words) assert.ok(!/^[^A-Za-z0-9]|[^A-Za-z0-9]$/.test(w), w);
  const { wbPool, wbSpeakWord } = loadWordBuild();
  for (const item of wbPool()) {
    for (const token of item.target) {
      const spoken = wbSpeakWord(token);
      if (spoken) assert.ok(words.has(spoken) || targets.some(x => x.text === spoken), `未収録: ${token}`);
    }
  }
});
