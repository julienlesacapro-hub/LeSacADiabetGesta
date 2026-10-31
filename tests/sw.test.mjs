import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

async function list(dir) {
  const out = [];
  for (const e of await readdir(new URL(`../${dir}/`, import.meta.url), { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...(await list(`${dir}/${e.name}`)));
    else out.push(`./${dir}/${e.name}`);
  }
  return out;
}

test('le service worker met en cache tous les fichiers de l’application', async () => {
  const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  const files = [...(await list('js')), ...(await list('css')), ...(await list('assets/icons')), './vendor/jspdf/jspdf.umd.min.js'];
  const missing = files.filter((f) => !sw.includes(`'${f}'`));
  assert.deepEqual(missing, []);
});
