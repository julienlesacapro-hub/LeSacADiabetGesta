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

test('la version est identique dans package.json, js/version.js et sw.js', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const { APP_VERSION } = await import('../js/version.js');
  const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  assert.equal(pkg.version, APP_VERSION);
  assert.match(sw, new RegExp(`const VERSION = 'lsadg-v${APP_VERSION.replace(/\./g, '\\.')}'`));
});

test('le manifeste est installable (identifiant, icônes PNG, portée)', async () => {
  const m = JSON.parse(await readFile(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(m.id, 'lesacadiabetgesta');
  assert.equal(m.display, 'standalone');
  assert.equal(m.start_url, './');
  assert.equal(m.scope, './');
  for (const size of ['192x192', '512x512']) {
    assert.ok(m.icons.some((i) => i.sizes === size && i.type === 'image/png' && i.purpose === 'any'), `icône ${size}`);
    assert.ok(m.icons.some((i) => i.sizes === size && i.purpose === 'maskable'), `icône masquable ${size}`);
  }
  assert.ok(m.icons.every((i) => i.type === 'image/png'), 'icônes PNG uniquement');
});
