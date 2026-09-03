/* OpenAIで教材音声を一度だけ生成する。
   APIキーは環境変数またはmain()の引数から受け取り、ファイルへ保存しない。 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'audio', 'openai');
const MODEL = 'gpt-4o-mini-tts';
const SPEED = 0.92;
const INSTRUCTIONS = [
  'Speak in clear, natural American English for an adult beginner.',
  'Use a calm conversational delivery, crisp consonants, and short natural pauses.',
  'Speak slightly slower than everyday conversation, but never sound robotic or childish.',
  'Do not add, remove, or explain any words.',
].join(' ');

/* 「単語で組み立て」のタイル用。1語だけを鳴らすので指示を分ける。
   端末の読み上げに任せるとiPhoneで無音になり、タイルを押しても音が出なかった。
   ここで全語ぶん作って同梱すれば、端末の音声設定に関係なく必ず鳴る */
const WORD_SPEED = 0.95;
const WORD_INSTRUCTIONS = [
  'Say only this single English word in clear, natural American English.',
  'Use a neutral dictionary-style delivery with crisp consonants.',
  'Do not add any other words, and do not spell it out.',
].join(' ');

const RECIPE = {
  sentence: { speed: SPEED, instructions: INSTRUCTIONS },
  word:     { speed: WORD_SPEED, instructions: WORD_INSTRUCTIONS },
};

function loadData() {
  const context = {};
  vm.createContext(context);
  for (const name of ['data/commute.js', 'data/topics.js', 'data/grammar.js', 'data/parse.js', 'data/immersion.js', 'data/slang.js', 'data/phrases.js']) {
    let src = fs.readFileSync(path.join(ROOT, name), 'utf8');
    src += '\n;globalThis.__SHADOW = typeof SHADOW === "undefined" ? globalThis.__SHADOW : SHADOW;';
    src += '\n;globalThis.__DRILLS = typeof DRILLS === "undefined" ? globalThis.__DRILLS : DRILLS;';
    src += '\n;globalThis.__TOPICS = typeof TOPICS === "undefined" ? globalThis.__TOPICS : TOPICS;';
    src += '\n;globalThis.__GRAMMAR = typeof GRAMMAR === "undefined" ? globalThis.__GRAMMAR : GRAMMAR;';
    src += '\n;globalThis.__PARSE = typeof PARSE === "undefined" ? globalThis.__PARSE : PARSE;';
    src += '\n;globalThis.__IMMERSION = typeof IMMERSION_LESSONS === "undefined" ? globalThis.__IMMERSION : IMMERSION_LESSONS;';
    vm.runInContext(src, context, { filename: name });
  }
  /* 「単語で組み立て」の出題は wordbuild.js が組み立てる。
     同じ規則をここへ書き写すと必ずずれるので、本体をそのまま実行して借りる */
  context.document = { addEventListener() {} };
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, 'wordbuild.js'), 'utf8')
      + ';globalThis.__wbPool = wbPool; globalThis.__wbSpeakWord = wbSpeakWord;',
    context, { filename: 'wordbuild.js' });
  return context;
}

function add(registry, text, voice = 'cedar', kind = 'sentence') {
  const clean = typeof text === 'string' ? text.trim() : '';
  if (clean && !registry.has(clean)) registry.set(clean, { voice, kind });
}

function collectItems(context) {
  const items = new Map();
  for (const x of context.__SHADOW || []) add(items, x.en, 'cedar');
  for (const x of context.__DRILLS || []) {
    add(items, x.partner, 'marin');
    add(items, x.en, 'cedar');
    add(items, x.reply, 'marin');
  }
  for (const x of context.__TOPICS || []) {
    for (const sentence of x.sentences || []) add(items, sentence, 'marin');
  }
  for (const x of context.__GRAMMAR || []) {
    for (const example of x.ex || []) add(items, example.en, 'cedar');
  }
  for (const [sentence, detail] of Object.entries(context.__PARSE || {})) {
    add(items, sentence, 'cedar');
    for (const chunk of detail.chunks || []) add(items, chunk.t, 'cedar');
    for (const alternate of detail.alts || []) add(items, alternate.en, 'cedar');
  }
  for (const lesson of context.__IMMERSION || []) {
    for (const sentence of lesson.sentences || []) add(items, sentence.en, 'marin');
    for (const output of lesson.production || []) add(items, output.answer, 'cedar');
  }
  /* 単語で組み立て: 出題文そのものと、タイルになる語をすべて */
  for (const item of context.__wbPool ? context.__wbPool() : []) {
    add(items, item.en, 'cedar');
    for (const token of item.target) add(items, context.__wbSpeakWord(token), 'cedar', 'word');
  }
  return items;
}

function fileFor(text, voice, kind = 'sentence') {
  const { speed, instructions } = RECIPE[kind] || RECIPE.sentence;
  const identity = JSON.stringify({ provider: 'openai', model: MODEL, voice, speed, instructions, text });
  return `${crypto.createHash('sha256').update(identity).digest('hex').slice(0, 20)}.mp3`;
}

export function listOpenAIAudioTargets() {
  return [...collectItems(loadData()).entries()].map(([text, { voice, kind }]) => {
    const file = fileFor(text, voice, kind);
    return { text, voice, kind, file, exists: fs.existsSync(path.join(OUT_DIR, file)) };
  });
}

async function synthesize(apiKey, text, voice, kind = 'sentence') {
  const { speed, instructions } = RECIPE[kind] || RECIPE.sentence;
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      voice,
      input: text,
      instructions,
      response_format: 'mp3',
      speed,
    }),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 600);
    throw new Error(`OpenAI audio API: ${response.status} ${detail}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function generateOpenAIAudio({ apiKey, concurrency = 2, onProgress } = {}) {
  apiKey ||= typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : '';
  if (!apiKey) throw new Error('OPENAI_API_KEY が設定されていません。');
  const entries = listOpenAIAudioTargets().map(x => [x.text, x.voice, x.kind]);
  /* 課金が伴うので上限を置く。単語ぶん（約350語）を足しても収まる数 */
  if (entries.length > 900) throw new Error(`安全上限を超えました: ${entries.length}件`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = {};
  let cursor = 0;
  let completed = 0;
  let generated = 0;

  async function worker() {
    while (cursor < entries.length) {
      const index = cursor++;
      const [text, voice, kind] = entries[index];
      const file = fileFor(text, voice, kind);
      const target = path.join(OUT_DIR, file);
      if (!fs.existsSync(target)) {
        const audio = await synthesize(apiKey, text, voice, kind);
        const id3 = audio.subarray(0, 3).toString('ascii') === 'ID3';
        const mpegFrame = audio[0] === 0xff && (audio[1] & 0xe0) === 0xe0;
        if (audio.length < 512 || (!id3 && !mpegFrame)) {
          throw new Error(`音声ファイルの検証に失敗: ${text.slice(0, 60)}`);
        }
        fs.writeFileSync(target, audio);
        generated++;
      }
      manifest[text] = `audio/openai/${file}`;
      completed++;
      if (onProgress) onProgress({ completed, total: entries.length, generated });
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, Math.min(3, concurrency)) }, worker));
  const ordered = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  const paths = [...new Set(Object.values(ordered))].sort();
  const manifestJs = `/* 自動生成。直接編集しない。Provider: OpenAI ${MODEL} */\n'use strict';\nconst AUDIO_MANIFEST = ${JSON.stringify(ordered, null, 2)};\n`;
  const filesJs = `/* 自動生成。Service Workerの事前キャッシュ用。 */\n'use strict';\nself.AUDIO_FILES = ${JSON.stringify(paths.map(p => `./${p}`), null, 2)};\n`;
  fs.writeFileSync(path.join(ROOT, 'audio', 'manifest.js'), manifestJs, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'audio', 'files.js'), filesJs, 'utf8');
  if (typeof process !== 'undefined' && process.stdout) {
    process.stdout.write(`完了: ${entries.length}音声（新規 ${generated}）\n`);
  }
  return { total: entries.length, generated, files: paths.length };
}

const invokedDirectly = typeof process !== 'undefined' && process.argv?.[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  if (process.argv.includes('--list')) {
    const targets = listOpenAIAudioTargets();
    const missing = targets.filter(x => !x.exists);
    const words = targets.filter(x => x.kind === 'word');
    console.log(`内訳: 文 ${targets.length - words.length}件 / 単語 ${words.length}件（未生成の単語 ${missing.filter(x => x.kind === 'word').length}件）`);
    process.stdout.write(`対象 ${targets.length}件 / 生成済み ${targets.length - missing.length}件 / 未生成 ${missing.length}件\n`);
    for (const item of missing) process.stdout.write(`[${item.voice}] ${item.text}\n`);
  } else {
    await generateOpenAIAudio({ apiKey: process.env.OPENAI_API_KEY });
  }
}
