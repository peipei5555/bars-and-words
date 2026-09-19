/* v2 の単語と例文の音声を OpenAI TTS で一度だけ生成する。
   APIキーは環境変数 OPENAI_API_KEY からだけ受け取り、ファイルへ保存しない。
   既にあるファイルは作り直さない（同じ文・同じ設定なら同じファイル名になる）。

   使い方（PowerShell、hiphop-english\v2 で）:
     node tools\generate-audio.mjs --list        何件作るか・料金の目安を表示（課金なし）
     node tools\generate-audio.mjs --sample 6    最初の6語ぶんだけ作って試聴する
     node tools\generate-audio.mjs               全部作る                          */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'audio');
const MODEL = 'gpt-4o-mini-tts';
const MAX_ITEMS = 1500; // 課金事故の歯止め。278語×2＝556件なので余裕がある

/* 単語は辞書の見出し読み、例文は自然な会話。声を分けて聞き分けやすくする */
const RECIPE = {
  word: {
    voice: 'cedar',
    speed: 0.95,
    instructions: [
      'Say only this English word or short phrase in clear, natural American English.',
      'Neutral dictionary-style delivery with crisp consonants and natural stress.',
      'Do not add any other words, and do not spell it out.',
    ].join(' '),
  },
  example: {
    voice: 'marin',
    speed: 0.92,
    instructions: [
      'Speak in clear, natural American English, like a friendly native speaker in everyday conversation.',
      'Relaxed and warm, crisp consonants, natural intonation and linking.',
      'Slightly slower than normal conversation, but never robotic or childish.',
      'Do not add, remove, or explain any words.',
    ].join(' '),
  },
};

function loadWords() {
  const dir = path.join(ROOT, 'data');
  return fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort()
    .flatMap(f => require(path.join(dir, f)).WORDS || []);
}

function fileFor(kind, text) {
  const r = RECIPE[kind];
  const identity = JSON.stringify({ model: MODEL, voice: r.voice, speed: r.speed, instructions: r.instructions, text });
  return `${kind}-${crypto.createHash('sha256').update(identity).digest('hex').slice(0, 16)}.mp3`;
}

function targets(limit) {
  const words = loadWords();
  const picked = limit ? words.slice(0, limit) : words;
  const seen = new Set();
  const list = [];
  for (const w of picked) {
    for (const [kind, text] of [['word', w.head], ['example', w.ex]]) {
      const key = kind + '\n' + text;
      if (seen.has(key)) continue;
      seen.add(key);
      const file = fileFor(kind, text);
      list.push({ kind, text, file, exists: fs.existsSync(path.join(OUT_DIR, file)) });
    }
  }
  return { words, list };
}

async function synthesize(apiKey, kind, text) {
  const r = RECIPE[kind];
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, voice: r.voice, input: text, instructions: r.instructions, response_format: 'mp3', speed: r.speed }),
  });
  if (!res.ok) throw new Error(`OpenAI audio API: ${res.status} ${(await res.text()).slice(0, 400)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const id3 = buf.subarray(0, 3).toString('ascii') === 'ID3';
  const frame = buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0;
  if (buf.length < 512 || (!id3 && !frame)) throw new Error(`音声の検証に失敗: ${text.slice(0, 60)}`);
  return buf;
}

/* アプリはこのファイルで「語のid → mp3」を引く。全語ぶんを常に書き出す（未生成は null） */
function writeManifest(words) {
  const map = {};
  for (const w of words) {
    const wf = fileFor('word', w.head);
    const ef = fileFor('example', w.ex);
    map[w.id] = {
      word: fs.existsSync(path.join(OUT_DIR, wf)) ? `audio/${wf}` : null,
      example: fs.existsSync(path.join(OUT_DIR, ef)) ? `audio/${ef}` : null,
    };
  }
  const js = `/* 自動生成。直接編集しない。tools/generate-audio.mjs が書く */\nconst AUDIO = ${JSON.stringify(map, null, 1)};\nif (typeof module !== 'undefined') module.exports = { AUDIO };\n`;
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.js'), js, 'utf8');
  writePreview(words, map);
  return Object.values(map).filter(x => x.word && x.example).length;
}

/* 試聴用ページ。ダブルクリックでブラウザが開き、ボタンで鳴らせる */
function writePreview(words, map) {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const rows = words.filter(w => map[w.id].word || map[w.id].example).map(w => {
    const a = f => f ? `<audio controls preload="none" src="${esc(path.basename(f))}"></audio>` : '（未生成）';
    return `<div class="r"><b>${esc(w.head)}</b> <span>${esc(w.ja)}</span><div>${a(map[w.id].word)}</div><p>${esc(w.ex)}</p><div>${a(map[w.id].example)}</div></div>`;
  }).join('\n');
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>音声の試聴</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:640px;margin:auto;padding:16px;background:#111;color:#eee}.r{border-bottom:1px solid #333;padding:12px 0}span{color:#aaa}p{margin:8px 0 4px;font-style:italic}audio{width:100%;height:36px}</style>
</head><body><h1>音声の試聴</h1><p>上が単語（cedar）、下が例文（marin）。</p>${rows}</body></html>`;
  fs.writeFileSync(path.join(OUT_DIR, 'preview.html'), html, 'utf8');
}

async function main() {
  const args = process.argv.slice(2);
  const sampleAt = args.indexOf('--sample');
  const limit = sampleAt >= 0 ? Math.max(1, parseInt(args[sampleAt + 1], 10) || 6) : 0;
  const { words, list } = targets(limit);
  const todo = list.filter(x => !x.exists);
  const chars = todo.reduce((n, x) => n + x.text.length, 0);

  if (args.includes('--list')) {
    console.log(`対象 ${list.length}件（単語 ${list.filter(x => x.kind === 'word').length} / 例文 ${list.filter(x => x.kind === 'example').length}）`);
    console.log(`未生成 ${todo.length}件・約${chars}文字。料金は目安で数十円（1件あたり数秒の音声）`);
    return;
  }
  if (list.length > MAX_ITEMS) throw new Error(`安全上限（${MAX_ITEMS}件）を超えています: ${list.length}件`);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY が設定されていません。README の手順で設定してから実行してください。');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  let cursor = 0, done = 0, failed = 0;
  async function worker() {
    while (cursor < todo.length) {
      const item = todo[cursor++];
      try {
        fs.writeFileSync(path.join(OUT_DIR, item.file), await synthesize(apiKey, item.kind, item.text));
      } catch (e) {
        failed++;
        console.error(`\n失敗: [${item.kind}] ${item.text}\n  ${e.message}`);
        if (/ 40[13] /.test(e.message)) throw e; // キーの誤り・権限不足は続けても無駄
      }
      done++;
      process.stdout.write(`\r${done}/${todo.length}`);
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  const ready = writeManifest(words);
  console.log(`\n完了: 新規 ${done - failed}件 / 失敗 ${failed}件。音声がそろった語 ${ready}/${words.length}`);
  if (failed) console.log('失敗分は、もう一度同じコマンドを実行すれば続きから作ります。');
}

main().catch(e => { console.error(e.message); process.exitCode = 1; });
