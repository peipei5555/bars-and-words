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

function loadData() {
  const context = {};
  vm.createContext(context);
  for (const name of ['data/commute.js', 'data/topics.js', 'data/grammar.js', 'data/parse.js']) {
    let src = fs.readFileSync(path.join(ROOT, name), 'utf8');
    src += '\n;globalThis.__SHADOW = typeof SHADOW === "undefined" ? globalThis.__SHADOW : SHADOW;';
    src += '\n;globalThis.__DRILLS = typeof DRILLS === "undefined" ? globalThis.__DRILLS : DRILLS;';
    src += '\n;globalThis.__TOPICS = typeof TOPICS === "undefined" ? globalThis.__TOPICS : TOPICS;';
    src += '\n;globalThis.__GRAMMAR = typeof GRAMMAR === "undefined" ? globalThis.__GRAMMAR : GRAMMAR;';
    src += '\n;globalThis.__PARSE = typeof PARSE === "undefined" ? globalThis.__PARSE : PARSE;';
    vm.runInContext(src, context, { filename: name });
  }
  return context;
}

function add(registry, text, voice = 'cedar') {
  const clean = typeof text === 'string' ? text.trim() : '';
  if (clean && !registry.has(clean)) registry.set(clean, voice);
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
    for (const alternate of detail.alts || []) add(items, alternate, 'cedar');
  }
  return items;
}

function fileFor(text, voice) {
  const identity = JSON.stringify({ provider: 'openai', model: MODEL, voice, speed: SPEED, instructions: INSTRUCTIONS, text });
  return `${crypto.createHash('sha256').update(identity).digest('hex').slice(0, 20)}.mp3`;
}

async function synthesize(apiKey, text, voice) {
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
      instructions: INSTRUCTIONS,
      response_format: 'mp3',
      speed: SPEED,
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
  const entries = [...collectItems(loadData()).entries()];
  if (entries.length > 400) throw new Error(`安全上限を超えました: ${entries.length}件`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = {};
  let cursor = 0;
  let completed = 0;
  let generated = 0;

  async function worker() {
    while (cursor < entries.length) {
      const index = cursor++;
      const [text, voice] = entries[index];
      const file = fileFor(text, voice);
      const target = path.join(OUT_DIR, file);
      if (!fs.existsSync(target)) {
        const audio = await synthesize(apiKey, text, voice);
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
if (invokedDirectly) await generateOpenAIAudio({ apiKey: process.env.OPENAI_API_KEY });
