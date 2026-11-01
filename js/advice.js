// Moteur de conseils personnalisés.
// © 2026 LESACA Julien. Tous droits réservés.
// Chaque conseil indique sa base : 'reco' (issu d'une recommandation citée) ou 'app'
// (repère propre à l'application, qui n'est pas une recommandation officielle).
import { DIAGNOSIS, HYPO, VERY_HIGH, REPEAT_RULE, RISK_FACTORS, momentById } from './guidelines.js';
import { analyzeRecent, resolveTargets } from './analysis.js';
import { activeRiskFactors, bmi, bmiCategory, expectedGainAt, pregnancyInfo, formatGA } from './pregnancy.js';
import { formatValue, formatNumber } from './units.js';
import { addDays, formatDateShort, todayISO } from './dates.js';

const LEVEL_ORDER = { alert: 0, warn: 1, info: 2, success: 3 };

function v(th, unit) {
  return formatValue(th[unit], unit);
}

function list(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;
}

function hasTest(tests, type) {
  return (tests || []).some((t) => t.type === type);
}

export function buildAdvice(state, today = todayISO()) {
  const profile = state.profile || {};
  const readings = state.readings || [];
  const tests = state.tests || [];
  const unit = profile.unit || 'g/L';
  const preg = pregnancyInfo(profile, today);
  const status = profile.status || 'unknown';
  const diagnosed = status === 'gdm' || status === 't2d';
  const rfs = activeRiskFactors(profile, today);
  const out = [];
  const add = (a) => out.push({ basis: 'reco', refs: [], ...a });

  // --- Profil incomplet -----------------------------------------------------
  const missing = [];
  if (!preg) missing.push('la date de début de grossesse ou du terme');
  if (bmi(profile.heightCm, profile.prePregnancyWeightKg) == null) missing.push('votre taille et votre poids avant grossesse');
  if (missing.length) {
    add({
      id: 'profile',
      level: 'info',
      title: 'Complétez votre profil',
      body: `Indiquez ${list(missing)} pour obtenir des repères adaptés à votre grossesse.`,
      basis: 'app',
      action: { label: 'Compléter', href: '#/profil' },
    });
  }

  // --- Après l'accouchement ----------------------------------------------------
  if (preg?.delivered) {
    const d = profile.deliveryDate;
    if (diagnosed || profile.riskFactors?.previousGDM) {
      add({
        id: 'pp-screening',
        level: 'warn',
        title: 'Dépistage du diabète après l’accouchement',
        body: `Un dépistage du diabète de type 2 est recommandé lors de la consultation postnatale (glycémie à jeun ou HGPO 75 g), puis tous les 1 à 3 ans, à vie. L’ADA propose une HGPO 75 g entre 4 et 12 semaines après l’accouchement, soit entre le <strong>${formatDateShort(addDays(d, 28))}</strong> et le <strong>${formatDateShort(addDays(d, 84))}</strong>.`,
        refs: ['cngof2010', 'ada2025'],
        action: { label: 'En savoir plus', href: '#/comprendre/apres' },
      });
      add({
        id: 'pp-risk',
        level: 'info',
        title: 'Un risque à surveiller sur le long terme',
        body: 'Après un diabète gestationnel, le risque de développer un diabète de type 2 est environ 10 fois plus élevé que chez les femmes sans diabète gestationnel (méta-analyse de 20 études). D’où l’importance du dépistage régulier, et d’une glycémie à jeun dès le début d’une prochaine grossesse.',
        refs: ['vounzoulaki2020', 'cngof2010'],
      });
    }
    add(activityAdvice());
    return sortAdvice(out);
  }

  // --- Diagnostic retenu -------------------------------------------------------
  if (diagnosed) {
    const recent = analyzeRecent(readings, profile, today);
    const targets = resolveTargets(profile);

    if (status === 't2d') {
      add({
        id: 't2d',
        level: 'alert',
        title: 'Diabète découvert pendant la grossesse',
        body: `Une glycémie à jeun ≥ ${v(DIAGNOSIS.t1Fasting.overt, unit)} au premier trimestre oriente vers un diabète (le plus souvent de type 2) présent avant la grossesse. Une prise en charge rapide par une équipe spécialisée est nécessaire. Suivez en priorité les objectifs fixés par votre équipe.`,
        refs: ['cngof2010'],
      });
    }

    if (recent.verylow > 0 || recent.low > 0) {
      const severe = recent.verylow > 0;
      add({
        id: 'hypo',
        level: severe ? 'alert' : 'warn',
        title: severe ? 'Hypoglycémie importante enregistrée' : 'Glycémie basse enregistrée',
        body: `${severe ? `Au moins une valeur inférieure à ${v(HYPO.level2, unit)}` : `Au moins une valeur inférieure à ${v(HYPO.level1, unit)}`} sur les 7 derniers jours. En cas de malaise (sueurs, tremblements, faim brutale) : prenez 15 g de sucre (par exemple 3 morceaux de sucre ou un petit verre de jus de fruits), puis recontrôlez 15 minutes plus tard. ${profile.treatment === 'insulin' ? 'Sous insuline, prévenez votre équipe pour adapter les doses.' : 'Signalez-le à votre équipe.'}`,
        refs: ['ada2025hypo'],
      });
    }

    if (recent.veryHigh > 0) {
      add({
        id: 'very-high',
        level: 'warn',
        title: 'Valeur très élevée',
        body: `Au moins une valeur ≥ ${v(VERY_HIGH, unit)} sur les 7 derniers jours. Vérifiez la technique (mains lavées à l’eau, sans sucre sur les doigts) et recontrôlez. Si cela se répète, contactez votre équipe sans attendre.`,
        basis: 'app',
        note: `Seuil de ${v(VERY_HIGH, unit)} : repère de l’application, non issu d’une recommandation.`,
      });
    }

    if (recent.repeated) {
      const moments = recent.repeatedMoments.map((id) => {
        const m = momentById(id);
        return `${m.label.toLowerCase()} (${recent.byMoment[id].high} fois)`;
      });
      add({
        id: 'repeated',
        level: 'warn',
        title: 'Objectifs dépassés à plusieurs reprises',
        body: `${moments.length ? `Sur les 7 derniers jours : ${list(moments)}.` : `Sur les 7 derniers jours, ${formatNumber(recent.ratio * 100)} % des mesures sont au-dessus de l’objectif.`} Partagez ce relevé avec votre équipe sans attendre le prochain rendez-vous. ${profile.treatment === 'insulin' ? 'Votre équipe pourra adapter les doses d’insuline.' : 'Selon les recommandations françaises, un traitement par insuline est envisagé lorsque les objectifs ne sont pas atteints après 7 à 10 jours de mesures hygiéno-diététiques.'}`,
        refs: ['cngof2010'],
        note: `Détection : repère de l’application (au moins ${REPEAT_RULE.perMoment} dépassements au même moment, ou au moins ${REPEAT_RULE.globalRatio * 100} % des mesures, sur ${REPEAT_RULE.windowDays} jours).`,
        action: { label: 'Partager mon relevé', href: '#/export' },
      });

      if (recent.repeatedMoments.includes('fasting')) {
        add({
          id: 'tip-fasting',
          level: 'info',
          title: 'Glycémies à jeun au-dessus de l’objectif',
          body: 'La glycémie du matin reflète surtout ce qui se passe pendant la nuit. Notez l’heure et le contenu du dîner et d’une éventuelle collation du soir, et parlez-en à votre équipe : un ajustement de la prise en charge peut être nécessaire.',
          basis: 'app',
        });
      }
      const postMeals = recent.repeatedMoments.filter((id) => momentById(id).kind === 'post');
      if (postMeals.length) {
        add({
          id: 'tip-post',
          level: 'info',
          title: `Après ${list(postMeals.map((id) => `le ${momentById(id).meal}`))} : pistes à discuter`,
          body: 'Avec votre diététicien(ne) : répartir les féculents sur 3 repas et 2 à 3 collations, sans les supprimer ; privilégier légumes, féculents complets et légumineuses ; éviter boissons sucrées et jus de fruits. Une activité douce, comme la marche, aide aussi à faire baisser la glycémie.',
          refs: ['sfd2022', 'who2020pa'],
          action: { label: 'Alimentation et activité', href: '#/comprendre/vivre' },
        });
      }
    } else if (recent.evaluated >= REPEAT_RULE.minReadings && recent.pctOk >= 0.9) {
      add({
        id: 'well-done',
        level: 'success',
        title: 'Très bon équilibre cette semaine',
        body: `${formatNumber(recent.pctOk * 100)} % de vos mesures des 7 derniers jours sont dans l’objectif. Continuez ainsi !`,
        basis: 'app',
      });
    }

    if (recent.perDayLast3 != null && recent.perDayLast3 < 4) {
      add({
        id: 'frequency',
        level: 'info',
        title: 'Rythme des mesures',
        body: `Sur les 3 derniers jours : ${formatNumber(recent.perDayLast3, 1)} mesure(s) par jour en moyenne. Les recommandations prévoient une autosurveillance 4 à 6 fois par jour (à jeun et après les repas), sauf consigne différente de votre équipe.`,
        refs: ['cngof2010'],
      });
    }

    if (readings.length === 0) {
      add({
        id: 'start',
        level: 'info',
        title: 'Commencez votre carnet',
        body: `Mesurez à jeun et après les repas (${targets.delay === 60 ? '1 heure' : '2 heures'} après le début du repas). Objectifs : à jeun < ${v(targets.fasting, unit)} ; après le repas < ${v(targets.post, unit)}.`,
        refs: targets.custom.fasting || targets.custom.post ? [] : targets.delay === 60 ? ['cngof2010', 'ada2025'] : ['cngof2010'],
        note: targets.custom.fasting || targets.custom.post ? 'Objectifs personnalisés par votre équipe.' : undefined,
        action: { label: 'Ajouter une glycémie', href: '#/saisie' },
      });
    }

    if (profile.treatment === 'insulin') {
      add({
        id: 'insulin',
        level: 'info',
        title: 'Sous insuline : prévenir l’hypoglycémie',
        body: `Une glycémie inférieure à ${v(HYPO.level1, unit)} est une hypoglycémie. Ayez toujours du sucre sur vous. En cas de malaise : 15 g de sucre, puis nouveau contrôle 15 minutes plus tard.`,
        refs: ['ada2025hypo'],
      });
    }
  }

  // --- Dépistage (pas de diagnostic) -------------------------------------------
  if (!diagnosed && preg && preg.valid) {
    const rfLabels = rfs.map((id) => RISK_FACTORS.find((r) => r.id === id)?.label.toLowerCase()).filter(Boolean);
    const window = `entre le <strong>${formatDateShort(preg.ogttFrom)}</strong> et le <strong>${formatDateShort(preg.ogttTo)}</strong>`;
    if (status === 'negative') {
      add({
        id: 'negative',
        level: 'success',
        title: 'Dépistage normal',
        body: 'Poursuivez les mesures de prévention. Si l’échographie montre un bébé grand pour son âge ou un excès de liquide amniotique, votre soignant peut proposer de rechercher à nouveau un diabète gestationnel.',
        refs: ['cngof2010'],
      });
    } else if (rfs.length === 0) {
      add({
        id: 'no-rf',
        level: 'info',
        title: 'Aucun facteur de risque renseigné',
        body: 'En France, le dépistage est ciblé : il est recommandé en présence d’au moins un facteur de risque. Sans facteur de risque, il n’est pas systématique ; votre soignant peut toutefois le proposer, par exemple si l’échographie montre un bébé grand pour son âge ou un excès de liquide amniotique.',
        refs: ['cngof2010'],
        action: { label: 'Vérifier mes facteurs', href: '#/comprendre/risques' },
      });
    } else {
      const intro = `Vous présentez ${rfs.length} facteur${rfs.length > 1 ? 's' : ''} de risque (${list(rfLabels)}).`;
      if (preg.weeks < 24) {
        if (!hasTest(tests, 'gaj')) {
          add({
            id: 'screen-gaj',
            level: 'warn',
            title: 'Glycémie à jeun recommandée dès le 1er trimestre',
            body: `${intro} Les recommandations françaises prévoient une glycémie à jeun au laboratoire dès le premier trimestre, puis, si elle est normale (< ${v(DIAGNOSIS.t1Fasting.gdm, unit)}), une HGPO ${window}.`,
            refs: ['cngof2010'],
            action: { label: 'Le dépistage', href: '#/comprendre/depistage' },
          });
        } else {
          add({
            id: 'screen-next',
            level: 'info',
            title: 'Prochaine étape : l’HGPO',
            body: `${intro} Après une glycémie à jeun normale, une HGPO 75 g est recommandée ${window}.`,
            refs: ['cngof2010'],
            action: { label: 'Comment se passe l’HGPO', href: '#/comprendre/hgpo' },
          });
        }
      } else if (preg.weeks <= 28) {
        if (!hasTest(tests, 'hgpo')) {
          add({
            id: 'screen-hgpo',
            level: 'warn',
            title: 'C’est la période de l’HGPO',
            body: `${intro} L’HGPO 75 g est recommandée entre 24 et 28 SA, soit ${window}. Si elle est prescrite, pensez à prendre rendez-vous au laboratoire.`,
            refs: ['cngof2010'],
            action: { label: 'Comment se passe l’HGPO', href: '#/comprendre/hgpo' },
          });
        }
      } else if (!hasTest(tests, 'hgpo')) {
        add({
          id: 'screen-late',
          level: 'info',
          title: 'La période 24–28 SA est passée',
          body: `${intro} Si l’HGPO n’a pas été réalisée, parlez-en à votre sage-femme ou à votre médecin.`,
          refs: ['cngof2010'],
        });
      }
    }
    add({
      id: 'prevention',
      level: 'info',
      title: 'Prévention : bouger et bien manger',
      body: 'Associer activité physique et conseils alimentaires pendant la grossesse réduit possiblement le risque de diabète gestationnel (RR 0,85 ; IC 95 % 0,71–1,01 ; niveau de preuve modéré). L’OMS recommande au moins 150 minutes d’activité d’intensité modérée par semaine pendant la grossesse, en l’absence de contre-indication.',
      refs: ['cochrane2017', 'who2020pa'],
      action: { label: 'La prévention', href: '#/comprendre/prevention' },
    });
  }

  // --- Prise de poids ---------------------------------------------------------
  const w = weightAdvice(profile, preg);
  if (w) add(w);

  if (diagnosed) add(activityAdvice());
  return sortAdvice(out);
}

function activityAdvice() {
  return {
    id: 'activity',
    level: 'info',
    title: 'Bouger chaque jour',
    body: 'L’OMS recommande au moins 150 minutes par semaine d’activité d’intensité modérée (marche rapide, natation, vélo d’appartement…) pendant la grossesse et après l’accouchement, en l’absence de contre-indication médicale.',
    basis: 'reco',
    refs: ['who2020pa'],
  };
}

function weightAdvice(profile, preg) {
  const b = bmi(profile.heightCm, profile.prePregnancyWeightKg);
  const cat = bmiCategory(b);
  if (!cat || !preg || preg.delivered || !preg.valid) return null;
  const current = Number(profile.currentWeightKg);
  const gainText = `Repère pour votre IMC avant grossesse (${formatNumber(b, 1)} kg/m², ${cat.label.toLowerCase()}) : prise de poids totale de ${formatNumber(cat.range[0], 1)} à ${formatNumber(cat.range[1], 1)} kg.`;
  if (!(current > 30)) {
    return {
      id: 'weight',
      level: 'info',
      title: 'Prise de poids',
      body: `${gainText} Renseignez votre poids actuel dans le profil pour suivre votre évolution.`,
      refs: ['iom2009'],
    };
  }
  const gain = current - Number(profile.prePregnancyWeightKg);
  const exp = expectedGainAt(cat, preg.weeks);
  let level = 'info';
  let verdict = 'Votre prise de poids est dans le repère attendu à ce stade.';
  if (exp && gain > exp[1] + 1) {
    level = 'warn';
    verdict = 'Votre prise de poids est au-dessus du repère attendu à ce stade : parlez-en à votre sage-femme ou à votre médecin (ne faites pas de régime restrictif sans avis).';
  } else if (exp && gain < exp[0] - 1) {
    level = 'warn';
    verdict = 'Votre prise de poids est en dessous du repère attendu à ce stade : parlez-en à votre sage-femme ou à votre médecin.';
  }
  return {
    id: 'weight',
    level,
    title: 'Prise de poids',
    body: `${gainText} Actuellement : ${gain >= 0 ? '+' : ''}${formatNumber(gain, 1)} kg à ${formatGA({ weeks: preg.weeks, extraDays: preg.extraDays })}${exp ? ` (repère à ce stade : ${formatNumber(exp[0], 1)} à ${formatNumber(exp[1], 1)} kg)` : ''}. ${verdict}`,
    refs: ['iom2009'],
    note: 'Repère « à ce stade » calculé par l’application à partir des rythmes hebdomadaires de l’IOM (tolérance ± 1 kg).',
  };
}

function sortAdvice(list) {
  const seen = new Set();
  return list
    .filter((a) => a && !seen.has(a.id) && seen.add(a.id))
    .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}
