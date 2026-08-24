import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';

export const DEFAULT_REALTIME_MODEL = 'gpt-realtime-2.1-mini';
export const MAX_SESSION_SECONDS = 120;
const root = path.resolve(import.meta.dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.png': 'image/png', '.woff2': 'font/woff2' };

export function loadLessons() {
  const source = fs.readFileSync(path.join(root, 'data', 'immersion.js'), 'utf8');
  const context = { console };
  vm.createContext(context);
  vm.runInContext(`${source}\n;globalThis.__lessons = IMMERSION_LESSONS;`, context, { filename: 'data/immersion.js' });
  return context.__lessons;
}

export function buildInstructions(lesson) {
  const lines = lesson.sentences.map((x, i) => `${i + 1}. ${x.en}（${x.ja}）`).join('\n');
  const words = [...(lesson.tags?.vocabulary || [])].join(', ');
  return `You are a patient English conversation partner for a Japanese adult beginner (A1-A2).
Keep the conversation strictly about this lesson: ${lesson.titleJa || lesson.id}.
Reuse these three learned sentences and their patterns:
${lines}
Useful words: ${words}.

Rules:
- The whole practice is at most ${MAX_SESSION_SECONDS} seconds.
- Start with one short, friendly English question. Use one sentence at a time.
- Keep your spoken replies under 14 words and speak clearly.
- Encourage communication; do not correct every mistake during the conversation.
- If the learner is stuck or asks for help, give one brief hint in Japanese, then return to easy English.
- Do not introduce unrelated topics.
- Never ask for personal, identifying, financial, health, or account information.
- When a text-only feedback response is requested, return exactly the requested JSON and no markdown.`;
}

export function dayKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function isTrustedLocalOrigin(request) {
  const host = String(request.headers.host || '');
  const origin = String(request.headers.origin || '');
  if (!host || !origin) return false;
  try {
    const hostUrl = new URL(`http://${host}`);
    const originUrl = new URL(origin);
    const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(hostUrl.hostname);
    return loopback && originUrl.protocol === 'http:' && originUrl.host === hostUrl.host;
  } catch (error) { return false; }
}

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

async function readBody(request, limit = 300000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new Error('body-too-large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function createRealtimeServer(options = {}) {
  const lessons = options.lessons || loadLessons();
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const usage = options.usage || new Map();
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY ?? '';
  const model = options.model || process.env.OPENAI_REALTIME_MODEL || DEFAULT_REALTIME_MODEL;

  return http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/api/realtime/session') {
      if (request.method !== 'POST') return json(response, 405, { error: 'POSTのみ利用できます。' });
      if (!isTrustedLocalOrigin(request)) return json(response, 403, { error: 'このローカル学習画面からだけ開始できます。' });
      if (!apiKey) return json(response, 503, { error: 'ローカルサーバーにOPENAI_API_KEYが設定されていません。' });
      if (!String(request.headers['content-type'] || '').startsWith('application/sdp')) return json(response, 415, { error: 'SDP形式ではありません。' });

      const lessonId = String(request.headers['x-lesson-id'] || '');
      const clientId = String(request.headers['x-realtime-client'] || '');
      const lesson = lessons.find(x => x.id === lessonId);
      if (!lesson || !/^[a-z0-9-]{8,80}$/i.test(clientId)) return json(response, 400, { error: '教材または端末情報が正しくありません。' });

      const safetyId = crypto.createHash('sha256').update(clientId).digest('hex');
      const usageKey = `${dayKey()}:${safetyId}`;
      if (usage.has(usageKey)) return json(response, 429, { error: '今日はすでに音声実践を開始しています。' });

      let sdp;
      try { sdp = await readBody(request); }
      catch (error) { return json(response, 413, { error: '接続データが大きすぎます。' }); }
      if (!sdp.startsWith('v=0')) return json(response, 400, { error: '接続データを確認できません。' });

      const session = {
        type: 'realtime',
        model,
        instructions: buildInstructions(lesson),
        output_modalities: ['audio'],
        max_output_tokens: 180,
        audio: {
          input: { turn_detection: { type: 'server_vad', create_response: true, interrupt_response: true } },
          output: { voice: 'marin' },
        },
      };
      const form = new FormData();
      form.set('sdp', sdp);
      form.set('session', JSON.stringify(session));

      let upstream;
      try {
        upstream = await fetchImpl('https://api.openai.com/v1/realtime/calls', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'OpenAI-Safety-Identifier': safetyId },
          body: form,
        });
      } catch (error) {
        return json(response, 502, { error: 'OpenAIへ接続できませんでした。残高とネットワークを確認してください。' });
      }
      if (!upstream.ok) return json(response, 502, { error: `OpenAIが接続を受け付けませんでした（${upstream.status}）。` });

      usage.set(usageKey, { lessonId, startedAt: Date.now(), expiresAt: Date.now() + MAX_SESSION_SECONDS * 1000 });
      response.writeHead(200, {
        'Content-Type': 'application/sdp',
        'Cache-Control': 'no-store',
        'X-Realtime-Model': model,
        'X-Realtime-Max-Seconds': String(MAX_SESSION_SECONDS),
        'X-Realtime-Expires-At': String(Date.now() + MAX_SESSION_SECONDS * 1000),
      });
      response.end(await upstream.text());
      return;
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') return response.writeHead(405).end('Method not allowed');
    const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const target = path.resolve(root, relative);
    if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) return response.writeHead(404).end('Not found');
    const type = types[path.extname(target)] || 'application/octet-stream';
    response.setHeader('Content-Type', /^(text\/|application\/(javascript|json))/.test(type) ? `${type}; charset=utf-8` : type);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    if (request.method === 'HEAD') return response.end();
    fs.createReadStream(target).pipe(response);
  });
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const port = Number(process.argv[2]) || 8765;
  createRealtimeServer().listen(port, '127.0.0.1', () => {
    console.log(`ともやの家: http://127.0.0.1:${port}`);
    console.log(`Realtime model: ${process.env.OPENAI_REALTIME_MODEL || DEFAULT_REALTIME_MODEL} / max ${MAX_SESSION_SECONDS}s / once per day`);
  });
}
