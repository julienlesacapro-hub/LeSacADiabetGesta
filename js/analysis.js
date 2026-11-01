// Évaluation des glycémies, statistiques et repérage des tendances.
// © 2026 LESACA Julien. Tous droits réservés.
import { TARGETS, HYPO, VERY_HIGH, MOMENTS, MAIN_MOMENTS, momentById, REPEAT_RULE } from './guidelines.js';
import { compareToThreshold, isUnit, makeThreshold, toMgdl } from './units.js';
import { addDays, diffDays, tsDate, todayISO } from './dates.js';

/** Objectifs applicables, selon le profil (objectifs par défaut ou fixés par l'équipe soignante). */
export function resolveTargets(profile = {}) {
  const delay = profile.postprandialDelay === 60 ? 60 : 120;
  const custom = profile.customTargets || {};
  const fromCustom = (c) => (c && c.value > 0 && isUnit(c.unit) ? makeThreshold(c.value, c.unit) : null);
  const fasting = fromCustom(custom.fasting);
  const post = fromCustom(custom.post);
  return {
    delay,
    fasting: fasting || TARGETS.fasting,
    post: post || (delay === 60 ? TARGETS.post60 : TARGETS.post120),
    custom: { fasting: !!fasting, post: !!post },
  };
}

export function targetForMoment(momentId, targets) {
  const m = momentById(momentId);
  if (m.kind === 'fasting') return targets.fasting;
  if (m.kind === 'post') return targets.post;
  return null;
}

/**
 * Statut d'une mesure :
 * - 'verylow' / 'low' : hypoglycémie (niveau 2 / niveau 1, ADA 2025) — prioritaire ;
 * - 'high' : au-dessus de l'objectif du moment (l'objectif est « strictement inférieur à ») ;
 * - 'ok' : dans l'objectif ;
 * - 'none' : pas d'objectif pour ce moment (« autre moment »).
 * `veryHigh` signale en plus une valeur ≥ 2,00 g/L (repère de l'application).
 */
export function evaluateReading(reading, targets) {
  const { value, unit } = reading;
  const veryHigh = compareToThreshold(value, unit, VERY_HIGH) >= 0;
  if (compareToThreshold(value, unit, HYPO.level2) < 0) return { status: 'verylow', target: null, veryHigh };
  if (compareToThreshold(value, unit, HYPO.level1) < 0) return { status: 'low', target: null, veryHigh };
  const target = targetForMoment(reading.moment, targets);
  if (!target) return { status: 'none', target: null, veryHigh };
  return { status: compareToThreshold(value, unit, target) < 0 ? 'ok' : 'high', target, veryHigh };
}

export const STATUS_LABELS = {
  ok: 'Dans l’objectif',
  high: 'Au-dessus de l’objectif',
  low: 'Glycémie basse',
  verylow: 'Hypoglycémie importante',
  none: 'Sans objectif défini',
};

export function readingMgdl(r) {
  return typeof r.mgdl === 'number' ? r.mgdl : toMgdl(r.value, r.unit);
}

export function sortReadings(readings) {
  return [...readings].sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
}

/** Mesures comprises entre deux jours inclus. */
export function readingsBetween(readings, from, to) {
  return readings.filter((r) => {
    const d = tsDate(r.ts);
    return (!from || d >= from) && (!to || d <= to);
  });
}

/** Mesures des `days` derniers jours (aujourd'hui inclus). */
export function lastDays(readings, days, today = todayISO()) {
  return readingsBetween(readings, addDays(today, -(days - 1)), today);
}

function emptyBucket() {
  return { n: 0, ok: 0, high: 0, low: 0, sum: 0, min: Infinity, max: -Infinity, evaluated: 0 };
}

/** Statistiques globales et par moment. Moyennes en mg/dL (unité de stockage canonique). */
export function computeStats(readings, profile) {
  const targets = resolveTargets(profile);
  const overall = emptyBucket();
  const perMoment = Object.fromEntries(MOMENTS.map((m) => [m.id, emptyBucket()]));
  const days = new Set();
  for (const r of readings) {
    const ev = evaluateReading(r, targets);
    const mg = readingMgdl(r);
    days.add(tsDate(r.ts));
    for (const b of [overall, perMoment[r.moment] || perMoment.other]) {
      b.n += 1;
      b.sum += mg;
      b.min = Math.min(b.min, mg);
      b.max = Math.max(b.max, mg);
      if (ev.status === 'ok') b.ok += 1;
      if (ev.status === 'high') b.high += 1;
      if (ev.status === 'low' || ev.status === 'verylow') b.low += 1;
      if (ev.status !== 'none') b.evaluated += 1;
    }
  }
  const finalize = (b) => ({
    ...b,
    mean: b.n ? b.sum / b.n : null,
    min: b.n ? b.min : null,
    max: b.n ? b.max : null,
    pctOk: b.evaluated ? b.ok / b.evaluated : null,
  });
  return {
    targets,
    overall: finalize(overall),
    perMoment: Object.fromEntries(Object.entries(perMoment).map(([k, v]) => [k, finalize(v)])),
    dayCount: days.size,
  };
}

/** Tableau « carnet » : une ligne par jour, une colonne par moment. */
export function dailyTable(readings) {
  const map = new Map();
  for (const r of sortReadings(readings)) {
    const d = tsDate(r.ts);
    if (!map.has(d)) map.set(d, Object.fromEntries(MOMENTS.map((m) => [m.id, []])));
    (map.get(d)[r.moment] || map.get(d).other).push(r);
  }
  return map;
}

/**
 * Analyse des 7 derniers jours pour les conseils.
 * Les seuils de « dépassements répétés » sont des repères de l'application (REPEAT_RULE).
 */
export function analyzeRecent(readings, profile, today = todayISO()) {
  const recent = lastDays(readings, REPEAT_RULE.windowDays, today);
  const targets = resolveTargets(profile);
  const byMoment = Object.fromEntries(MAIN_MOMENTS.map((m) => [m.id, { n: 0, high: 0 }]));
  let ok = 0;
  let high = 0;
  let low = 0;
  let verylow = 0;
  let veryHigh = 0;
  let evaluated = 0;
  const days = new Set();
  for (const r of recent) {
    const ev = evaluateReading(r, targets);
    days.add(tsDate(r.ts));
    if (ev.status !== 'none') evaluated += 1;
    if (ev.status === 'ok') ok += 1;
    if (ev.status === 'high') high += 1;
    if (ev.status === 'low') low += 1;
    if (ev.status === 'verylow') verylow += 1;
    if (ev.veryHigh) veryHigh += 1;
    if (byMoment[r.moment]) {
      byMoment[r.moment].n += 1;
      if (ev.status === 'high') byMoment[r.moment].high += 1;
    }
  }
  const repeatedMoments = Object.entries(byMoment)
    .filter(([, v]) => v.high >= REPEAT_RULE.perMoment)
    .map(([k]) => k);
  const ratio = evaluated ? high / evaluated : 0;
  // Nombre moyen de mesures par jour sur les 3 derniers jours complets (hier, avant-hier, J-3).
  const last3 = readingsBetween(readings, addDays(today, -3), addDays(today, -1));
  const firstReading = readings.length ? sortReadings(readings)[0].ts.slice(0, 10) : null;
  const trackingDays = firstReading ? diffDays(today, firstReading) + 1 : 0;
  return {
    count: recent.length,
    evaluated,
    ok,
    high,
    low,
    verylow,
    veryHigh,
    ratio,
    byMoment,
    repeatedMoments,
    repeated: repeatedMoments.length > 0 || (evaluated >= REPEAT_RULE.minReadings && ratio >= REPEAT_RULE.globalRatio),
    daysWithData: days.size,
    perDayLast3: trackingDays > 3 ? last3.length / 3 : null,
    trackingDays,
    pctOk: evaluated ? ok / evaluated : null,
  };
}

/** Propose le moment de mesure le plus probable selon l'heure et les mesures déjà saisies. */
export function suggestMoment(readings, now = new Date()) {
  const today = todayISO(now);
  const done = new Set(readings.filter((r) => tsDate(r.ts) === today).map((r) => r.moment));
  const minutes = now.getHours() * 60 + now.getMinutes();
  const windows = [
    ['fasting', 4 * 60, 11 * 60],
    ['post_breakfast', 8 * 60, 12 * 60 + 30],
    ['post_lunch', 12 * 60 + 30, 18 * 60],
    ['post_dinner', 18 * 60, 24 * 60],
    ['post_dinner', 0, 4 * 60],
  ];
  for (const [id, from, to] of windows) {
    if (minutes >= from && minutes < to && !done.has(id)) return id;
  }
  for (const [id, from, to] of windows) {
    if (minutes >= from && minutes < to) return id;
  }
  return 'other';
}
