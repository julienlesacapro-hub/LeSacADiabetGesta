// Génère le logo de l'application à partir du logo d'origine (assets/logo/logo-source.jpg) :
// une femme enceinte et un morceau de sucre sortent à moitié du sac.
// Les éléments ajoutés sont vectoriels ; le devant du sac est redessiné par-dessus
// (copie détourée de l'image d'origine) pour qu'ils paraissent « dans » le sac.
//
// Le fond bleu d'origine est remplacé par le dégradé prune de l'application : le sac est
// détouré automatiquement (calcul d'opacité pixel par pixel par rapport au fond).
// Le groupe « femme + sucre » est centré horizontalement dans le sac.
//
// © 2026 LESACA Julien. Tous droits réservés.
//
// Usage : node tools/logo.mjs   (nécessite Playwright)
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { crc32 } from 'node:zlib';
import { AUTHOR, COPYRIGHT } from '../js/version.js';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const jpg = (await readFile(`${root}assets/logo/logo-source.jpg`)).toString('base64');
const SRC = `data:image/jpeg;base64,${jpg}`;


// Couleurs de l'application (voir css/app.css : --primary, --primary-strong).
const APP_BG = { light: '#8a64a0', mid: '#6b4a7e', dark: '#4f3560' };
const BAG_CENTER_X = 512; // axe du sac (languette, boucle)

// Bord supérieur du devant du sac, mesuré sur l'image d'origine (x, y en px sur 1024).
const RIM = [
  [286, 431], [296, 433], [328, 437], [344, 441], [360, 444], [376, 447], [392, 449], [408, 453],
  [424, 455], [440, 457], [456, 459], [480, 460], [504, 461], [528, 461], [552, 459], [576, 458],
  [600, 455], [616, 453], [632, 449], [648, 447], [664, 444], [688, 438], [728, 437], [740, 436],
];
const rimPath = `M${RIM.map(([x, y]) => `${x} ${y - 1}`).join(' L')} L752 436 L752 1000 L272 1000 L272 431 Z`;

// Couleurs
const C = {
  outline: '#fff4e8',
  dress: '#ec9c96',
  dressShade: '#d9827d',
  dressLight: '#f6b9b3',
  skin: '#f4c9a6',
  skinShade: '#e2ad88',
  hair: '#3a2219',
  hairLight: '#5b3627',
};

// Femme enceinte, de profil (tournée vers la droite), main posée sur le ventre.
const WOMAN = {
  body: 'M458 270 C470 264 488 264 496 270 C504 280 510 294 512 310 C514 322 510 330 508 336 C548 344 586 366 590 400 C594 434 572 456 540 466 L548 530 L440 530 C444 480 450 440 452 400 C448 372 444 340 446 310 C448 290 450 278 458 270 Z',
  belly: 'M508 336 C548 344 586 366 590 400 C594 434 572 456 540 466 C560 446 570 420 564 396 C558 370 536 350 508 346 Z',
  neck: 'M466 242 L486 244 L490 274 C482 279 470 279 462 274 Z',
  head: 'M478 180 C497 180 510 194 511 212 C511 218 514 222 518 228 C520 231 518 234 514 235 C513 240 512 244 508 247 C505 252 500 256 492 257 C478 258 462 250 454 236 C446 222 448 200 458 190 C463 184 470 180 478 180 Z',
  hair: 'M512 200 C506 182 490 174 474 176 C456 178 444 194 446 214 C447 230 452 244 462 254 C467 240 471 228 476 218 C484 206 498 200 512 200 Z',
  bun: 'M447 186 m-18 0 a18 18 0 1 0 36 0 a18 18 0 1 0 -36 0',
  sleeve: 'M462 274 C476 268 492 272 496 288 C498 300 494 310 486 314 L464 316 C458 302 456 286 462 274 Z',
  arm: 'M466 312 L486 312 C490 330 494 346 504 356 C518 366 540 364 556 360 C568 358 576 366 571 375 C566 384 548 388 528 388 C504 388 488 376 480 360 C472 344 468 328 466 312 Z',
};
// Agrandissements autour du bord du sac (lisibilité sur les petites icônes).
const WOMAN_T = 'translate(-24 0) translate(500 462) scale(1.08) translate(-500 -462)';
const CUBE_T = 'translate(5 -12) translate(660 452) scale(1.16) translate(-660 -452) rotate(-6 660 430)';

// Morceau de sucre : vrai cube en perspective, à moitié enfoncé dans le sac.
const F = [660, 418]; // sommet avant de la face supérieure
const L = [-62, -22]; // arête vers la gauche
const R = [64, -20]; // arête vers la droite
const V = 66; // arête verticale
const pt = (...vs) => vs.reduce((a, b) => [a[0] + b[0], a[1] + b[1]], [0, 0]);
const P2 = ([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`;
const DOWN = [0, V];
const CUBE_OUTLINE = `M${[pt(F, L), pt(F, L, R), pt(F, R), pt(F, R, DOWN), pt(F, DOWN), pt(F, L, DOWN)].map(P2).join(' L')} Z`;

function sugarCube() {
  const face = (a, b) => `M${[F, pt(F, a), pt(F, a, b), pt(F, b)].map(P2).join(' L')} Z`;
  // Cristaux de sucre : positions pseudo-aléatoires reproductibles sur chaque face.
  const grains = [];
  const seq = [[0.22, 0.3], [0.55, 0.2], [0.78, 0.55], [0.35, 0.68], [0.62, 0.82], [0.18, 0.88], [0.86, 0.22], [0.45, 0.45]];
  const faces = [[L, R, '#e2e7ed'], [L, DOWN, '#c9d1db'], [R, DOWN, '#b5bfcb']];
  faces.forEach(([a, b, color], fi) => {
    seq.forEach(([u, v], i) => {
      if ((i + fi) % 4 === 3) return;
      const [x, y] = pt(F, [a[0] * u + b[0] * v, a[1] * u + b[1] * v]);
      const sz = i % 3 ? 3.6 : 4.8;
      grains.push(`<rect x="${(x - sz / 2).toFixed(1)}" y="${(y - sz / 2).toFixed(1)}" width="${sz}" height="${sz}" rx="1" fill="${color}" transform="rotate(${(i * 37 + fi * 20) % 90} ${x.toFixed(1)} ${y.toFixed(1)})"/>`);
    });
  });
  const edges = [[F, pt(F, L)], [F, pt(F, R)], [F, pt(F, DOWN)]].map(([a, b]) => `M${P2(a)} L${P2(b)}`).join(' ');
  return `<g transform="${CUBE_T}">
    <path d="${CUBE_OUTLINE}" fill="${C.outline}" stroke="${C.outline}" stroke-width="12" stroke-linejoin="round"/>
    <path d="${face(L, DOWN)}" fill="#eef1f5"/>
    <path d="${face(R, DOWN)}" fill="#d6dce4"/>
    <path d="${face(L, R)}" fill="#ffffff"/>
    <path d="${edges}" fill="none" stroke="#c3cbd5" stroke-width="2.5" stroke-linecap="round"/>
    ${grains.join('')}
  </g>
  <g fill="#ffffff" opacity="0.95">
    <path d="M748 318 l5 13 13 5 -13 5 -5 13 -5 -13 -13 -5 13 -5 Z"/>
    <path d="M604 322 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z" opacity="0.8"/>
  </g>`;
}

function woman() {
  const all = [WOMAN.bun, WOMAN.hair, WOMAN.head, WOMAN.neck, WOMAN.body, WOMAN.sleeve, WOMAN.arm];
  return `<g transform="${WOMAN_T}">
    ${all.map((d) => `<path d="${d}" fill="${C.outline}" stroke="${C.outline}" stroke-width="12" stroke-linejoin="round"/>`).join('')}
    <path d="${WOMAN.body}" fill="${C.dress}"/>
    <path d="${WOMAN.belly}" fill="${C.dressLight}" opacity="0.6"/>
    <path d="M518 352 C548 360 574 380 580 404" fill="none" stroke="#fbd2cd" stroke-width="5" stroke-linecap="round" opacity="0.9"/>
    <path d="${WOMAN.neck}" fill="${C.skinShade}"/>
    <path d="${WOMAN.head}" fill="${C.skin}"/>
    <path d="${WOMAN.bun}" fill="${C.hair}"/>
    <path d="${WOMAN.hair}" fill="${C.hair}"/>
    <path d="M458 196 C464 186 474 181 486 180" fill="none" stroke="${C.hairLight}" stroke-width="4" stroke-linecap="round"/>
    <path d="M491 213 C494 217 499 217 503 213" fill="none" stroke="${C.hair}" stroke-width="3" stroke-linecap="round"/>
    <path d="M509 244 C506 246 503 246 500 245" fill="none" stroke="#c4806a" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="496" cy="229" r="6" fill="#ef9f95" opacity="0.5"/>
    <path d="${WOMAN.sleeve}" fill="${C.dressShade}"/>
    <path d="${WOMAN.arm}" fill="${C.skin}"/>
    <path d="M532 388 C546 388 560 385 568 379" fill="none" stroke="${C.skinShade}" stroke-width="3" stroke-linecap="round"/>
  </g>`;
}

/**
 * @param {{rounded?: boolean, scale?: number, bag?: string, dx?: number}} o
 *   rounded : coins transparents (icône « any ») ; sinon fond jusqu'aux bords (masquable / iOS).
 *   scale   : réduction du dessin dans le carré (zone de sécurité des icônes masquables).
 *   bag     : image du sac détouré (PNG transparent) ; à défaut, l'image d'origine.
 *   dx      : décalage horizontal du groupe femme + sucre (centrage dans le sac).
 */
export function logoSVG({ rounded = true, scale = 1, bag = SRC, dx = 0 } = {}) {
  const t = scale === 1 ? '' : ` transform="translate(${512 * (1 - scale)} ${512 * (1 - scale)}) scale(${scale})"`;
  const g = `translate(${dx.toFixed(1)} 0)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1024 1024" width="1024" height="1024">
  <title>LeSacADiabetGesta</title>
  <desc>Logo de l’application LeSacADiabetGesta. ${COPYRIGHT}</desc>
  <metadata>
    <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <rdf:Description dc:title="LeSacADiabetGesta" dc:creator="${AUTHOR}" dc:rights="${COPYRIGHT}"/>
    </rdf:RDF>
  </metadata>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${APP_BG.light}"/>
      <stop offset="0.55" stop-color="${APP_BG.mid}"/>
      <stop offset="1" stop-color="${APP_BG.dark}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.82" cy="0.1" r="0.5">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="inside" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a170c" stop-opacity="0"/>
      <stop offset="1" stop-color="#2a170c" stop-opacity="0.45"/>
    </linearGradient>
    <clipPath id="src"><rect x="5" y="5" width="1014" height="1014" rx="217"/></clipPath>
    <clipPath id="front"><path d="${rimPath}"/></clipPath>
    <clipPath id="items">
      <path d="${WOMAN.body}" transform="${g} ${WOMAN_T}"/><path d="${WOMAN.arm}" transform="${g} ${WOMAN_T}"/>
      <path d="${CUBE_OUTLINE}" transform="${g} ${CUBE_T}"/>
    </clipPath>
    <clipPath id="icon"><rect width="1024" height="1024" rx="222"/></clipPath>
    <filter id="lift" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#1b0e06" flood-opacity="0.45"/>
    </filter>
  </defs>
  <g${rounded ? ' clip-path="url(#icon)"' : ''}>
    <rect width="1024" height="1024" fill="url(#bg)"/>
    <rect width="1024" height="1024" fill="url(#glow)"/>
    <g${t}>
      <image href="${bag}" width="1024" height="1024" clip-path="url(#src)"/>
      <g filter="url(#lift)" transform="${g}">
        <g id="woman">${woman()}</g>
        <g id="sugar">${sugarCube()}</g>
      </g>
      <!-- ombre de l'intérieur du sac sur la partie basse des éléments -->
      <rect x="280" y="404" width="480" height="62" fill="url(#inside)" clip-path="url(#items)"/>
      <!-- devant du sac redessiné par-dessus -->
      <image href="${bag}" width="1024" height="1024" clip-path="url(#front)"/>
    </g>
  </g>
</svg>`;
}

/**
 * Détoure le sac : opacité de chaque pixel selon son écart à la couleur du fond bleu
 * (estimée ligne par ligne), puis retrait de la teinte bleue sur les bords (décontamination).
 * Calcul fait dans Chromium (canvas) ; renvoie un PNG transparent en data URL.
 */
async function extractBag(page) {
  await page.setViewportSize({ width: 1024, height: 1024 });
  await page.setContent('<html><body></body></html>');
  return page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const W = 1024;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = W;
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const im = ctx.getImageData(0, 0, W, W);
    const d = im.data;
    const isNavy = (r, g, b) => b > 50 && b - r > 28 && b - g > 12;
    // Couleur du fond par ligne (moyenne des pixels bleus), lissée et complétée.
    const bg = new Array(W).fill(null);
    for (let y = 0; y < W; y++) {
      let n = 0, r = 0, g = 0, b = 0;
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (isNavy(d[i], d[i + 1], d[i + 2])) { n++; r += d[i]; g += d[i + 1]; b += d[i + 2]; }
      }
      if (n > 20) bg[y] = [r / n, g / n, b / n];
    }
    let last = bg.find(Boolean);
    for (let y = 0; y < W; y++) { if (bg[y]) last = bg[y]; else bg[y] = last; }
    // Pixels hors du carré arrondi d'origine (coins noirs et liseré) : transparents.
    const inset = 14, rad = 222 - inset;
    const inRound = (x, y) => {
      const cx = Math.min(Math.max(x, inset + rad), W - inset - rad);
      const cy = Math.min(Math.max(y, inset + rad), W - inset - rad);
      return (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad;
    };
    const T0 = 16, T1 = 58;
    for (let y = 0; y < W; y++) {
      const [br, bgc, bb] = bg[y];
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (!inRound(x, y)) { d[i + 3] = 0; continue; }
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const dist = Math.hypot(r - br, g - bgc, b - bb);
        let a = (dist - T0) / (T1 - T0);
        a = a <= 0 ? 0 : a >= 1 ? 1 : a * a * (3 - 2 * a);
        if (a > 0 && a < 1) {
          d[i] = Math.max(0, Math.min(255, (r - (1 - a) * br) / a));
          d[i + 1] = Math.max(0, Math.min(255, (g - (1 - a) * bgc) / a));
          d[i + 2] = Math.max(0, Math.min(255, (b - (1 - a) * bb) / a));
        }
        d[i + 3] = Math.round(a * 255);
      }
    }
    // Le trait de contour gris foncé du dessin d'origine (invisible sur le bleu nuit) est teinté
    // en prune foncé, uniquement au bord du sac, pour s'accorder au nouveau fond.
    const A = new Uint8Array(W * W);
    for (let k = 0; k < W * W; k++) A[k] = d[k * 4 + 3];
    for (let y = 3; y < W - 3; y++) {
      for (let x = 3; x < W - 3; x++) {
        const k = y * W + x;
        const i = k * 4;
        if (!A[k]) continue;
        const r = d[i], g = d[i + 1], b = d[i + 2];
        if (Math.max(r, g, b) > 100 || r - b > 18) continue; // seulement les gris / bleus sombres
        let edge = false;
        for (let dy = -3; dy <= 3 && !edge; dy++) {
          for (let dx = -3; dx <= 3; dx++) if (A[k + dy * W + dx] < 128) { edge = true; break; }
        }
        if (!edge) continue;
        const lum = 0.3 * r + 0.59 * g + 0.11 * b;
        d[i] = Math.min(255, lum * 1.2);
        d[i + 1] = Math.min(255, lum * 0.78);
        d[i + 2] = Math.min(255, lum * 1.38);
      }
    }
    ctx.putImageData(im, 0, 0);
    return cv.toDataURL('image/png');
  }, SRC);
}

/** Mesure le groupe femme + sucre et calcule le décalage qui le centre sur l'axe du sac. */
async function centeringOffset(page, bag) {
  await page.setViewportSize({ width: 1024, height: 1024 });
  await page.setContent(`<html><body style="margin:0">${logoSVG({ bag, dx: 0 })}</body></html>`);
  const box = await page.evaluate(() => {
    const rects = [document.querySelector('#woman > g'), document.querySelector('#sugar > g')].map((e) => e.getBoundingClientRect());
    return { left: Math.min(...rects.map((r) => r.left)), right: Math.max(...rects.map((r) => r.right)) };
  });
  return { dx: BAG_CENTER_X - (box.left + box.right) / 2, box };
}

/** Ajoute des métadonnées texte (auteur, droits) à un PNG. */
async function tagPNG(file) {
  const buf = await readFile(file);
  const chunk = (key, value) => {
    const data = Buffer.concat([Buffer.from(key, 'latin1'), Buffer.from([0]), Buffer.from(value, 'latin1')]);
    const type = Buffer.from('tEXt', 'latin1');
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([type, data])) >>> 0);
    return Buffer.concat([len, type, data, crc]);
  };
  const ihdrEnd = 8 + 4 + 4 + 13 + 4; // signature + IHDR complet
  const extra = Buffer.concat([chunk('Title', 'LeSacADiabetGesta'), chunk('Author', AUTHOR), chunk('Copyright', COPYRIGHT)]);
  await writeFile(file, Buffer.concat([buf.subarray(0, ihdrEnd), extra, buf.subarray(ihdrEnd)]));
}

async function render(page, svg, size, file, { transparent = true } = {}) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('width="1024" height="1024">', `width="${size}" height="${size}">`)}</body></html>`);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(150);
  await page.screenshot({ path: file, omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const out = process.argv[2] || root;
  const bag = await extractBag(page);
  const { dx, box } = await centeringOffset(page, bag);
  const rounded = logoSVG({ rounded: true, bag, dx });
  const full = logoSVG({ rounded: false, bag, dx });
  const maskable = logoSVG({ rounded: false, scale: 0.84, bag, dx });
  await writeFile(`${out}assets/logo/logo.svg`, rounded);
  const outputs = [
    [rounded, 1024, 'assets/logo/logo-1024.png', true],
    [full, 1024, 'assets/logo/logo-1024-carre.png', false],
    [rounded, 512, 'assets/icons/icon-512.png', true],
    [rounded, 192, 'assets/icons/icon-192.png', true],
    [rounded, 48, 'assets/icons/favicon-48.png', true],
    [maskable, 512, 'assets/icons/icon-maskable-512.png', false],
    [maskable, 192, 'assets/icons/icon-maskable-192.png', false],
    [full, 180, 'assets/icons/apple-touch-icon.png', false],
  ];
  for (const [svg, size, file, transparent] of outputs) {
    await render(page, svg, size, `${out}${file}`, { transparent });
    await tagPNG(`${out}${file}`);
  }
  await browser.close();
  console.log(`Logo et icônes générés (groupe femme + sucre : ${box.left.toFixed(0)}–${box.right.toFixed(0)} px avant centrage, décalage ${dx.toFixed(1)} px)`);
}
