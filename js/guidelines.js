// Source unique des données médicales utilisées par l'application.
// Chaque valeur est rattachée à une référence (voir REFS). Les « repères de l'application »
// (seuils d'alerte qui ne proviennent pas d'une recommandation) sont signalés explicitement.

export const REFS = {
  cngof2010: {
    short: 'CNGOF-SFD 2010',
    full: 'Collège National des Gynécologues et Obstétriciens Français (CNGOF) et Société Francophone du Diabète (SFD). Le diabète gestationnel : recommandations pour la pratique clinique. J Gynecol Obstet Biol Reprod 2010;39(8 Suppl 2). Synthèse en anglais : Expert consensus on gestational diabetes mellitus. Diabetes Metab 2010;36(6 Pt 2):695-9.',
    url: 'https://cngof.fr/app/uploads/2023/06/RPC_DIABETE_2010.pdf',
    doi: '10.1016/j.diabet.2010.11.019',
  },
  iadpsg2010: {
    short: 'IADPSG 2010',
    full: 'International Association of Diabetes and Pregnancy Study Groups Consensus Panel. Recommendations on the diagnosis and classification of hyperglycemia in pregnancy. Diabetes Care 2010;33(3):676-82.',
    doi: '10.2337/dc09-1848',
  },
  sfd2022: {
    short: 'SFD 2022 (nutrition)',
    full: 'Société Francophone du Diabète (SFD Paramédical). Recommandations de bonnes pratiques : nutrition et diabète gestationnel. 2022.',
    url: 'https://www.sfdiabete.org/sites/www.sfdiabete.org/files/files/ressources/reco_nutrition_diabete_gestationnel_2022_v2_0.pdf',
  },
  ada2025: {
    short: 'ADA 2025',
    full: 'American Diabetes Association Professional Practice Committee. 15. Management of Diabetes in Pregnancy: Standards of Care in Diabetes—2025. Diabetes Care 2025;48(Suppl 1):S306-S320.',
    doi: '10.2337/dc25-S015',
  },
  ada2025hypo: {
    short: 'ADA 2025 (hypoglycémie)',
    full: 'American Diabetes Association Professional Practice Committee. 6. Glycemic Goals and Hypoglycemia: Standards of Care in Diabetes—2025. Diabetes Care 2025;48(Suppl 1):S128-S145.',
    doi: '10.2337/dc25-S006',
  },
  who2025: {
    short: 'OMS 2025',
    full: 'Organisation mondiale de la Santé. WHO recommendations on care for women with diabetes during pregnancy. Genève : OMS ; 2025.',
    url: 'https://www.who.int/publications/i/item/9789240117044',
  },
  who2020pa: {
    short: 'OMS 2020 (activité physique)',
    full: 'Bull FC et al. World Health Organization 2020 guidelines on physical activity and sedentary behaviour. Br J Sports Med 2020;54(24):1451-62.',
    doi: '10.1136/bjsports-2020-102955',
  },
  iom2009: {
    short: 'IOM 2009',
    full: 'Institute of Medicine (US) and National Research Council. Weight Gain During Pregnancy: Reexamining the Guidelines. Washington (DC) : National Academies Press ; 2009.',
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK32813/',
  },
  cochrane2017: {
    short: 'Cochrane 2017',
    full: 'Shepherd E et al. Combined diet and exercise interventions for preventing gestational diabetes mellitus. Cochrane Database Syst Rev 2017;11:CD010443.',
    doi: '10.1002/14651858.CD010443.pub3',
  },
  cochrane2020: {
    short: 'Cochrane 2020',
    full: 'Griffith RJ et al. Interventions to prevent women from developing gestational diabetes mellitus: an overview of Cochrane Reviews. Cochrane Database Syst Rev 2020;6:CD012394.',
    doi: '10.1002/14651858.CD012394.pub3',
  },
  vounzoulaki2020: {
    short: 'Vounzoulaki 2020',
    full: 'Vounzoulaki E et al. Progression to type 2 diabetes in women with a known history of gestational diabetes: systematic review and meta-analysis. BMJ 2020;369:m1361.',
    doi: '10.1136/bmj.m1361',
  },
  has2005: {
    short: 'HAS 2005',
    full: 'Haute Autorité de Santé. Rapport de synthèse sur le dépistage et le diagnostic du diabète gestationnel. 2005.',
    url: 'https://www.has-sante.fr/jcms/c_272475/fr/rapport-de-synthese-sur-le-depistage-et-le-diagnostic-du-diabete-gestationnel',
  },
  who1999: {
    short: 'OMS 1999 (HGPO)',
    full: 'World Health Organization. Definition, diagnosis and classification of diabetes mellitus and its complications. Part 1 : diagnosis and classification of diabetes mellitus (WHO/NCD/NCS/99.2), annexe 2 : méthode de l’HGPO. Genève : OMS ; 1999.',
    url: 'https://iris.who.int/handle/10665/66040',
  },
  cngof2011: {
    short: 'CNGOF 2011',
    full: 'CNGOF. Recommandations pour la pratique clinique : grossesse prolongée et terme dépassé. 2011.',
    url: 'https://cngof.fr/wp/../app/pdf/RPC//RPC%20DU%20CNGOF/2011/RPC_gr_prolongee_2011.pdf',
  },
};

export function refUrl(id) {
  const r = REFS[id];
  if (!r) return null;
  return r.doi ? `https://doi.org/${r.doi}` : r.url || null;
}

// ---------------------------------------------------------------------------
// Seuils (exprimés tels que publiés dans chaque unité)
// ---------------------------------------------------------------------------

/** Critères diagnostiques — CNGOF-SFD 2010, repris de l'IADPSG 2010. Une seule valeur suffit. */
export const DIAGNOSIS = {
  t1Fasting: {
    gdm: { 'g/L': 0.92, 'mg/dL': 92, 'mmol/L': 5.1 },
    overt: { 'g/L': 1.26, 'mg/dL': 126, 'mmol/L': 7.0 },
  },
  ogtt: {
    t0: { 'g/L': 0.92, 'mg/dL': 92, 'mmol/L': 5.1 },
    t60: { 'g/L': 1.8, 'mg/dL': 180, 'mmol/L': 10.0 },
    t120: { 'g/L': 1.53, 'mg/dL': 153, 'mmol/L': 8.5 },
  },
  refs: ['cngof2010', 'iadpsg2010'],
};

/** Objectifs glycémiques par défaut. À jeun et 2 h : CNGOF-SFD 2010. 1 h : ADA 2025. */
export const TARGETS = {
  fasting: { 'g/L': 0.95, 'mg/dL': 95, 'mmol/L': 5.3 },
  post120: { 'g/L': 1.2, 'mg/dL': 120, 'mmol/L': 6.7 },
  post60: { 'g/L': 1.4, 'mg/dL': 140, 'mmol/L': 7.8 },
};

/** Hypoglycémie : niveau 1 < 70 mg/dL (3,9 mmol/L), niveau 2 < 54 mg/dL (3,0 mmol/L) — ADA 2025. */
export const HYPO = {
  level1: { 'g/L': 0.7, 'mg/dL': 70, 'mmol/L': 3.9 },
  level2: { 'g/L': 0.54, 'mg/dL': 54, 'mmol/L': 3.0 },
};

/**
 * Repère de l'application (pas un seuil de recommandation) : valeur très élevée
 * justifiant un contrôle et un contact avec l'équipe si elle se répète.
 * 2,00 g/L = 11,1 mmol/L, seuil de glycémie « aléatoire » utilisé pour le diabète hors grossesse.
 */
export const VERY_HIGH = { 'g/L': 2.0, 'mg/dL': 200, 'mmol/L': 11.1 };

/** Repère de l'application pour signaler des dépassements répétés. */
export const REPEAT_RULE = { windowDays: 7, perMoment: 2, globalRatio: 0.2, minReadings: 8 };

// ---------------------------------------------------------------------------
// Moments de mesure
// ---------------------------------------------------------------------------

export const MOMENTS = [
  { id: 'fasting', label: 'À jeun', short: 'À jeun', kind: 'fasting', meal: null, defaultTime: '07:30' },
  { id: 'post_breakfast', label: 'Après le petit-déjeuner', short: 'Petit-déj.', kind: 'post', meal: 'petit-déjeuner', defaultTime: '10:00' },
  { id: 'post_lunch', label: 'Après le déjeuner', short: 'Déjeuner', kind: 'post', meal: 'déjeuner', defaultTime: '14:30' },
  { id: 'post_dinner', label: 'Après le dîner', short: 'Dîner', kind: 'post', meal: 'dîner', defaultTime: '21:30' },
  { id: 'other', label: 'Autre moment', short: 'Autre', kind: 'other', meal: null, defaultTime: null },
];

export const MAIN_MOMENTS = MOMENTS.filter((m) => m.kind !== 'other');

export function momentById(id) {
  return MOMENTS.find((m) => m.id === id) || MOMENTS[MOMENTS.length - 1];
}

export const TAGS = [
  { id: 'unusual_meal', label: 'Repas inhabituel' },
  { id: 'activity', label: 'Activité physique' },
  { id: 'sick', label: 'Malade / fièvre' },
  { id: 'stress', label: 'Stress / mauvaise nuit' },
  { id: 'symptoms', label: 'Malaise' },
  { id: 'pre_meal', label: 'Avant repas' },
];

// ---------------------------------------------------------------------------
// Facteurs de risque
// ---------------------------------------------------------------------------

/** Critères justifiant le dépistage ciblé en France (CNGOF-SFD 2010). */
export const RISK_FACTORS = [
  { id: 'age35', label: 'Âge de 35 ans ou plus', auto: 'age', ref: 'cngof2010' },
  { id: 'bmi25', label: 'IMC de 25 kg/m² ou plus avant la grossesse', auto: 'bmi', ref: 'cngof2010' },
  { id: 'familyDiabetes', label: 'Diabète chez un parent du premier degré (père, mère, frère, sœur)', ref: 'cngof2010' },
  { id: 'previousGDM', label: 'Diabète gestationnel lors d’une grossesse précédente', ref: 'cngof2010' },
  { id: 'macrosomia', label: 'Enfant né avec un poids de 4 kg ou plus (macrosomie)', ref: 'cngof2010' },
];

/** Autres situations décrites comme associées, non retenues comme critères de dépistage en France. */
export const OTHER_FACTORS = [
  { id: 'stillbirth', label: 'Antécédent de mort fœtale in utero', ref: 'has2005' },
];

// ---------------------------------------------------------------------------
// Prise de poids recommandée (IOM 2009), selon l'IMC avant grossesse
// ---------------------------------------------------------------------------

export const WEIGHT_GAIN = [
  { id: 'under', label: 'Maigreur', min: 0, max: 18.5, range: [12.5, 18], rate: [0.44, 0.58] },
  { id: 'normal', label: 'Corpulence normale', min: 18.5, max: 25, range: [11.5, 16], rate: [0.35, 0.5] },
  { id: 'over', label: 'Surpoids', min: 25, max: 30, range: [7, 11.5], rate: [0.23, 0.33] },
  { id: 'obese', label: 'Obésité', min: 30, max: Infinity, range: [5, 9], rate: [0.17, 0.27] },
];

/** Fenêtre de l'HGPO (en semaines d'aménorrhée). */
export const OGTT_WINDOW = { from: 24, to: 28 };

export const TREATMENTS = [
  { id: 'diet', label: 'Mesures hygiéno-diététiques seules' },
  { id: 'insulin', label: 'Insuline' },
  { id: 'metformin', label: 'Metformine' },
  { id: 'other', label: 'Autre traitement' },
];

export const STATUSES = [
  { id: 'unknown', label: 'Pas encore dépistée', short: 'Dépistage à faire' },
  { id: 'negative', label: 'Dépistage normal', short: 'Dépistage normal' },
  { id: 'gdm', label: 'Diabète gestationnel diagnostiqué', short: 'Diabète gestationnel' },
  { id: 't2d', label: 'Diabète découvert pendant la grossesse (glycémie à jeun ≥ 1,26 g/L)', short: 'Diabète découvert' },
];
