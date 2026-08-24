import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadData } from './helpers.mjs';

test('7ジャンルのImmersion教材が整合している', () => {
  const { IMMERSION_OUT: lessons, TOPICS_OUT: topics, AUDIO_OUT: audio } = loadData();
  assert.equal(lessons.length, 7);
  const ids = new Set();
  const requiredTopics = ['blender', 'ai', 'art', 'leather', 'shoes', 'brand-history', 'hiphop'];
  for (const topic of requiredTopics) assert.ok(lessons.some(x => x.tags.topics.includes(topic)), topic);

  for (const lesson of lessons) {
    assert.ok(!ids.has(lesson.id)); ids.add(lesson.id);
    assert.ok(topics.some(x => x.id === lesson.topicId));
    assert.ok(lesson.production.length >= 3 && lesson.production.length <= 5);
    assert.deepEqual([...lesson.tags.foundation].sort(), ['daily', 'toeic']);
    const sentenceIds = new Set(lesson.sentences.map(x => x.id));
    for (const sentence of lesson.sentences) {
      assert.ok(sentence.en && sentence.ja && sentence.point);
      assert.ok(sentence.chunks.some(x => x.role === 'S'));
      assert.ok(sentence.chunks.some(x => x.role === 'V'));
      assert.ok(audio[sentence.en], `音声なし: ${sentence.en}`);
      assert.ok(fs.existsSync(path.join(ROOT, audio[sentence.en])), `ファイルなし: ${audio[sentence.en]}`);
    }
    for (const output of lesson.production) {
      assert.ok(!ids.has(output.id)); ids.add(output.id);
      assert.ok(sentenceIds.has(output.source));
      assert.equal(output.answer, lesson.sentences.find(x => x.id === output.source).en);
      assert.ok(audio[output.answer], `回答音声なし: ${output.answer}`);
    }
  }
});

test('全ての音声ファイルがMP3として妥当な先頭を持つ', () => {
  const { AUDIO_OUT: audio } = loadData();
  for (const file of new Set(Object.values(audio))) {
    const data = fs.readFileSync(path.join(ROOT, file));
    const id3 = data.subarray(0, 3).toString('ascii') === 'ID3';
    const mpeg = data[0] === 0xff && (data[1] & 0xe0) === 0xe0;
    assert.ok(data.length >= 512 && (id3 || mpeg), file);
  }
});
