import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export const ROOT = path.resolve(import.meta.dirname, '..');
export const read = name => fs.readFileSync(path.join(ROOT, name), 'utf8');

export function loadData() {
  const context = {};
  vm.createContext(context);
  const exports = {
    'data/topics.js': 'globalThis.TOPICS_OUT = TOPICS;',
    'data/parse.js': 'globalThis.PARSE_OUT = PARSE; globalThis.ROLES_OUT = ROLE_INFO;',
    'data/immersion.js': 'globalThis.IMMERSION_OUT = IMMERSION_LESSONS;',
    'audio/manifest.js': 'globalThis.AUDIO_OUT = AUDIO_MANIFEST;',
  };
  for (const [file, tail] of Object.entries(exports)) {
    vm.runInContext(read(file) + '\n' + tail, context, { filename: file });
  }
  return context;
}
