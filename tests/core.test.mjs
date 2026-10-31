import { test } from 'node:test';
import assert from 'node:assert/strict';

import { convert, formatValue, parseNumber, guessUnit, compareToThreshold, makeThreshold, toMgdl } from '../js/units.js';
import { addDays, diffDays, ageFromBirthDate } from '../js/dates.js';
import { DIAGNOSIS, TARGETS } from '../js/guidelines.js';
import { pregnancyInfo, bmi, bmiCategory, activeRiskFactors, expectedGainAt } from '../js/pregnancy.js';
import { evaluateReading, resolveTargets, computeStats, analyzeRecent, suggestMoment } from '../js/analysis.js';
import { buildAdvice } from '../js/advice.js';
import { readingsCsv, dailyCsv, csvCell, safeText } from '../js/csv.js';
import { normalizeReading, normalizeState, defaultProfile } from '../js/store.js';

const r = (ts, moment, value, unit = 'g/L', extra = {}) => normalizeReading({ ts, moment, value, unit, ...extra });

test('conversions g/L ↔ mg/dL ↔ mmol/L', () => {
  assert.equal(convert(1.2, 'g/L', 'mg/dL'), 120);
  assert.equal(formatValue(convert(5.1, 'mmol/L', 'g/L'), 'g/L'), '0,92 g/L');
  assert.equal(formatValue(convert(10, 'mmol/L', 'g/L'), 'g/L'), '1,80 g/L');
  assert.equal(formatValue(convert(8.5, 'mmol/L', 'g/L'), 'g/L'), '1,53 g/L');
  assert.equal(formatValue(convert(95, 'mg/dL', 'mmol/L'), 'mmol/L'), '5,3 mmol/L');
  assert.equal(formatValue(convert(120, 'mg/dL', 'mmol/L'), 'mmol/L'), '6,7 mmol/L');
});

test('les seuils publiés sont cohérents entre unités', () => {
  for (const th of [DIAGNOSIS.ogtt.t0, DIAGNOSIS.ogtt.t60, DIAGNOSIS.ogtt.t120, TARGETS.fasting, TARGETS.post120, TARGETS.post60]) {
    const fromGl = makeThreshold(th['g/L'], 'g/L');
    assert.equal(fromGl['mg/dL'], th['mg/dL']);
    assert.ok(Math.abs(fromGl['mmol/L'] - th['mmol/L']) <= 0.051, `${th['g/L']} → ${fromGl['mmol/L']}`);
  }
});

test('saisie tolérante (virgule, point, espaces)', () => {
  assert.equal(parseNumber('1,05'), 1.05);
  assert.equal(parseNumber(' 0.95 '), 0.95);
  assert.equal(parseNumber('105'), 105);
  assert.equal(parseNumber('5,'), 5);
  assert.ok(Number.isNaN(parseNumber('abc')));
  assert.ok(Number.isNaN(parseNumber('1,2,3')));
  assert.ok(Number.isNaN(parseNumber('')));
});

test('détection automatique de l’unité', () => {
  assert.deepEqual(guessUnit(1.05, 'g/L').unit, 'g/L');
  assert.equal(guessUnit(105, 'g/L').unit, 'mg/dL');
  assert.equal(guessUnit(6.2, 'g/L').unit, 'mmol/L');
  assert.equal(guessUnit(1.05, 'mg/dL').unit, 'g/L');
  assert.equal(guessUnit(2.5, 'g/L').unit, 'g/L');
  const amb = guessUnit(2.5, 'mg/dL');
  assert.equal(amb.ambiguous, true);
  assert.deepEqual(amb.candidates, ['g/L', 'mmol/L']);
});

test('comparaison aux seuils dans l’unité de saisie (pas d’effet d’arrondi)', () => {
  assert.equal(compareToThreshold(5.1, 'mmol/L', DIAGNOSIS.ogtt.t0), 0);
  assert.equal(compareToThreshold(0.92, 'g/L', DIAGNOSIS.ogtt.t0), 0);
  assert.equal(compareToThreshold(91, 'mg/dL', DIAGNOSIS.ogtt.t0), -1);
  assert.equal(compareToThreshold(0.951, 'g/L', TARGETS.fasting), 0); // arrondi à 0,95
});

test('dates et âge gestationnel (convention française 41 SA)', () => {
  assert.equal(addDays('2026-02-27', 2), '2026-03-01');
  assert.equal(diffDays('2026-03-29', '2026-03-28'), 1); // passage à l'heure d'été
  assert.equal(ageFromBirthDate('1990-11-01', '2026-10-31'), 35);
  const p = pregnancyInfo({ datingMethod: 'ddr', datingDate: '2026-05-01' }, '2026-10-31');
  assert.equal(p.weeks, 26);
  assert.equal(p.extraDays, 1);
  assert.equal(p.term, '2027-02-12'); // DDR + 287 j
  const viaTerm = pregnancyInfo({ datingMethod: 'terme', datingDate: '2027-02-12', termConvention: 'fr41' }, '2026-10-31');
  assert.equal(viaTerm.lmp, '2026-05-01');
  const viaDdg = pregnancyInfo({ datingMethod: 'ddg', datingDate: '2026-05-15' }, '2026-10-31');
  assert.equal(viaDdg.lmp, '2026-05-01');
  const intl = pregnancyInfo({ datingMethod: 'terme', datingDate: '2027-02-05', termConvention: 'int40' }, '2026-10-31');
  assert.equal(intl.lmp, '2026-05-01');
  assert.equal(p.ogttFrom, addDays('2026-05-01', 24 * 7));
});

test('IMC, catégories et facteurs de risque', () => {
  assert.equal(Math.round(bmi(165, 68) * 10) / 10, 25);
  assert.equal(bmiCategory(24.9).id, 'normal');
  assert.equal(bmiCategory(25).id, 'over');
  const rf = activeRiskFactors({ birthDate: '1990-01-01', heightCm: 165, prePregnancyWeightKg: 70, riskFactors: { familyDiabetes: true } }, '2026-10-31');
  assert.deepEqual(rf, ['age35', 'bmi25', 'familyDiabetes']);
  const exp = expectedGainAt(bmiCategory(22), 40);
  assert.ok(exp[0] > 9 && exp[1] < 16);
});

test('évaluation des glycémies selon les objectifs', () => {
  const t = resolveTargets({});
  assert.equal(evaluateReading(r('2026-10-31T07:30', 'fasting', 0.94), t).status, 'ok');
  assert.equal(evaluateReading(r('2026-10-31T07:30', 'fasting', 0.95), t).status, 'high');
  assert.equal(evaluateReading(r('2026-10-31T07:30', 'fasting', 5.3, 'mmol/L'), t).status, 'high');
  assert.equal(evaluateReading(r('2026-10-31T07:30', 'fasting', 5.2, 'mmol/L'), t).status, 'ok');
  assert.equal(evaluateReading(r('2026-10-31T10:00', 'post_breakfast', 119, 'mg/dL'), t).status, 'ok');
  assert.equal(evaluateReading(r('2026-10-31T10:00', 'post_breakfast', 1.25), t).status, 'high');
  assert.equal(evaluateReading(r('2026-10-31T10:00', 'post_breakfast', 0.65), t).status, 'low');
  assert.equal(evaluateReading(r('2026-10-31T10:00', 'post_breakfast', 0.5), t).status, 'verylow');
  assert.equal(evaluateReading(r('2026-10-31T23:00', 'other', 1.5), t).status, 'none');
  // Délai post-prandial à 1 h
  const t60 = resolveTargets({ postprandialDelay: 60 });
  assert.equal(evaluateReading(r('2026-10-31T10:00', 'post_breakfast', 1.35), t60).status, 'ok');
  // Objectifs personnalisés par l'équipe
  const custom = resolveTargets({ customTargets: { fasting: { value: 5.0, unit: 'mmol/L' }, post: null } });
  assert.equal(custom.fasting['g/L'], 0.9);
  assert.equal(evaluateReading(r('2026-10-31T07:30', 'fasting', 0.92), custom).status, 'high');
});

test('statistiques et analyse des 7 derniers jours', () => {
  const readings = [
    r('2026-10-25T07:30', 'fasting', 0.9),
    r('2026-10-26T07:30', 'fasting', 1.0),
    r('2026-10-27T07:30', 'fasting', 0.99),
    r('2026-10-27T10:00', 'post_breakfast', 1.1),
    r('2026-10-28T14:30', 'post_lunch', 1.3),
  ];
  const stats = computeStats(readings, {});
  assert.equal(stats.overall.n, 5);
  assert.equal(stats.overall.high, 3);
  assert.equal(stats.perMoment.fasting.high, 2);
  const a = analyzeRecent(readings, {}, '2026-10-31');
  assert.equal(a.repeated, true);
  assert.deepEqual(a.repeatedMoments, ['fasting']);
  assert.equal(a.ok, 2);
});

test('suggestion du moment selon l’heure', () => {
  const at = (h, m) => new Date(2026, 9, 31, h, m);
  assert.equal(suggestMoment([], at(7, 15)), 'fasting');
  assert.equal(suggestMoment([r('2026-10-31T07:10', 'fasting', 0.9)], at(9, 45)), 'post_breakfast');
  assert.equal(suggestMoment([], at(14, 20)), 'post_lunch');
  assert.equal(suggestMoment([], at(21, 40)), 'post_dinner');
});

test('conseils : dépistage selon les facteurs de risque et le terme', () => {
  const profile = { ...defaultProfile(), birthDate: '1988-01-01', heightCm: 165, prePregnancyWeightKg: 60, datingMethod: 'ddr', datingDate: '2026-07-01' };
  const advice = buildAdvice({ profile, readings: [], tests: [] }, '2026-10-31');
  assert.ok(advice.some((a) => a.id === 'screen-gaj'), 'GAJ recommandée au 1er trimestre / avant 24 SA');
  const noRisk = buildAdvice({ profile: { ...profile, birthDate: '1995-01-01' }, readings: [], tests: [] }, '2026-10-31');
  assert.ok(noRisk.some((a) => a.id === 'no-rf'));
  const inWindow = buildAdvice({ profile: { ...profile, datingDate: '2026-04-20' }, readings: [], tests: [{ type: 'gaj' }] }, '2026-10-31');
  assert.ok(inWindow.some((a) => a.id === 'screen-hgpo'));
});

test('conseils : diabète gestationnel avec dépassements répétés', () => {
  const profile = { ...defaultProfile(), status: 'gdm', heightCm: 165, prePregnancyWeightKg: 60, datingMethod: 'ddr', datingDate: '2026-04-20' };
  const readings = [
    r('2026-10-28T10:00', 'post_breakfast', 1.35),
    r('2026-10-29T10:00', 'post_breakfast', 1.4),
    r('2026-10-30T10:00', 'post_breakfast', 1.1),
    r('2026-10-30T07:30', 'fasting', 0.5),
  ];
  const advice = buildAdvice({ profile, readings, tests: [] }, '2026-10-31');
  const ids = advice.map((a) => a.id);
  assert.ok(ids.includes('repeated'));
  assert.ok(ids.includes('tip-post'));
  assert.ok(ids.includes('hypo'));
  assert.equal(advice[0].level, 'alert');
  // Chaque conseil indique sa base
  for (const a of advice) assert.ok(a.basis === 'reco' ? a.refs.length > 0 : a.basis === 'app', a.id);
});

test('conseils : post-partum', () => {
  const profile = { ...defaultProfile(), status: 'gdm', datingMethod: 'ddr', datingDate: '2026-01-10', deliveryDate: '2026-10-10', heightCm: 165, prePregnancyWeightKg: 60 };
  const advice = buildAdvice({ profile, readings: [], tests: [] }, '2026-10-31');
  assert.ok(advice.some((a) => a.id === 'pp-screening'));
});

test('export CSV (séparateur ;, virgule décimale, échappement)', () => {
  assert.equal(csvCell('a;b'), '"a;b"');
  assert.equal(safeText('=HYPERLINK("x")'), `'=HYPERLINK("x")`);
  assert.equal(safeText('repas normal'), 'repas normal');
  assert.equal(csvCell('il a dit "oui"'), '"il a dit ""oui"""');
  const profile = { ...defaultProfile(), datingMethod: 'ddr', datingDate: '2026-05-01' };
  const readings = [r('2026-10-31T07:30', 'fasting', 5.8, 'mmol/L', { note: 'dîner tardif; pâtes' })];
  const csv = readingsCsv(readings, profile);
  const [header, line] = csv.trim().split('\r\n');
  assert.ok(header.startsWith('Date;Heure;Âge gestationnel;Moment'));
  assert.ok(line.includes('31/10/2026;07:30;26 SA + 1 j;À jeun;5,8;mmol/L;1,04;104;5,8;< 0,95;Au-dessus de l’objectif'));
  assert.ok(line.endsWith('"dîner tardif; pâtes"'));
  const daily = dailyCsv(readings, profile);
  assert.ok(daily.split('\r\n')[1].includes('1,04 (+)'));
});

test('normalisation de l’état (import de sauvegarde)', () => {
  const s = normalizeState({ profile: { unit: 'xx', postprandialDelay: 5 }, readings: [{ ts: 'bad', value: 1 }, { ts: '2026-10-31T08:00', moment: 'fasting', value: '0,9', unit: 'g/L' }, { ts: '2026-10-31T08:00', moment: 'fasting', value: 0.9, unit: 'g/L' }] });
  assert.equal(s.profile.unit, 'g/L');
  assert.equal(s.profile.postprandialDelay, 120);
  assert.equal(s.readings.length, 1);
  assert.equal(s.readings[0].mgdl, toMgdl(0.9, 'g/L'));
});
