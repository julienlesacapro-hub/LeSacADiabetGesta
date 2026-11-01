// Génère les icônes PNG à partir de assets/icons/icon.svg (nécessite Playwright).
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Playwright est chargé via require pour profiter d'une installation globale éventuelle.
const { chromium } = createRequire(import.meta.url)('playwright');
const dir = fileURLToPath(new URL('../assets/icons/', import.meta.url));
const svg = await readFile(`${dir}icon.svg`, 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
async function render(size, file, { maskable = false } = {}) {
  await page.setViewportSize({ width: size, height: size });
  const inner = maskable
    ? `<div style="width:${size}px;height:${size}px;background:#6b4a7e;display:grid;place-items:center"><div style="width:${size * 0.8}px;height:${size * 0.8}px">${svg.replace('rx="112"', 'rx="0"')}</div></div>`
    : `<div style="width:${size}px;height:${size}px">${svg}</div>`;
  await page.setContent(`<html><body style="margin:0;background:transparent">${inner}<style>svg{width:100%;height:100%;display:block}</style></body></html>`);
  await page.screenshot({ path: `${dir}${file}`, omitBackground: !maskable, clip: { x: 0, y: 0, width: size, height: size } });
}
await render(192, 'icon-192.png');
await render(512, 'icon-512.png');
await render(192, 'icon-maskable-192.png', { maskable: true });
await render(512, 'icon-maskable-512.png', { maskable: true });
await render(180, 'apple-touch-icon.png', { maskable: true });
await browser.close();
console.log('Icônes générées');
