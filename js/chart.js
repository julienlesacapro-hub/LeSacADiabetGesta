// Courbes glycémiques : un petit graphique par moment de mesure (mêmes axes pour comparer).
// Le modèle (chartModel) est indépendant du rendu : il sert à l'écran (SVG) et au PDF.
import { MAIN_MOMENTS, momentById } from './guidelines.js';
import { evaluateReading, targetForMoment, STATUS_LABELS } from './analysis.js';
import { fromMgdl, formatValue, formatNumber } from './units.js';
import { addDays, diffDays, tsDate, tsMinutes, formatDateShort, formatTime } from './dates.js';
import { esc } from './ui.js';

const STEPS = { 'g/L': [0.1, 0.2, 0.5], 'mg/dL': [10, 20, 50], 'mmol/L': [0.5, 1, 2] };

/** Domaine vertical commun (unité d'affichage), incluant les objectifs. */
export function yDomain(readings, targets, unit) {
  const vals = readings.map((r) => fromMgdl(r.mgdl, unit));
  vals.push(targets.fasting[unit], targets.post[unit]);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  const span = Math.max(hi - lo, unit === 'mg/dL' ? 40 : unit === 'g/L' ? 0.4 : 2);
  const step = STEPS[unit].find((s) => span / s <= 6) || STEPS[unit][2];
  lo = Math.floor((lo - span * 0.08) / step) * step;
  hi = Math.ceil((hi + span * 0.08) / step) * step;
  if (lo < 0) lo = 0;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return { lo, hi, ticks };
}

/** Modèle d'un graphique en coordonnées normalisées (x, y ∈ [0, 1], y = 0 en bas). */
export function chartModel(readings, { momentId, from, to, unit, targets, domain }) {
  const nDays = Math.max(1, diffDays(to, from) + 1);
  const target = targetForMoment(momentId, targets);
  const ny = (v) => (v - domain.lo) / (domain.hi - domain.lo || 1);
  const points = readings
    .filter((r) => r.moment === momentId)
    .map((r) => {
      const day = diffDays(tsDate(r.ts), from);
      const x = (day + tsMinutes(r.ts) / 1440) / nDays;
      const v = fromMgdl(r.mgdl, unit);
      return { r, x, y: ny(v), v, status: evaluateReading(r, targets).status };
    })
    .filter((p) => p.x >= 0 && p.x <= 1)
    .sort((a, b) => a.x - b.x);
  const labelCount = nDays <= 7 ? nDays : 4;
  const xLabels = [];
  for (let i = 0; i < labelCount; i++) {
    const day = labelCount === 1 ? 0 : Math.round((i * (nDays - 1)) / (labelCount - 1));
    const iso = addDays(from, day);
    xLabels.push({ x: (day + 0.5) / nDays, label: `${iso.slice(8, 10)}/${iso.slice(5, 7)}` });
  }
  return {
    momentId,
    points,
    target: target ? { value: target[unit], y: ny(target[unit]) } : null,
    ticks: domain.ticks.map((v) => ({ v, y: ny(v), label: formatNumber(v, unit === 'mg/dL' ? 0 : 1) })),
    xLabels,
  };
}

const W = 340;
const H = 150;
const M = { l: 34, r: 8, t: 10, b: 22 };

function sx(x) {
  return M.l + x * (W - M.l - M.r);
}
function sy(y) {
  return H - M.b - y * (H - M.t - M.b);
}

function marker(p, i) {
  const x = sx(p.x).toFixed(1);
  const y = sy(p.y).toFixed(1);
  const cls = `pt ${p.status}`;
  let shape;
  if (p.status === 'high') shape = `<path class="${cls}" d="M${x} ${(+y - 6).toFixed(1)} L${(+x + 5.6).toFixed(1)} ${(+y + 4).toFixed(1)} L${(+x - 5.6).toFixed(1)} ${(+y + 4).toFixed(1)} Z"/>`;
  else if (p.status === 'low' || p.status === 'verylow') shape = `<path class="${cls}" d="M${x} ${(+y + 6).toFixed(1)} L${(+x + 5.6).toFixed(1)} ${(+y - 4).toFixed(1)} L${(+x - 5.6).toFixed(1)} ${(+y - 4).toFixed(1)} Z"/>`;
  else shape = `<circle class="${cls}" cx="${x}" cy="${y}" r="4.6"/>`;
  return `${shape}<circle class="hit" data-i="${i}" cx="${x}" cy="${y}" r="13"/>`;
}

export function renderChartSVG(model, unit) {
  const m = momentById(model.momentId);
  const parts = [];
  parts.push(`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`Courbe ${m.label}`)}">`);
  if (model.target) {
    const ty = sy(model.target.y);
    parts.push(`<rect class="target-zone" x="${M.l}" y="${ty.toFixed(1)}" width="${W - M.l - M.r}" height="${(H - M.b - ty).toFixed(1)}" rx="4"/>`);
  }
  parts.push('<g class="grid">');
  for (const t of model.ticks) parts.push(`<line x1="${M.l}" x2="${W - M.r}" y1="${sy(t.y).toFixed(1)}" y2="${sy(t.y).toFixed(1)}"/>`);
  parts.push('</g><g class="axis">');
  for (const t of model.ticks) parts.push(`<text x="${M.l - 6}" y="${(sy(t.y) + 3.5).toFixed(1)}" text-anchor="end">${t.label}</text>`);
  for (const l of model.xLabels) parts.push(`<text x="${sx(l.x).toFixed(1)}" y="${H - 6}" text-anchor="middle">${l.label}</text>`);
  parts.push('</g>');
  if (model.target) {
    const ty = sy(model.target.y);
    parts.push(`<line class="target-line" x1="${M.l}" x2="${W - M.r}" y1="${ty.toFixed(1)}" y2="${ty.toFixed(1)}"/>`);
  }
  if (model.points.length > 1) {
    const d = model.points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ');
    parts.push(`<path class="series" d="${d}"/>`);
  }
  model.points.forEach((p, i) => parts.push(marker(p, i)));
  if (model.target) {
    // Étiquette au-dessus des points, à gauche si la droite est encombrée.
    const ty = sy(model.target.y);
    const crowdedRight = model.points.some((p) => p.x > 0.7 && Math.abs(sy(p.y) - (ty - 8)) < 10);
    const lx = crowdedRight ? M.l + 4 : W - M.r - 2;
    parts.push(`<text class="target-label" x="${lx}" y="${(ty - 5).toFixed(1)}" text-anchor="${crowdedRight ? 'start' : 'end'}">objectif &lt; ${formatValue(model.target.value, unit, { withUnit: false })}</text>`);
  }
  parts.push('</svg>');
  return parts.join('');
}

/** Rendu des petits multiples dans un conteneur, avec info-bulle au toucher. */
export function mountCharts(container, readings, { from, to, unit, targets }) {
  const domain = yDomain(readings.length ? readings : [], targets, unit);
  const models = MAIN_MOMENTS.map((m) => chartModel(readings, { momentId: m.id, from, to, unit, targets, domain }));
  container.innerHTML = models.map((model) => {
    const m = momentById(model.momentId);
    const n = model.points.length;
    const high = model.points.filter((p) => p.status === 'high').length;
    return `<div class="card chart-card">
      <div class="chart-title"><h3>${esc(m.label)}</h3><span class="tiny">${n ? `${n} mesure${n > 1 ? 's' : ''} · ${high} dépassement${high > 1 ? 's' : ''}` : 'aucune mesure'}</span></div>
      <div class="chart" data-moment="${m.id}">${renderChartSVG(model, unit)}</div>
    </div>`;
  }).join('');
  container.querySelectorAll('.chart').forEach((el, idx) => {
    const model = models[idx];
    let tip = null;
    const hide = () => { tip?.remove(); tip = null; el.querySelector('.sel')?.remove(); };
    el.addEventListener('click', (e) => {
      const hit = e.target.closest('.hit');
      hide();
      if (!hit) return;
      const p = model.points[Number(hit.dataset.i)];
      const svg = el.querySelector('svg');
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('class', 'sel');
      ring.setAttribute('cx', hit.getAttribute('cx'));
      ring.setAttribute('cy', hit.getAttribute('cy'));
      ring.setAttribute('r', '8.5');
      svg.appendChild(ring);
      tip = document.createElement('div');
      tip.className = 'chart-tip';
      tip.innerHTML = `<strong>${formatValue(p.v, unit)}</strong> · ${esc(STATUS_LABELS[p.status])}<br>${formatDateShort(tsDate(p.r.ts))} à ${formatTime(p.r.ts)}`;
      const rect = svg.getBoundingClientRect();
      const left = (Number(hit.getAttribute('cx')) / W) * rect.width;
      tip.style.left = `${Math.min(Math.max(left, 70), rect.width - 70)}px`;
      tip.style.top = `${(Number(hit.getAttribute('cy')) / H) * rect.height}px`;
      el.appendChild(tip);
    });
    el.addEventListener('mouseleave', hide);
  });
  return models;
}

