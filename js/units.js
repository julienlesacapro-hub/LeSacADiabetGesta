// Unités de glycémie, conversions et saisie tolérante.
// Masse molaire du glucose : 180,156 g/mol → 1 mmol/L = 18,0156 mg/dL = 0,180156 g/L.

export const MGDL_PER_MMOL = 18.0156;

export const UNITS = ['g/L', 'mg/dL', 'mmol/L'];

export const UNIT_INFO = {
  'g/L': { decimals: 2, label: 'g/L', example: '0,95', typical: [0.3, 3.5], plausible: [0.2, 6] },
  'mg/dL': { decimals: 0, label: 'mg/dL', example: '95', typical: [30, 350], plausible: [20, 600] },
  'mmol/L': { decimals: 1, label: 'mmol/L', example: '5,3', typical: [1.7, 19.5], plausible: [1.1, 33.3] },
};

export function isUnit(u) {
  return UNITS.includes(u);
}

export function toMgdl(value, unit) {
  switch (unit) {
    case 'g/L': return value * 100;
    case 'mg/dL': return value;
    case 'mmol/L': return value * MGDL_PER_MMOL;
    default: throw new Error(`Unité inconnue : ${unit}`);
  }
}

export function fromMgdl(mgdl, unit) {
  switch (unit) {
    case 'g/L': return mgdl / 100;
    case 'mg/dL': return mgdl;
    case 'mmol/L': return mgdl / MGDL_PER_MMOL;
    default: throw new Error(`Unité inconnue : ${unit}`);
  }
}

export function convert(value, from, to) {
  if (from === to) return value;
  return fromMgdl(toMgdl(value, from), to);
}

/** Arrondi à la précision d'affichage usuelle de l'unité. */
export function roundTo(value, unit) {
  const d = UNIT_INFO[unit].decimals;
  const f = 10 ** d;
  return Math.round((value + Number.EPSILON) * f) / f;
}

const nfCache = new Map();
function nf(decimals) {
  if (!nfCache.has(decimals)) {
    nfCache.set(decimals, new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: false,
    }));
  }
  return nfCache.get(decimals);
}

/** Formate un nombre à la française (virgule décimale). */
export function formatNumber(value, decimals = 0) {
  if (value == null || Number.isNaN(value)) return '';
  return nf(decimals).format(value);
}

/** Formate une valeur exprimée dans `unit` (avec ou sans le libellé d'unité). */
export function formatValue(value, unit, { withUnit = true } = {}) {
  const s = formatNumber(roundTo(value, unit), UNIT_INFO[unit].decimals);
  return withUnit ? `${s} ${unit}` : s;
}

/** Formate une valeur en mg/dL (stockage canonique) dans l'unité demandée. */
export function formatMgdl(mgdl, unit, opts) {
  return formatValue(fromMgdl(mgdl, unit), unit, opts);
}

/** Lit un nombre saisi : accepte virgule ou point, espaces, signe +. */
export function parseNumber(input) {
  if (typeof input === 'number') return input;
  if (input == null) return NaN;
  const s = String(input).trim().replace(/\s| | /g, '').replace(',', '.');
  if (!/^\+?\d*\.?\d+$|^\+?\d+\.$/.test(s)) return NaN;
  return Number.parseFloat(s);
}

/**
 * Devine l'unité d'une valeur saisie.
 * - Si la valeur est vraisemblable dans l'unité préférée, on la garde.
 * - Sinon, on retient l'unique unité où elle est vraisemblable.
 * - Si plusieurs unités sont possibles, on signale l'ambiguïté.
 */
export function guessUnit(value, preferred = 'g/L') {
  if (!(value > 0)) return { unit: preferred, ambiguous: false, candidates: [], changed: false };
  const inRange = (u) => value >= UNIT_INFO[u].typical[0] && value <= UNIT_INFO[u].typical[1];
  if (inRange(preferred)) return { unit: preferred, ambiguous: false, candidates: [preferred], changed: false };
  const candidates = UNITS.filter(inRange);
  if (candidates.length === 1) return { unit: candidates[0], ambiguous: false, candidates, changed: true };
  if (candidates.length > 1) return { unit: candidates[0], ambiguous: true, candidates, changed: true };
  // Valeur hors des plages usuelles : on garde l'unité préférée, la vraisemblance est signalée à part.
  return { unit: preferred, ambiguous: false, candidates: [], changed: false };
}

export function isPlausible(value, unit) {
  const [lo, hi] = UNIT_INFO[unit].plausible;
  return value >= lo && value <= hi;
}

/** Crée un seuil exprimé dans les trois unités (valeurs arrondies à la précision usuelle). */
export function makeThreshold(value, unit) {
  const mgdl = toMgdl(value, unit);
  const t = {};
  for (const u of UNITS) t[u] = u === unit ? value : roundTo(fromMgdl(mgdl, u), u);
  return t;
}

/**
 * Compare une valeur à un seuil publié, dans l'unité de saisie.
 * On compare la valeur arrondie à la précision de l'unité au seuil publié dans
 * cette même unité : le résultat ne dépend donc pas des arrondis de conversion.
 */
export function compareToThreshold(value, unit, threshold) {
  const v = roundTo(value, unit);
  const t = threshold[unit];
  if (Math.abs(v - t) < 1e-9) return 0;
  return v < t ? -1 : 1;
}

/** Libellé « 0,95 g/L (95 mg/dL ; 5,3 mmol/L) » d'un seuil. */
export function describeThreshold(threshold, mainUnit) {
  const others = UNITS.filter((u) => u !== mainUnit)
    .map((u) => formatValue(threshold[u], u))
    .join(' ; ');
  return `${formatValue(threshold[mainUnit], mainUnit)} (${others})`;
}
