import test from 'node:test';
import assert from 'node:assert/strict';
import { read } from './helpers.mjs';
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
  assert.ok(app.includes('${it.promptAudio ? `<button class="q-say"'));
  assert.ok(!app.includes('${it.say ? `<button class="q-say" id="q-say"'));
  assert.ok(commute.includes('${it.promptAudio ? `<button class="q-say"'));
  assert.ok(!commute.includes('${it.say ? `<button class="q-say" id="cm-q-say"'));
  assert.ok(app.includes("promptAudio: o.promptAudio || (o.autoSay ? o.say || '' : '')"));
  assert.ok(app.includes("answerAudio: o.answerAudio || (!o.autoSay ? o.say || '' : '')"));
});

test('旧セッションの不明なphaseは安全に破棄する', () => {
  const src = read('commute.js');
  assert.ok(src.includes("const phases = ['listen', 'read', 'meaning', 'relisten', 'output']"));
  assert.ok(src.includes('if (!phases.includes(s.checkpoint.phase)) s.checkpoint = null'));
});

test('音声生成はparse別表現の英文とImmersionを収集する', () => {
  const src = read('tools/generate-openai-audio.mjs');
  assert.ok(src.includes("add(items, alternate.en, 'cedar')"));
  assert.ok(src.includes('context.__IMMERSION'));
  const targets = listOpenAIAudioTargets();
  assert.equal(targets.length, 244);
  assert.equal(targets.filter(x => !x.exists).length, 12);
});
