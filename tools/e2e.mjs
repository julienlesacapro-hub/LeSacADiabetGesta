// Parcours de bout en bout dans Chromium (format smartphone) : onboarding, saisie, carnet, courbes,
// informations, exports CSV et PDF. Usage : node tools/e2e.mjs [dossier-captures]
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { startServer } from './serve.mjs';

const { chromium, devices } = createRequire(import.meta.url)('playwright');
const outDir = process.argv[2] || 'e2e-output';
await mkdir(outDir, { recursive: true });

const server = await startServer(0);
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'fr-FR', timezoneId: 'Europe/Paris', acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

let shot = 0;
const snap = async (name, full = true) => {
  shot += 1;
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${outDir}/${String(shot).padStart(2, '0')}-${name}.png`, fullPage: full });
};

// Dates relatives à aujourd'hui pour un scénario réaliste.
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };

await page.goto(base);
await page.waitForSelector('.welcome-hero');
await snap('bienvenue');
await page.click('[data-next]');

// Étape grossesse
await page.selectOption('select[name="datingMethod"]', 'ddg');
await page.fill('input[name="datingDate"]', daysAgo(26 * 7 - 14 + 3));
await page.dispatchEvent('input[name="datingDate"]', 'change');
await page.waitForFunction(() => document.querySelector('[data-gapreview]').textContent.includes('SA'));
await snap('onb-grossesse');
await page.click('button[type="submit"]');

// Étape « Vous »
await page.fill('input[name="firstName"]', 'Camille');
await page.fill('input[name="birthDate"]', '1989-04-12');
await page.fill('input[name="heightCm"]', '165');
await page.fill('input[name="prePregnancyWeightKg"]', '71');
await page.fill('input[name="currentWeightKg"]', '79,5');
await page.dispatchEvent('input[name="currentWeightKg"]', 'change');
await snap('onb-vous');
await page.click('button[type="submit"]');

// Antécédents
await page.click('text=Diabète chez un parent du premier degré');
await snap('onb-antecedents');
await page.click('button[type="submit"]');

// Situation : diabète gestationnel, régime
await page.click('text=Diabète gestationnel diagnostiqué');
await page.fill('input[name="diagnosisDate"]', daysAgo(12));
await page.dispatchEvent('input[name="diagnosisDate"]', 'change');
await snap('onb-situation');
await page.click('button[type="submit"]');

// Unité
await page.click('[data-setunit="g/L"]');
await snap('onb-unite');
await page.click('button[type="submit"]');
await page.waitForSelector('.hello');

// Injection d'un historique réaliste de 12 jours (dans plusieurs unités) via l'interface de stockage.
await page.evaluate(({ days }) => {
  const key = 'lesacadiabetgesta:v1';
  const s = JSON.parse(localStorage.getItem(key));
  const rnd = (seed) => { let x = Math.sin(seed) * 10000; return x - Math.floor(x); };
  const readings = [];
  days.forEach((d, i) => {
    const f = 0.84 + rnd(i) * 0.16;
    readings.push({ ts: `${d}T07:${String(10 + (i % 40)).padStart(2, '0')}`, moment: 'fasting', value: Math.round(f * 100) / 100, unit: 'g/L' });
    readings.push({ ts: `${d}T10:05`, moment: 'post_breakfast', value: Math.round((1.05 + rnd(i + 50) * 0.3) * 100) / 100, unit: 'g/L', note: i === 3 ? 'Brioche au petit-déjeuner' : '' , tags: i === 3 ? ['unusual_meal'] : [] });
    if (i % 4 !== 1) readings.push({ ts: `${d}T14:30`, moment: 'post_lunch', value: Math.round(95 + rnd(i + 90) * 30), unit: 'mg/dL' });
    readings.push({ ts: `${d}T21:40`, moment: 'post_dinner', value: Math.round((5.6 + rnd(i + 130) * 1.4) * 10) / 10, unit: 'mmol/L', tags: i === 5 ? ['activity'] : [] });
  });
  s.readings = readings.map((r, k) => ({ id: `seed-${k}`, ...r, mgdl: r.unit === 'g/L' ? r.value * 100 : r.unit === 'mg/dL' ? r.value : r.value * 18.0156, tags: r.tags || [], note: r.note || '', insulin: null, createdAt: new Date().toISOString() }));
  localStorage.setItem(key, JSON.stringify(s));
}, { days: Array.from({ length: 12 }, (_, i) => daysAgo(12 - i)) });
await page.reload();
await page.waitForSelector('.hello');
await snap('accueil');

// Saisie rapide : 105 tapé avec unité g/L par défaut → détection mg/dL
await page.click('[data-fab]');
await page.waitForSelector('#glyc-value');
await page.click('[data-moment="post_lunch"]');
await page.keyboard.type('135');
await page.waitForFunction(() => document.querySelector('[data-unitlabel]').textContent === 'mg/dL');
const statusText = await page.textContent('[data-status]');
assert.match(statusText, /Au-dessus/);
const conv = await page.textContent('[data-conv]');
assert.match(conv, /1,35\s*g\/L/);
assert.match(conv, /7,5\s*mmol\/L/);
await snap('saisie-detection-unite', false);
await page.keyboard.press('Enter');
await page.waitForSelector('.toast');

// Seconde saisie en mmol/L, à jeun
await page.click('[data-fab]');
await page.click('[data-moment="fasting"]');
await page.fill('#glyc-value', '5,0');
await page.dispatchEvent('#glyc-value', 'input');
assert.equal(await page.textContent('[data-unitlabel]'), 'mmol/L');
assert.match(await page.textContent('[data-status]'), /Dans l’objectif/);
await snap('saisie-mmol', false);
await page.click('[data-save]');
await page.waitForTimeout(400);
await snap('accueil-apres-saisie');

// Carnet : tableau, courbes, liste
await page.click('a.tab[href="#/carnet"]');
await page.waitForSelector('table.carnet');
await snap('carnet-tableau');
await page.click('[data-mode="charts"]');
await page.waitForSelector('.chart svg');
const pts = await page.$$eval('.chart .hit', (els) => els.length);
assert.ok(pts > 30, `points tracés : ${pts}`);
await page.click('.chart[data-moment="post_breakfast"] .hit >> nth=2');
await snap('carnet-courbes');
await page.click('[data-mode="list"]');
await snap('carnet-liste');
await page.click('[data-mode="table"]');

// Modification depuis le tableau
await page.click('td.is-high .cell >> nth=0');
await page.waitForSelector('[data-delete]');
await snap('edition', false);
await page.click('button[data-close]');
await page.waitForTimeout(300);

// Comprendre
await page.click('a.tab[href="#/comprendre"]');
await snap('comprendre');
await page.click('a[href="#/comprendre/depistage"]');
await snap('depistage');
await page.goto(`${base}#/comprendre/hgpo`);
await page.click('[data-ogtt-play]');
await page.waitForTimeout(4200);
await snap('hgpo-animation');
await page.goto(`${base}#/comprendre/diagnostic`);
await page.fill('input[name="t0"]', '0,90');
await page.fill('input[name="t60"]', '1,85');
await page.fill('input[name="t120"]', '1,40');
await page.dispatchEvent('input[name="t120"]', 'input');
assert.match(await page.textContent('[data-simresult]'), /correspondent aux critères/);
await snap('diagnostic-simulateur');
await page.goto(`${base}#/comprendre/risques`);
await snap('risques');
await page.goto(`${base}#/comprendre/suivi`);
await snap('suivi');

// Profil
await page.goto(`${base}#/profil`);
await snap('profil');

// Export
await page.goto(`${base}#/export`);
await page.waitForSelector('[data-pdf]');
await snap('export');
const [csvDl] = await Promise.all([page.waitForEvent('download'), page.click('[data-csv]')]);
await csvDl.saveAs(`${outDir}/export.csv`);
await page.click('[data-csvformat="daily"]');
const [csvDl2] = await Promise.all([page.waitForEvent('download'), page.click('[data-csv]')]);
await csvDl2.saveAs(`${outDir}/export-carnet.csv`);
const [pdfDl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.click('[data-pdf]')]);
await pdfDl.saveAs(`${outDir}/export.pdf`);

// Mode sombre
await page.emulateMedia({ colorScheme: 'dark' });
await page.goto(`${base}#/accueil`);
await snap('accueil-sombre');
await page.goto(`${base}#/carnet`);
await page.click('[data-mode="charts"]');
await snap('courbes-sombre');

await writeFile(`${outDir}/errors.json`, JSON.stringify(errors, null, 2));
await browser.close();
server.close();
if (errors.length) {
  console.error('Erreurs détectées :\n' + errors.join('\n'));
  process.exit(1);
}
console.log(`Parcours terminé sans erreur. Captures et exports dans ${outDir}/`);
