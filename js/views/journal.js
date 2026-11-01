// Carnet : tableau jour × moment, courbes avec objectifs et liste détaillée.
// © 2026 LESACA Julien. Tous droits réservés.
import { getState } from '../store.js';
import { MAIN_MOMENTS, momentById, TAGS, HYPO } from '../guidelines.js';
import { computeStats, dailyTable, evaluateReading, readingsBetween, resolveTargets, sortReadings, STATUS_LABELS } from '../analysis.js';
import { mountCharts } from '../chart.js';
import { gestationalAgeAt, formatGA } from '../pregnancy.js';
import { formatMgdl, formatNumber, formatValue } from '../units.js';
import { addDays, daysBetween, formatDateLong, formatDayCompact, formatTime, todayISO, tsDate } from '../dates.js';
import { esc, icon, statusMark } from '../ui.js';
import { openEntry } from './entry.js';

const PERIODS = [
  { id: '7', label: '7 j', days: 7 },
  { id: '14', label: '14 j', days: 14 },
  { id: '30', label: '30 j', days: 30 },
  { id: 'all', label: 'Tout', days: null },
];
const MODES = [
  { id: 'table', label: 'Tableau', icon: 'table' },
  { id: 'charts', label: 'Courbes', icon: 'chart' },
  { id: 'list', label: 'Liste', icon: 'list' },
];

const prefs = { period: '14', mode: 'table' };
try {
  Object.assign(prefs, JSON.parse(localStorage.getItem('lsadg:journal') || '{}'));
} catch {
  /* préférences d'affichage facultatives */
}
function savePrefs() {
  try {
    localStorage.setItem('lsadg:journal', JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function periodRange(readings, periodId, today = todayISO()) {
  const p = PERIODS.find((x) => x.id === periodId) || PERIODS[1];
  if (p.days) return { from: addDays(today, -(p.days - 1)), to: today };
  const first = readings.length ? tsDate(sortReadings(readings)[0].ts) : today;
  return { from: first < today ? first : addDays(today, -6), to: today };
}

export function renderJournal(view) {
  const st = getState();
  const { profile } = st;
  const unit = profile.unit;
  const targets = resolveTargets(profile);
  const today = todayISO();
  const { from, to } = periodRange(st.readings, prefs.period, today);
  const readings = readingsBetween(st.readings, from, to);
  const stats = computeStats(readings, profile);
  const o = stats.overall;

  view.innerHTML = `
    <header class="page-head page-head-row">
      <div><div class="eyebrow">Suivi glycémique</div><h1>Carnet</h1></div>
      <a class="btn btn-secondary btn-sm" href="#/export">${icon('share', { size: 18 })}Partager</a>
    </header>
    <div class="toolbar">
      <div class="seg" role="group" aria-label="Période">${PERIODS.map((p) => `<button type="button" data-period="${p.id}" aria-pressed="${p.id === prefs.period}">${p.label}</button>`).join('')}</div>
      <div class="seg" role="group" aria-label="Affichage">${MODES.map((m) => `<button type="button" data-mode="${m.id}" aria-pressed="${m.id === prefs.mode}">${icon(m.icon, { size: 17 })}${m.label}</button>`).join('')}</div>
    </div>
    <div class="summary-strip">
      <div class="tile"><div class="t-val">${o.n}</div><div class="t-lbl">mesures</div></div>
      <div class="tile"><div class="t-val">${o.pctOk == null ? '–' : `${formatNumber(o.pctOk * 100)} %`}</div><div class="t-lbl">dans l’objectif</div></div>
      <div class="tile"><div class="t-val" style="color:var(--high)">${o.high}</div><div class="t-lbl">dépassements</div></div>
    </div>
    <div data-content></div>
    <div class="legend">
      <span>${statusMark('ok')}Dans l’objectif</span>
      <span>${statusMark('high')}Au-dessus de l’objectif</span>
      <span>${statusMark('low')}Glycémie basse (&lt; ${formatValue(HYPO.level1[unit], unit)})</span>
    </div>
    <p class="tiny muted" style="margin-top:8px">Objectifs : à jeun &lt; ${formatMgdl(targets.fasting['mg/dL'], unit)} · ${targets.delay === 60 ? '1 h' : '2 h'} après le début du repas &lt; ${formatMgdl(targets.post['mg/dL'], unit)}. Valeurs affichées en ${esc(unit)} (modifiable dans le profil).</p>
  `;

  const content = view.querySelector('[data-content]');
  if (!st.readings.length) {
    content.innerHTML = `<div class="card empty">${icon('drop', { size: 40 })}<p><strong>Votre carnet est vide.</strong></p><p class="small">Touchez le bouton + pour noter votre première glycémie, dans l’unité de votre lecteur ou du laboratoire.</p></div>`;
  } else if (prefs.mode === 'charts') {
    content.innerHTML = '<div class="charts"></div>';
    mountCharts(content.firstElementChild, readings, { from, to, unit, targets });
  } else if (prefs.mode === 'list') {
    content.innerHTML = renderList(readings, profile, targets);
  } else {
    content.innerHTML = renderTable(readings, profile, targets, from, to);
  }

  view.querySelectorAll('[data-period]').forEach((b) => b.addEventListener('click', () => { prefs.period = b.dataset.period; savePrefs(); renderJournal(view); }));
  view.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { prefs.mode = b.dataset.mode; savePrefs(); renderJournal(view); }));
  content.addEventListener('click', (e) => {
    const edit = e.target.closest('[data-edit]');
    if (edit) {
      const r = getState().readings.find((x) => x.id === edit.dataset.edit);
      if (r) openEntry({ reading: r });
      return;
    }
    const add = e.target.closest('[data-add]');
    if (add) openEntry({ moment: add.dataset.add, date: add.dataset.date });
  });
}

function renderTable(readings, profile, targets, from, to) {
  const unit = profile.unit;
  const table = dailyTable(readings);
  const days = daysBetween(from, to).reverse();
  const today = todayISO();
  const rows = days.map((day) => {
    const cells = table.get(day);
    const ga = gestationalAgeAt(profile, day);
    const tds = MAIN_MOMENTS.map((m) => {
      const list = cells?.[m.id] || [];
      if (!list.length) {
        return `<td><button type="button" class="cell cell-empty" data-add="${m.id}" data-date="${day}" aria-label="${esc(`Ajouter : ${m.label}, ${formatDateLong(day)}`)}">·</button></td>`;
      }
      const evs = list.map((r) => evaluateReading(r, targets).status);
      const worst = evs.includes('verylow') ? 'verylow' : evs.includes('low') ? 'low' : evs.includes('high') ? 'high' : 'ok';
      const r = list[list.length - 1];
      return `<td class="is-${worst}"><button type="button" class="cell" data-edit="${r.id}" aria-label="${esc(`${m.label} : ${list.map((x) => formatMgdl(x.mgdl, unit)).join(', ')}`)}">
        <span class="cell-v">${statusMark(evaluateReading(r, targets).status, 9)}${formatMgdl(r.mgdl, unit, { withUnit: false })}</span>
        <span class="cell-t">${formatTime(r.ts)}${list.length > 1 ? ` · +${list.length - 1}` : ''}</span>
      </button></td>`;
    }).join('');
    const others = cells?.other || [];
    return `<tr class="${day === today ? 'today-row' : ''}">
      <td class="daycol"><div class="day">${esc(formatDayCompact(day))}</div><div class="ga">${esc(formatGA(ga))}</div>
        ${others.length ? `<button type="button" class="others" data-edit="${others[0].id}">+${others.length} autre${others.length > 1 ? 's' : ''}</button>` : ''}</td>
      ${tds}
    </tr>`;
  }).join('');
  return `<div class="table-wrap"><table class="carnet">
    <thead><tr><th class="daycol" scope="col">Jour</th>${MAIN_MOMENTS.map((m) => `<th scope="col">${esc(m.short)}<small>${m.kind === 'fasting' ? `&lt; ${formatMgdl(targets.fasting['mg/dL'], unit, { withUnit: false })}` : `&lt; ${formatMgdl(targets.post['mg/dL'], unit, { withUnit: false })}`}</small></th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
  <p class="tiny muted" style="margin-top:8px">Touchez une case vide pour ajouter une mesure à ce jour, ou une valeur pour la modifier.</p>`;
}

function renderList(readings, profile, targets) {
  const unit = profile.unit;
  const byDay = new Map();
  for (const r of sortReadings(readings).reverse()) {
    const d = tsDate(r.ts);
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d).push(r);
  }
  if (!byDay.size) return '<div class="card empty"><p>Aucune mesure sur cette période.</p></div>';
  return [...byDay].map(([day, list]) => `<section class="day-group"><h3>${esc(formatDateLong(day))} · ${esc(formatGA(gestationalAgeAt(profile, day)))}</h3>
    ${list.map((r) => {
      const ev = evaluateReading(r, targets);
      const sub = [
        STATUS_LABELS[ev.status],
        r.unit !== unit ? `saisi : ${formatValue(r.value, r.unit)}` : '',
        r.insulin != null ? `${formatNumber(r.insulin, r.insulin % 1 ? 1 : 0)} UI` : '',
        ...(r.tags || []).map((t) => TAGS.find((x) => x.id === t)?.label || ''),
        r.note,
      ].filter(Boolean).join(' · ');
      return `<button type="button" class="reading is-${ev.status}" data-edit="${r.id}">
        <span class="r-time">${formatTime(r.ts)}</span>
        <span class="r-main"><span class="r-moment">${esc(momentById(r.moment).label)}</span><span class="r-sub">${esc(sub)}</span></span>
        <span class="r-val">${statusMark(ev.status, 11)}${formatMgdl(r.mgdl, unit)}</span>
      </button>`;
    }).join('')}
  </section>`).join('');
}
