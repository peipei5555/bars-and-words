// 版を上げる。index.html の ?v=、app.js の APP_VERSION、version.json を揃えて書き換える。
// 使い方: node tools/bump-version.mjs   （同じ日なら末尾の番号が1つ増える）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const write = (f, s) => fs.writeFileSync(path.join(root, f), s, 'utf8');

const cur = JSON.parse(read('version.json')).version;
const d = new Date();
const today = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
const [curDay, curN] = cur.split('-');
const next = `${today}-${curDay === today ? Number(curN) + 1 : 1}`;

write('version.json', `{ "version": "${next}" }\n`);
write('index.html', read('index.html').replace(/\?v=[^"]*"/g, `?v=${next}"`));
write('app.js', read('app.js').replace(/const APP_VERSION = '[^']*'/, `const APP_VERSION = '${next}'`));
console.log(`${cur} -> ${next}`);
