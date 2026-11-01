// Calculs liés à la grossesse : âge gestationnel, terme, IMC, prise de poids.
// © 2026 LESACA Julien. Tous droits réservés.
import { addDays, diffDays, isISODate, todayISO, ageFromBirthDate } from './dates.js';
import { WEIGHT_GAIN, OGTT_WINDOW } from './guidelines.js';

/**
 * Durée entre le 1er jour des dernières règles (DDR) et le terme.
 * - 'fr41' : convention française, terme à 41 SA (287 jours).
 * - 'int40' : convention internationale (règle de Naegele), 40 SA (280 jours).
 */
export const TERM_DAYS = { fr41: 287, int40: 280 };

/** Renvoie la DDR « théorique » à partir de la méthode de datation choisie. */
export function lmpFromProfile(profile) {
  const { datingMethod, datingDate } = profile || {};
  if (!isISODate(datingDate)) return null;
  const termDays = TERM_DAYS[profile.termConvention] || TERM_DAYS.fr41;
  switch (datingMethod) {
    case 'ddr': return datingDate;
    case 'ddg': return addDays(datingDate, -14);
    case 'terme': return addDays(datingDate, -termDays);
    default: return null;
  }
}

export function pregnancyInfo(profile, today = todayISO()) {
  const lmp = lmpFromProfile(profile);
  if (!lmp) return null;
  const convention = TERM_DAYS[profile.termConvention] ? profile.termConvention : 'fr41';
  const days = diffDays(today, lmp);
  const term = addDays(lmp, TERM_DAYS[convention]);
  const conception = addDays(lmp, 14);
  const delivered = isISODate(profile.deliveryDate);
  return {
    lmp,
    conception,
    term,
    days,
    weeks: Math.floor(days / 7),
    extraDays: ((days % 7) + 7) % 7,
    valid: days >= 0 && days <= 45 * 7,
    delivered,
    postpartumDays: delivered ? diffDays(today, profile.deliveryDate) : null,
    ogttFrom: addDays(lmp, OGTT_WINDOW.from * 7),
    ogttTo: addDays(lmp, OGTT_WINDOW.to * 7 + 6),
    trimester: days < 14 * 7 + 7 ? 1 : days < 28 * 7 + 7 ? 2 : 3,
  };
}

export function gestationalAgeAt(profile, isoDate) {
  const lmp = lmpFromProfile(profile);
  if (!lmp) return null;
  const days = diffDays(isoDate, lmp);
  if (days < 0 || days > 45 * 7) return null;
  return { weeks: Math.floor(days / 7), extraDays: days % 7 };
}

export function formatGA(ga) {
  if (!ga) return '';
  return ga.extraDays ? `${ga.weeks} SA + ${ga.extraDays} j` : `${ga.weeks} SA`;
}

export function bmi(heightCm, weightKg) {
  const h = Number(heightCm) / 100;
  const w = Number(weightKg);
  if (!(h > 1 && h < 2.5 && w > 30 && w < 300)) return null;
  return w / (h * h);
}

export function bmiCategory(value) {
  if (value == null) return null;
  return WEIGHT_GAIN.find((c) => value >= c.min && value < c.max) || null;
}

/**
 * Fourchette de prise de poids attendue à une date donnée (IOM 2009).
 * Hypothèse IOM : 0,5 à 2 kg au 1er trimestre, puis le rythme hebdomadaire de la catégorie.
 */
export function expectedGainAt(category, weeks) {
  if (!category || weeks == null) return null;
  if (weeks <= 13) {
    const f = Math.max(0, weeks) / 13;
    return [0.5 * f, 2 * f];
  }
  const after = weeks - 13;
  return [0.5 + category.rate[0] * after, 2 + category.rate[1] * after];
}

export function maternalAge(profile, today = todayISO()) {
  if (isISODate(profile?.birthDate)) return ageFromBirthDate(profile.birthDate, today);
  const a = Number(profile?.age);
  return a > 10 && a < 70 ? a : null;
}

/** Facteurs de risque présents (critères CNGOF-SFD 2010), dont l'âge et l'IMC calculés. */
export function activeRiskFactors(profile, today = todayISO()) {
  const out = [];
  const age = maternalAge(profile, today);
  if (age != null && age >= 35) out.push('age35');
  const b = bmi(profile?.heightCm, profile?.prePregnancyWeightKg);
  if (b != null && b >= 25) out.push('bmi25');
  const rf = profile?.riskFactors || {};
  for (const id of ['familyDiabetes', 'previousGDM', 'macrosomia']) if (rf[id]) out.push(id);
  return out;
}
