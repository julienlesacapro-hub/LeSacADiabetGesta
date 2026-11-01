// Stockage local (sur le téléphone uniquement). Aucune donnée n'est envoyée sur Internet.
// © 2026 LESACA Julien. Tous droits réservés.
import { isUnit, toMgdl } from './units.js';
import { isISODate, isLocalTs } from './dates.js';
import { MOMENTS } from './guidelines.js';

const KEY = 'lesacadiabetgesta:v1';
export const SCHEMA_VERSION = 1;

export function defaultProfile() {
  return {
    firstName: '',
    birthDate: '',
    heightCm: null,
    prePregnancyWeightKg: null,
    currentWeightKg: null,
    datingMethod: 'ddg',
    datingDate: '',
    termConvention: 'fr41',
    riskFactors: { familyDiabetes: false, previousGDM: false, macrosomia: false, stillbirth: false },
    status: 'unknown',
    diagnosisDate: '',
    treatment: 'diet',
    deliveryDate: '',
    unit: 'g/L',
    postprandialDelay: 120,
    customTargets: { fasting: null, post: null },
    careTeam: '',
  };
}

export function emptyState() {
  return {
    version: SCHEMA_VERSION,
    onboarded: false,
    disclaimerAcceptedAt: null,
    profile: defaultProfile(),
    readings: [],
    tests: [],
  };
}

export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const MOMENT_IDS = new Set(MOMENTS.map((m) => m.id));

/** Valide et normalise une mesure ; renvoie null si invalide. */
export function normalizeReading(r) {
  if (!r || typeof r !== 'object') return null;
  const value = Number(r.value);
  if (!(value > 0) || !isUnit(r.unit) || !isLocalTs(r.ts)) return null;
  const insulin = r.insulin === '' || r.insulin == null ? null : Number(r.insulin);
  return {
    id: typeof r.id === 'string' && r.id ? r.id : uid(),
    ts: r.ts,
    moment: MOMENT_IDS.has(r.moment) ? r.moment : 'other',
    value,
    unit: r.unit,
    mgdl: toMgdl(value, r.unit),
    insulin: Number.isFinite(insulin) && insulin >= 0 ? insulin : null,
    note: typeof r.note === 'string' ? r.note.slice(0, 500) : '',
    tags: Array.isArray(r.tags) ? r.tags.filter((t) => typeof t === 'string').slice(0, 10) : [],
    createdAt: r.createdAt || new Date().toISOString(),
  };
}

export function normalizeTest(t) {
  if (!t || typeof t !== 'object' || !['gaj', 'hgpo'].includes(t.type) || !isUnit(t.unit)) return null;
  const values = {};
  for (const k of ['t0', 't60', 't120']) {
    const n = Number(t.values?.[k]);
    if (n > 0) values[k] = n;
  }
  if (!values.t0 && !values.t60 && !values.t120) return null;
  return { id: t.id || uid(), type: t.type, date: isISODate(t.date) ? t.date : '', unit: t.unit, values };
}

export function normalizeState(raw) {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') return base;
  const profile = { ...base.profile, ...(raw.profile || {}) };
  profile.riskFactors = { ...base.profile.riskFactors, ...(raw.profile?.riskFactors || {}) };
  profile.customTargets = { ...base.profile.customTargets, ...(raw.profile?.customTargets || {}) };
  if (!isUnit(profile.unit)) profile.unit = 'g/L';
  if (![60, 120].includes(profile.postprandialDelay)) profile.postprandialDelay = 120;
  return {
    version: SCHEMA_VERSION,
    onboarded: !!raw.onboarded,
    disclaimerAcceptedAt: raw.disclaimerAcceptedAt || null,
    profile,
    readings: (Array.isArray(raw.readings) ? raw.readings : []).map(normalizeReading).filter(Boolean),
    tests: (Array.isArray(raw.tests) ? raw.tests : []).map(normalizeTest).filter(Boolean),
  };
}

function storage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

let state = null;
const listeners = new Set();

export function load() {
  const ls = storage();
  let raw = null;
  try {
    raw = ls ? JSON.parse(ls.getItem(KEY) || 'null') : null;
  } catch {
    raw = null;
  }
  state = normalizeState(raw);
  return state;
}

export function getState() {
  return state || load();
}

function persist() {
  const ls = storage();
  if (!ls) return false;
  try {
    ls.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) fn(state);
}

/** Applique une modification, enregistre et notifie. */
export function update(mutator) {
  const s = getState();
  mutator(s);
  const ok = persist();
  emit();
  return ok;
}

export function saveReading(input) {
  const r = normalizeReading(input);
  if (!r) throw new Error('Mesure invalide');
  update((s) => {
    const i = s.readings.findIndex((x) => x.id === r.id);
    if (i >= 0) s.readings[i] = { ...r, createdAt: s.readings[i].createdAt };
    else s.readings.push(r);
    s.readings.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
  });
  return r;
}

export function deleteReading(id) {
  let removed = null;
  update((s) => {
    const i = s.readings.findIndex((x) => x.id === id);
    if (i >= 0) [removed] = s.readings.splice(i, 1);
  });
  return removed;
}

export function saveTest(input) {
  const t = normalizeTest(input);
  if (!t) throw new Error('Résultat invalide');
  update((s) => {
    const i = s.tests.findIndex((x) => x.id === t.id);
    if (i >= 0) s.tests[i] = t;
    else s.tests.push(t);
  });
  return t;
}

export function deleteTest(id) {
  update((s) => {
    s.tests = s.tests.filter((t) => t.id !== id);
  });
}

export function setProfile(patch) {
  update((s) => {
    s.profile = { ...s.profile, ...patch };
  });
}

export function exportBackup() {
  return JSON.stringify({ app: 'LeSacADiabetGesta', exportedAt: new Date().toISOString(), ...getState() }, null, 2);
}

export function importBackup(text) {
  const raw = JSON.parse(text);
  if (!raw || raw.app !== 'LeSacADiabetGesta') throw new Error('Ce fichier ne provient pas de LeSacADiabetGesta.');
  const next = normalizeState(raw);
  state = next;
  persist();
  emit();
  return next;
}

export function resetAll() {
  state = emptyState();
  const ls = storage();
  try {
    ls?.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit();
}

/** Demande au navigateur de ne pas effacer les données automatiquement. */
export async function requestPersistence() {
  try {
    if (navigator.storage?.persisted && !(await navigator.storage.persisted())) {
      return await navigator.storage.persist();
    }
    return true;
  } catch {
    return false;
  }
}
