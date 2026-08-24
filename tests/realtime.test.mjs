import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read, loadData } from './helpers.mjs';
import {
  DEFAULT_REALTIME_MODEL,
  MAX_SESSION_SECONDS,
  buildInstructions,
  createRealtimeServer,
  isTrustedLocalOrigin,
} from '../tools/serve-realtime.mjs';

test('現行の低価格Realtimeモデルと2分上限を既定値にする', () => {
  assert.equal(DEFAULT_REALTIME_MODEL, 'gpt-realtime-2.1-mini');
  assert.equal(MAX_SESSION_SECONDS, 120);
  assert.ok(!read('realtime.js').includes('OPENAI_API_KEY'));
  assert.ok(!read('index.html').includes('sk-'));
});

test('会話指示は直前教材の3文だけを再利用する', () => {
  const lesson = loadData().IMMERSION_OUT[0];
  const prompt = buildInstructions(lesson);
  for (const sentence of lesson.sentences) assert.ok(prompt.includes(sentence.en));
  assert.ok(prompt.includes('at most 120 seconds'));
  assert.ok(prompt.includes('brief hint in Japanese'));
  assert.ok(prompt.includes('do not correct every mistake'));
});

test('フィードバックは3項目へ安全に整形する', () => {
  const context = { location:{hostname:'localhost',search:''}, window:{}, URLSearchParams, console, addEventListener:()=>{} };
  vm.createContext(context);
  vm.runInContext(read('realtime.js') + '\nglobalThis.feedbackOut=realtimeFeedback;', context);
  const lesson = loadData().IMMERSION_OUT[0];
  const result = context.feedbackOut('{"understood":"伝わった","oneFix":"冠詞","review":"A wide lens."}', lesson);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { understood:'伝わった', oneFix:'冠詞', review:'A wide lens.' });
  assert.equal(context.feedbackOut('invalid', lesson).review, lesson.sentences[0].en);
});

test('ローカルsession endpointは鍵をサーバーだけで使い1日2回目を拒否する', async t => {
  const lesson = loadData().IMMERSION_OUT[0];
  let upstreamOptions;
  const server = createRealtimeServer({
    lessons: [lesson],
    apiKey: 'test-server-only-key',
    fetchImpl: async (url, options) => {
      upstreamOptions = { url, options };
      return new Response('v=0\r\no=answer', { status: 200, headers:{'Content-Type':'application/sdp'} });
    },
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const { port } = server.address();
  const request = () => fetch(`http://127.0.0.1:${port}/api/realtime/session`, {
    method:'POST',
    headers:{ 'Origin':`http://127.0.0.1:${port}`, 'Content-Type':'application/sdp', 'X-Lesson-Id':lesson.id, 'X-Realtime-Client':'test-client-12345' },
    body:'v=0\r\no=offer',
  });
  const first = await request();
  assert.equal(first.status, 200);
  assert.equal(first.headers.get('x-realtime-max-seconds'), '120');
  assert.equal(upstreamOptions.url, 'https://api.openai.com/v1/realtime/calls');
  assert.equal(upstreamOptions.options.headers.Authorization, 'Bearer test-server-only-key');
  const session = JSON.parse(upstreamOptions.options.body.get('session'));
  assert.equal(session.model, 'gpt-realtime-2.1-mini');
  assert.ok(session.instructions.includes(lesson.sentences[0].en));
  const second = await request();
  assert.equal(second.status, 429);
});

test('鍵なしのローカルsession endpointはAPIへ接続しない', async t => {
  let called = false;
  const server = createRealtimeServer({ apiKey:'', fetchImpl:async()=>{ called=true; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/realtime/session`, { method:'POST', headers:{Origin:`http://127.0.0.1:${port}`} });
  assert.equal(response.status, 503);
  assert.equal(called, false);
});

test('外部Originからローカル課金endpointを呼べない', async t => {
  let called = false;
  const server = createRealtimeServer({ apiKey:'test-key', fetchImpl:async()=>{ called=true; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/realtime/session`, {
    method:'POST', headers:{Origin:'https://evil.example','Content-Type':'application/sdp'}, body:'v=0\r\no=offer',
  });
  assert.equal(response.status, 403);
  assert.equal(called, false);
  assert.equal(isTrustedLocalOrigin({headers:{host:`127.0.0.1:${port}`,origin:`http://127.0.0.1:${port}`}}), true);
});
