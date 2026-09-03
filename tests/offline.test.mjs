import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT, read } from './helpers.mjs';

test('Service Workerの静的キャッシュ参照が存在する', () => {
  const context = { self:{ addEventListener:()=>{}, AUDIO_FILES:[] }, importScripts:()=>{} };
  vm.createContext(context);
  vm.runInContext(read('sw.js') + '\nglobalThis.ASSETS_OUT=ASSETS;globalThis.CACHE_OUT=CACHE;', context);
  /* 版数は公開のたびに deploy-app.js が上げる。名前の形だけ見張る
     （固定値にすると、公開するたびにこのテストが落ちる） */
  assert.match(context.CACHE_OUT, /^tomoya-house-v[0-9]+$/);
  assert.ok(context.ASSETS_OUT.includes('./data/immersion.js'));
  assert.ok(context.ASSETS_OUT.includes('./wordbuild.js'));
  assert.ok(context.ASSETS_OUT.includes('./realtime.js'));
  for (const asset of context.ASSETS_OUT.filter(x => x !== './')) {
    assert.ok(fs.existsSync(path.join(ROOT, asset.replace(/^\.\//, ''))), asset);
  }
});
