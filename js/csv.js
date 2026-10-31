// Export CSV compatible Excel (France) : séparateur « ; », virgule décimale, UTF-8 avec BOM.
import { MOMENTS, MAIN_MOMENTS, TAGS, momentById } from './guidelines.js';
import { evaluateReading, resolveTargets, sortReadings, dailyTable, STATUS_LABELS } from './analysis.js';
import { UNITS, UNIT_INFO, formatNumber, fromMgdl, roundTo } from './units.js';
import { formatDateShort, tsTime, tsDate } from './dates.js';
import { gestationalAgeAt, formatGA } from './pregnancy.js';

const SEP = ';';
const EOL = '\r\n';

export function csvCell(value) {
  if (value == null) return '';
  const s = String(value);
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Neutralise les textes libres qu'un tableur pourrait interpréter comme une formule. */
export function safeText(s) {
  const t = String(s ?? '');
  return /^[=+\-@\t\r]/.test(t) ? `'${t}` : t;
}

function row(cells) {
  return cells.map(csvCell).join(SEP);
}

function num(mgdl, unit) {
  return formatNumber(roundTo(fromMgdl(mgdl, unit), unit), UNIT_INFO[unit].decimals);
}

function tagLabels(tags) {
  return (tags || []).map((t) => TAGS.find((x) => x.id === t)?.label || t).join(', ');
}

/** CSV détaillé : une ligne par mesure, valeurs dans les trois unités. */
export function readingsCsv(readings, profile) {
  const targets = resolveTargets(profile);
  const unit = profile.unit || 'g/L';
  const header = [
    'Date', 'Heure', 'Âge gestationnel', 'Moment',
    'Valeur saisie', 'Unité saisie',
    ...UNITS.map((u) => `Glycémie (${u})`),
    `Objectif (${unit})`, 'Statut', 'Insuline (UI)', 'Contexte', 'Note',
  ];
  const lines = [row(header)];
  for (const r of sortReadings(readings)) {
    const ev = evaluateReading(r, targets);
    const ga = gestationalAgeAt(profile, tsDate(r.ts));
    lines.push(row([
      formatDateShort(tsDate(r.ts)),
      tsTime(r.ts),
      formatGA(ga),
      momentById(r.moment).label,
      formatNumber(r.value, UNIT_INFO[r.unit].decimals),
      r.unit,
      ...UNITS.map((u) => num(r.mgdl, u)),
      ev.target ? `< ${formatNumber(ev.target[unit], UNIT_INFO[unit].decimals)}` : '',
      STATUS_LABELS[ev.status],
      r.insulin != null ? formatNumber(r.insulin, r.insulin % 1 ? 1 : 0) : '',
      tagLabels(r.tags),
      safeText(r.note),
    ]));
  }
  return lines.join(EOL) + EOL;
}

/** CSV « carnet » : une ligne par jour, une colonne par moment (valeurs dans l'unité choisie). */
export function dailyCsv(readings, profile) {
  const targets = resolveTargets(profile);
  const unit = profile.unit || 'g/L';
  const header = [
    'Date', 'Âge gestationnel',
    ...MAIN_MOMENTS.map((m) => `${m.label} (${unit})`),
    `Autres mesures (${unit})`, 'Dépassements', 'Notes',
  ];
  const lines = [row(header)];
  for (const [day, cells] of dailyTable(readings)) {
    let exceed = 0;
    const fmtCell = (list) => list.map((r) => {
      const ev = evaluateReading(r, targets);
      if (ev.status === 'high') exceed += 1;
      const mark = ev.status === 'high' ? ' (+)' : ev.status === 'low' || ev.status === 'verylow' ? ' (bas)' : '';
      return `${num(r.mgdl, unit)}${mark}`;
    }).join(' / ');
    const others = cells.other.map((r) => `${tsTime(r.ts)} ${num(r.mgdl, unit)}`).join(' / ');
    const notes = MOMENTS.flatMap((m) => cells[m.id]).filter((r) => r.note).map((r) => `${tsTime(r.ts)} ${r.note}`).join(' | ');
    lines.push(row([
      formatDateShort(day),
      formatGA(gestationalAgeAt(profile, day)),
      ...MAIN_MOMENTS.map((m) => fmtCell(cells[m.id])),
      others,
      exceed,
      notes,
    ]));
  }
  return lines.join(EOL) + EOL;
}

export function csvBlob(text) {
  return new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' });
}
