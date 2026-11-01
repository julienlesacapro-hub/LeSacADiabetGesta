// Utilitaires de dates « calendaires » (sans fuseau horaire) au format ISO.
// © 2026 LESACA Julien. Tous droits réservés.
// Les jours sont manipulés en 'AAAA-MM-JJ' et les horodatages en 'AAAA-MM-JJTHH:MM' (heure locale).

const DAY = 86400000;

function pad(n) {
  return String(n).padStart(2, '0');
}

export function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(now = new Date()) {
  return toISODate(now);
}

export function nowLocalTs(now = new Date()) {
  return `${toISODate(now)}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function isISODate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isLocalTs(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) && isISODate(s.slice(0, 10));
}

/** Millisecondes UTC du jour (minuit UTC) — insensible aux changements d'heure. */
export function dayMs(iso) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function diffDays(a, b) {
  return Math.round((dayMs(a) - dayMs(b)) / DAY);
}

export function addDays(iso, n) {
  const d = new Date(dayMs(iso) + n * DAY);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function tsDate(ts) {
  return ts.slice(0, 10);
}

export function tsTime(ts) {
  return ts.slice(11, 16);
}

/** Minutes depuis minuit pour un horodatage local. */
export function tsMinutes(ts) {
  const [h, m] = tsTime(ts).split(':').map(Number);
  return h * 60 + m;
}

function utcDate(iso) {
  return new Date(dayMs(iso));
}

const fmtCache = new Map();
function fmt(options) {
  const key = JSON.stringify(options);
  if (!fmtCache.has(key)) fmtCache.set(key, new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', ...options }));
  return fmtCache.get(key);
}

/** 31/10/2026 */
export function formatDateShort(iso) {
  if (!iso) return '';
  return fmt({ day: '2-digit', month: '2-digit', year: 'numeric' }).format(utcDate(iso));
}

/** samedi 31 octobre 2026 */
export function formatDateLong(iso, { weekday = true, year = true } = {}) {
  if (!iso) return '';
  const opts = { day: 'numeric', month: 'long' };
  if (weekday) opts.weekday = 'long';
  if (year) opts.year = 'numeric';
  return fmt(opts).format(utcDate(iso));
}

/** sam. 31/10 */
export function formatDayCompact(iso) {
  const wd = fmt({ weekday: 'short' }).format(utcDate(iso));
  const dm = fmt({ day: '2-digit', month: '2-digit' }).format(utcDate(iso));
  return `${wd} ${dm}`;
}

export function formatTime(ts) {
  return tsTime(ts).replace(':', 'h');
}

export function ageFromBirthDate(birthDate, today = todayISO()) {
  if (!isISODate(birthDate)) return null;
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age;
}

/** Liste des jours de `from` à `to` inclus. */
export function daysBetween(from, to) {
  const out = [];
  for (let d = from; diffDays(to, d) >= 0; d = addDays(d, 1)) out.push(d);
  return out;
}
