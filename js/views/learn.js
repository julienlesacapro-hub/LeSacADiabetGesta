// « Comprendre » : contenus d'information sourcés, frise du dépistage, HGPO animée, simulateur de résultats.
// © 2026 LESACA Julien. Tous droits réservés.
import { getState, saveTest, setProfile } from '../store.js';
import { DIAGNOSIS, TARGETS, HYPO, RISK_FACTORS, OTHER_FACTORS, WEIGHT_GAIN, OGTT_WINDOW, REFS, refUrl } from '../guidelines.js';
import { activeRiskFactors, bmi, bmiCategory, pregnancyInfo, maternalAge } from '../pregnancy.js';
import { UNITS, UNIT_INFO, parseNumber, formatValue, formatNumber, compareToThreshold, guessUnit } from '../units.js';
import { formatDateShort, todayISO } from '../dates.js';
import { esc, icon, toast, confirmDialog } from '../ui.js';
import { sourcesBlock } from './components.js';
import { COPYRIGHT } from '../version.js';

export const TOPICS = [
  { id: 'dg', icon: 'drop', title: 'Le diabète gestationnel', desc: 'Définition, causes et enjeux' },
  { id: 'risques', icon: 'target', title: 'Facteurs de risque', desc: 'Qui est concernée ? Votre situation' },
  { id: 'prevention', icon: 'walk', title: 'Prévention', desc: 'Activité, alimentation, prise de poids' },
  { id: 'depistage', icon: 'calendar', title: 'Le dépistage', desc: 'Quels tests, à quel moment' },
  { id: 'hgpo', icon: 'flask', title: 'L’HGPO pas à pas', desc: 'Le déroulé du test, en images' },
  { id: 'diagnostic', icon: 'check', title: 'Critères de diagnostic', desc: 'Seuils et lecture de vos résultats' },
  { id: 'suivi', icon: 'chart', title: 'Après le diagnostic', desc: 'Autosurveillance, objectifs, traitement' },
  { id: 'vivre', icon: 'apple', title: 'Alimentation et activité', desc: 'Conseils pratiques au quotidien' },
  { id: 'apres', icon: 'baby', title: 'Après l’accouchement', desc: 'Dépistage et suivi à long terme' },
  { id: 'sources', icon: 'book', title: 'Sources et limites', desc: 'Références, confidentialité, repères' },
];

const v = (th, unit) => formatValue(th[unit], unit);
const eq = (th, unit) => UNITS.filter((u) => u !== unit).map((u) => formatValue(th[u], u)).join(' ; ');

export function renderLearnIndex(view) {
  view.innerHTML = `
    <header class="page-head"><div class="eyebrow">Informations sourcées</div><h1>Comprendre</h1>
      <p class="muted" style="margin-top:6px">Les repères essentiels, issus des recommandations françaises (CNGOF-SFD) et internationales.</p></header>
    <nav class="topics" aria-label="Thèmes">
      ${TOPICS.map((t) => `<a class="topic" href="#/comprendre/${t.id}"><span class="topic-ico">${icon(t.icon)}</span><span class="topic-text"><strong>${esc(t.title)}</strong><span>${esc(t.desc)}</span></span>${icon('chevronRight', { size: 20 })}</a>`).join('')}
    </nav>`;
}

export function renderTopic(view, id) {
  const t = TOPICS.find((x) => x.id === id);
  if (!t) return renderLearnIndex(view);
  const st = getState();
  const unit = st.profile.unit || 'g/L';
  const body = CONTENT[id](st, unit);
  const idx = TOPICS.indexOf(t);
  const next = TOPICS[idx + 1];
  view.innerHTML = `
    <a class="back-link" href="#/comprendre">${icon('chevronLeft', { size: 20 })}Comprendre</a>
    <header class="page-head"><h1>${esc(t.title)}</h1></header>
    <article class="article">${body}</article>
    ${next ? `<a class="topic" style="margin-top:24px" href="#/comprendre/${next.id}"><span class="topic-ico">${icon(next.icon)}</span><span class="topic-text"><span>À lire ensuite</span><strong>${esc(next.title)}</strong></span>${icon('chevronRight', { size: 20 })}</a>` : ''}`;
  MOUNT[id]?.(view, st, unit);
}

// ---------------------------------------------------------------------------------
// Contenus
// ---------------------------------------------------------------------------------

const CONTENT = {
  dg: () => `
    <p class="lead">Le diabète gestationnel est une élévation du taux de sucre dans le sang (glycémie), de sévérité variable, qui débute ou est découverte pour la première fois pendant la grossesse.</p>
    <h2>Pourquoi apparaît-il&nbsp;?</h2>
    <p>Pendant la grossesse, les hormones du placenta rendent le corps moins sensible à l’insuline, l’hormone qui fait baisser la glycémie. Cette « insulinorésistance » augmente au deuxième et au troisième trimestre. Si le pancréas ne produit pas assez d’insuline pour compenser, la glycémie s’élève.</p>
    <h2>Est-ce fréquent&nbsp;?</h2>
    <p>Environ 15 % des femmes enceintes dans le monde sont concernées, avec de grandes variations selon les pays, les populations et les critères de diagnostic utilisés.</p>
    <h2>Quels enjeux&nbsp;?</h2>
    <ul>
      <li><strong>Pour le bébé</strong> : un excès de croissance (macrosomie) et une hypoglycémie dans les heures qui suivent la naissance.</li>
      <li><strong>Pour la mère</strong> : un risque accru de pré-éclampsie et de césarienne.</li>
      <li><strong>À long terme</strong> : un risque de diabète de type 2 environ 10 fois plus élevé qu’après une grossesse sans diabète gestationnel.</li>
    </ul>
    <div class="callout">${icon('heart')}<p><strong>La bonne nouvelle</strong> : la prise en charge (alimentation, activité physique, autosurveillance et, si besoin, insuline) réduit les complications. Le diabète gestationnel disparaît le plus souvent après l’accouchement, mais il justifie un suivi.</p></div>
    ${sourcesBlock(['cngof2010', 'ada2025', 'cochrane2020', 'vounzoulaki2020'])}`,

  risques: (st) => {
    const p = st.profile;
    const active = new Set(activeRiskFactors(p));
    const age = maternalAge(p);
    const b = bmi(p.heightCm, p.prePregnancyWeightKg);
    const known = { age35: age != null, bmi25: b != null };
    const detail = { age35: age != null ? `${age} ans` : 'âge non renseigné', bmi25: b != null ? `IMC ${formatNumber(b, 1)} kg/m²` : 'taille / poids non renseignés' };
    return `
      <p class="lead">En France, le dépistage est <strong>ciblé</strong> : il est recommandé aux femmes enceintes qui présentent au moins un des facteurs de risque suivants.</p>
      <div class="card card-soft" style="padding:12px">
        ${RISK_FACTORS.map((rf) => `<div class="check auto" style="background:var(--surface)">
          <input type="checkbox" disabled ${active.has(rf.id) ? 'checked' : ''}><span class="box">${icon('check', { size: 16 })}</span>
          <span class="check-text">${esc(rf.label)}${rf.auto ? `<small>${esc(detail[rf.id])}${known[rf.id] ? ' — calculé depuis votre profil' : ''}</small>` : ''}</span>
        </div>`).join('')}
      </div>
      <p class="small muted" style="margin-top:10px">${active.size ? `Selon votre profil, vous présentez <strong>${active.size} facteur${active.size > 1 ? 's' : ''} de risque</strong> : un dépistage est recommandé.` : 'Selon votre profil, aucun facteur de risque n’est renseigné.'} <a href="#/profil">Mettre à jour mon profil</a></p>
      <div class="callout">${icon('info')}<p>Avoir un facteur de risque ne veut pas dire que vous aurez un diabète gestationnel : cela signifie qu’un test est utile. À l’inverse, un diabète gestationnel peut survenir sans facteur de risque.</p></div>
      <h2>Autres situations à signaler</h2>
      <ul>${OTHER_FACTORS.map((f) => `<li>${esc(f.label)} (${esc(REFS[f.ref].short)})</li>`).join('')}
        <li>Une croissance importante du bébé ou un excès de liquide amniotique à l’échographie : votre soignant peut alors proposer un dépistage, même sans facteur de risque.</li></ul>
      ${sourcesBlock(['cngof2010', 'has2005'])}`;
  },

  prevention: (st) => {
    const b = bmi(st.profile.heightCm, st.profile.prePregnancyWeightKg);
    const cat = bmiCategory(b);
    return `
      <p class="lead">Aucune mesure ne garantit d’éviter un diabète gestationnel, mais certaines habitudes réduisent probablement le risque et sont bénéfiques pour toute la grossesse.</p>
      <h2>Ce que disent les études</h2>
      <ul>
        <li><strong>Activité physique + conseils alimentaires</strong> pendant la grossesse : réduction possible du risque (risque relatif 0,85 ; IC 95 % 0,71–1,01 ; 19 essais, 6 633 femmes ; niveau de preuve modéré).</li>
        <li><strong>Alimentation seule ou activité seule</strong> : preuves insuffisantes pour conclure.</li>
        <li><strong>Compléments</strong> (myo-inositol, vitamine D) : bénéfice possible mais preuves de faible qualité ; ils ne sont pas recommandés en pratique courante. Ne prenez pas de complément sans avis médical. Les oméga-3 n’ont pas d’effet sur ce risque.</li>
      </ul>
      <h2>Bouger chaque jour</h2>
      <p>L’OMS recommande, pendant la grossesse et en l’absence de contre-indication, <strong>au moins 150 minutes par semaine</strong> d’activité d’intensité modérée (marche rapide, natation, vélo d’appartement, gymnastique adaptée), des exercices de renforcement musculaire et moins de temps assise.</p>
      <h2>Manger équilibré</h2>
      <p>Des repas réguliers, des légumes, des féculents de préférence complets et des légumineuses ; limiter les boissons sucrées, jus de fruits et produits très sucrés. Pas de régime restrictif pendant la grossesse sans avis médical.</p>
      <h2>Prise de poids</h2>
      <p>Repères de prise de poids totale selon l’IMC avant grossesse :</p>
      <table class="thresholds"><thead><tr><th>IMC avant grossesse</th><th>Prise de poids totale</th></tr></thead><tbody>
        ${WEIGHT_GAIN.map((c) => `<tr${cat?.id === c.id ? ' style="background:var(--primary-soft)"' : ''}><td>${esc(c.label)} (${c.max === Infinity ? `≥ ${formatNumber(c.min, 1)}` : c.min === 0 ? `< ${formatNumber(c.max, 1)}` : `${formatNumber(c.min, 1)} – ${formatNumber(c.max - 0.1, 1)}`})${cat?.id === c.id ? ' — <strong>vous</strong>' : ''}</td><td class="v">${formatNumber(c.range[0], 1)} à ${formatNumber(c.range[1], 1)} kg</td></tr>`).join('')}
      </tbody></table>
      <div class="callout">${icon('info')}<p>Peu d’essais ont évalué ce qui est efficace <strong>avant</strong> ou <strong>entre</strong> deux grossesses ; les conseils ci-dessus restent des repères de bonne santé générale à ce moment-là.</p></div>
      ${sourcesBlock(['cochrane2017', 'cochrane2020', 'who2020pa', 'iom2009'])}`;
  },

  depistage: (st, unit) => {
    const preg = pregnancyInfo(st.profile);
    const you = preg && preg.valid && !preg.delivered ? Math.min(41, preg.days / 7) : null;
    const pct = (w) => `${((w / 41) * 100).toFixed(2)}%`;
    return `
      <p class="lead">En France, le dépistage concerne les femmes qui présentent au moins un facteur de risque. Il se fait en deux temps possibles.</p>
      <div class="card ga-timeline" aria-label="Frise de la grossesse et périodes de dépistage">
        <div class="ga-track">
          <div class="ga-line"></div>
          <div class="ga-seg t1" style="left:0;width:${pct(14)}"></div>
          <div class="ga-seg ogtt" style="left:${pct(OGTT_WINDOW.from)};width:${pct(OGTT_WINDOW.to - OGTT_WINDOW.from + 1)}"></div>
          ${you != null ? `<div class="ga-you" style="left:${pct(you)}"><span>Vous · ${preg.weeks} SA</span></div>` : ''}
        </div>
        <div class="ga-ticks"><span>0</span><span>14</span><span>24</span><span>28</span><span>41 SA</span></div>
        <div class="ga-legend">
          <span><i class="swatch" style="background:color-mix(in srgb, var(--accent) 35%, transparent)"></i>1er trimestre : glycémie à jeun</span>
          <span><i class="swatch" style="background:var(--primary)"></i>24 à 28 SA : HGPO 75 g${preg && preg.valid ? ` (du ${formatDateShort(preg.ogttFrom)} au ${formatDateShort(preg.ogttTo)})` : ''}</span>
        </div>
      </div>
      <h2>1. Au premier trimestre : glycémie à jeun</h2>
      <p>Une prise de sang à jeun, au laboratoire, dès le début de la grossesse.</p>
      <ul>
        <li><strong>Moins de ${v(DIAGNOSIS.t1Fasting.gdm, unit)}</strong> : normal à ce stade → HGPO entre 24 et 28 SA.</li>
        <li><strong>De ${v(DIAGNOSIS.t1Fasting.gdm, unit)} à moins de ${v(DIAGNOSIS.t1Fasting.overt, unit)}</strong> : diabète gestationnel.</li>
        <li><strong>${v(DIAGNOSIS.t1Fasting.overt, unit)} ou plus</strong> : diabète (le plus souvent de type 2) présent avant la grossesse, qui nécessite une prise en charge spécialisée rapide.</li>
      </ul>
      <h2>2. Entre 24 et 28 SA : l’HGPO 75 g</h2>
      <p>L’hyperglycémie provoquée par voie orale mesure la glycémie à jeun, puis 1 h et 2 h après avoir bu 75 g de glucose. Elle est proposée si la glycémie à jeun du premier trimestre était normale ou n’a pas été faite.</p>
      <p><a class="btn btn-secondary btn-sm" href="#/comprendre/hgpo">${icon('flask', { size: 18 })}Voir le déroulé de l’HGPO</a></p>
      <div class="callout">${icon('info')}<p>Le test « en deux temps » (charge de 50 g) n’est plus recommandé en France depuis 2010.</p></div>
      <h2>Et sans facteur de risque&nbsp;?</h2>
      <p>Le dépistage n’est pas systématique. Il peut être proposé si l’échographie montre un bébé grand pour son âge ou un excès de liquide amniotique.</p>
      ${sourcesBlock(['cngof2010', 'iadpsg2010'])}`;
  },

  hgpo: (st, unit) => `
    <p class="lead">L’HGPO dure un peu plus de 2 heures, au laboratoire, le matin. Touchez « Lancer » pour suivre le déroulé.</p>
    <div class="card" style="padding:14px 12px">
      <div class="ogtt-clock" data-ogtt-figure></div>
      <div class="ogtt-controls">
        <button type="button" class="btn btn-primary btn-sm" data-ogtt-play>${icon('clock', { size: 18 })}Lancer</button>
        <button type="button" class="btn btn-secondary btn-sm" data-ogtt-reset>Revoir depuis le début</button>
      </div>
    </div>
    <ol class="steps" data-ogtt-steps>
      ${OGTT_STEPS.map((s, i) => `<li class="step" data-step="${i}">
        <span class="step-dot">${icon(s.icon)}</span>
        <div class="step-text"><span class="step-time">${esc(s.time)}</span><strong>${esc(s.title)}</strong><p class="muted">${s.text}</p></div>
      </li>`).join('')}
    </ol>
    <div class="callout warn">${icon('alert')}<p>En cas de vomissement pendant le test, prévenez le laboratoire : le résultat ne pourra pas être interprété et le test devra en général être refait.</p></div>
    <p>Résultat : le diabète gestationnel est retenu si <strong>au moins une</strong> des trois valeurs atteint le seuil — à jeun ≥ ${v(DIAGNOSIS.ogtt.t0, unit)}, à 1 h ≥ ${v(DIAGNOSIS.ogtt.t60, unit)}, à 2 h ≥ ${v(DIAGNOSIS.ogtt.t120, unit)}.</p>
    <p><a class="btn btn-secondary btn-sm" href="#/comprendre/diagnostic">${icon('check', { size: 18 })}Lire mes résultats</a></p>
    ${sourcesBlock(['cngof2010', 'iadpsg2010', 'who1999'])}`,

  diagnostic: (st, unit) => `
    <p class="lead">Critères retenus en France (CNGOF-SFD 2010, repris des critères internationaux IADPSG). <strong>Une seule valeur atteinte ou dépassée suffit.</strong></p>
    <table class="thresholds">
      <thead><tr><th>Test</th><th>Seuil (${esc(unit)})</th><th>Équivalences</th></tr></thead>
      <tbody>
        <tr><td>Glycémie à jeun, 1er trimestre</td><td class="v">≥ ${v(DIAGNOSIS.t1Fasting.gdm, unit)}</td><td class="tiny">${eq(DIAGNOSIS.t1Fasting.gdm, unit)}</td></tr>
        <tr><td>HGPO 75 g — à jeun</td><td class="v">≥ ${v(DIAGNOSIS.ogtt.t0, unit)}</td><td class="tiny">${eq(DIAGNOSIS.ogtt.t0, unit)}</td></tr>
        <tr><td>HGPO 75 g — 1 heure</td><td class="v">≥ ${v(DIAGNOSIS.ogtt.t60, unit)}</td><td class="tiny">${eq(DIAGNOSIS.ogtt.t60, unit)}</td></tr>
        <tr><td>HGPO 75 g — 2 heures</td><td class="v">≥ ${v(DIAGNOSIS.ogtt.t120, unit)}</td><td class="tiny">${eq(DIAGNOSIS.ogtt.t120, unit)}</td></tr>
      </tbody>
    </table>
    <p class="small muted">Une glycémie à jeun ≥ ${v(DIAGNOSIS.t1Fasting.overt, unit)} (${eq(DIAGNOSIS.t1Fasting.overt, unit)}) oriente vers un diabète présent avant la grossesse.</p>
    <h2>Lire mes résultats</h2>
    <p>Recopiez les valeurs de votre compte rendu, dans l’unité du laboratoire. L’application les compare aux seuils.</p>
    <form class="card" data-sim novalidate>
      <div class="seg" role="group" aria-label="Type de test">
        <button type="button" data-simtype="hgpo" aria-pressed="true">HGPO 75 g</button>
        <button type="button" data-simtype="gaj" aria-pressed="false">Glycémie à jeun</button>
      </div>
      <label class="field" style="margin-top:14px"><span class="label">Unité du compte rendu</span>
        <select class="select" name="unit">${UNITS.map((u) => `<option value="${u}" ${u === unit ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
      <div class="grid-2" style="margin-top:14px" data-simfields></div>
      <label class="field" style="margin-top:14px"><span class="label">Date du test</span><input class="input" type="date" name="date" value="${todayISO()}" max="${todayISO()}"></label>
      <div data-simresult></div>
    </form>
    <div class="callout warn">${icon('alert')}<p>Le diagnostic est posé par votre médecin ou votre sage-femme, à partir des résultats du laboratoire. Cet outil aide à les comprendre ; il ne remplace pas leur interprétation.</p></div>
    ${sourcesBlock(['cngof2010', 'iadpsg2010'])}`,

  suivi: (st, unit) => `
    <p class="lead">Une fois le diagnostic posé, la prise en charge repose d’abord sur l’alimentation, l’activité physique et l’autosurveillance de la glycémie.</p>
    <h2>L’autosurveillance</h2>
    <ul>
      <li><strong>4 à 6 mesures par jour</strong> au bout du doigt : à jeun le matin et après les repas, selon la prescription de votre équipe.</li>
      <li>Après un repas, mesurez <strong>2 heures après le début du repas</strong> (ou 1 heure si votre équipe vous l’a indiqué).</li>
      <li>Lavez-vous les mains à l’eau et au savon avant la mesure : un reste de sucre sur les doigts peut fausser le résultat.</li>
      <li>Notez chaque valeur : l’application calcule automatiquement les correspondances entre g/L, mg/dL et mmol/L.</li>
    </ul>
    <h2>Les objectifs</h2>
    <table class="thresholds"><thead><tr><th>Moment</th><th>Objectif</th><th>Équivalences</th></tr></thead><tbody>
      <tr><td>À jeun</td><td class="v">&lt; ${v(TARGETS.fasting, unit)}</td><td class="tiny">${eq(TARGETS.fasting, unit)}</td></tr>
      <tr><td>2 h après le repas</td><td class="v">&lt; ${v(TARGETS.post120, unit)}</td><td class="tiny">${eq(TARGETS.post120, unit)}</td></tr>
      <tr><td>1 h après le repas*</td><td class="v">&lt; ${v(TARGETS.post60, unit)}</td><td class="tiny">${eq(TARGETS.post60, unit)}</td></tr>
    </tbody></table>
    <p class="tiny muted">À jeun et 2 h : CNGOF-SFD 2010. *1 h : ADA 2025, si votre équipe mesure à 1 h. Les objectifs fixés par votre équipe priment : vous pouvez les saisir dans le profil.</p>
    <h2>Si les objectifs ne sont pas atteints</h2>
    <p>Lorsque les objectifs ne sont pas atteints après <strong>7 à 10 jours</strong> de mesures hygiéno-diététiques, un traitement par <strong>insuline</strong> est envisagé. L’insuline est le traitement de référence pendant la grossesse ; elle ne traverse pas le placenta de façon mesurable.</p>
    <p>En France, les antidiabétiques oraux ne sont pas recommandés en première intention. L’OMS (2025) mentionne la metformine parmi les options de traitement ; votre équipe vous dira ce qui vous convient.</p>
    <h2>Sous insuline : l’hypoglycémie</h2>
    <p>Une glycémie <strong>inférieure à ${v(HYPO.level1, unit)}</strong> est une hypoglycémie ; en dessous de ${v(HYPO.level2, unit)}, elle est importante. Signes possibles : sueurs, tremblements, faim brutale, palpitations, troubles de la vue.</p>
    <div class="callout">${icon('info')}<p><strong>Que faire&nbsp;?</strong> Prenez 15 à 20 g de sucre rapide (par exemple 3 à 4 morceaux de sucre, ou un petit verre de jus de fruits ou de soda non allégé), puis recontrôlez 15 minutes plus tard. Recommencez si la glycémie reste basse, et prévenez votre équipe.</p></div>
    <h2>Le suivi de la grossesse</h2>
    <p>Votre équipe adapte la surveillance (consultations, échographies de croissance) à l’équilibre glycémique et à la croissance du bébé. Le moment et le mode d’accouchement sont décidés avec elle.</p>
    ${sourcesBlock(['cngof2010', 'ada2025', 'ada2025hypo', 'who2025'])}`,

  vivre: () => `
    <p class="lead">L’alimentation est la base du traitement. Une consultation avec un(e) diététicien(ne) permet de l’adapter à vos habitudes.</p>
    <h2>Les grands principes</h2>
    <ul>
      <li><strong>Ne supprimez pas les glucides</strong> (pain, féculents, fruits) : ils sont indispensables au bébé. La SFD indique un minimum d’environ 160 g de glucides par jour.</li>
      <li><strong>Répartissez-les</strong> sur 3 repas et 2 à 3 collations, plutôt qu’en grande quantité en une fois.</li>
      <li><strong>Privilégiez</strong> les légumes à chaque repas, les féculents complets, les légumineuses (lentilles, pois chiches…), les fruits entiers plutôt qu’en jus.</li>
      <li><strong>Évitez</strong> les boissons sucrées, jus de fruits, sodas et produits très sucrés.</li>
      <li>Associez les féculents à des protéines (œufs, poisson, viande, laitages) et à des fibres : la glycémie monte moins vite.</li>
    </ul>
    <div class="callout">${icon('coffee')}<p>Le <strong>petit-déjeuner</strong> est souvent le repas le plus difficile à équilibrer : si vos glycémies sont élevées après celui-ci, parlez-en à votre diététicien(ne) (repère pratique fréquent, à adapter à votre cas).</p></div>
    <h2>L’activité physique</h2>
    <p>Au moins <strong>150 minutes par semaine</strong> d’activité d’intensité modérée, en l’absence de contre-indication. Une marche après le repas peut aider à faire baisser la glycémie qui suit.</p>
    <h2>Avec l’application</h2>
    <p>Utilisez la note et le « contexte » de chaque mesure (repas inhabituel, activité, malade, stress) : ils aident votre équipe à comprendre les valeurs hors objectif.</p>
    ${sourcesBlock(['sfd2022', 'cngof2010', 'who2020pa'])}`,

  apres: (st, unit) => `
    <p class="lead">Le diabète gestationnel disparaît le plus souvent après la naissance, mais il signale un risque à surveiller pour l’avenir.</p>
    <h2>Juste après la naissance</h2>
    <ul>
      <li>L’autosurveillance et l’insuline sont généralement arrêtées : suivez les consignes de votre équipe.</li>
      <li>La glycémie de votre bébé peut être surveillée dans les premières heures.</li>
    </ul>
    <h2>Le dépistage du diabète de type 2</h2>
    <ul>
      <li><strong>À la consultation postnatale</strong> : glycémie à jeun ou HGPO 75 g. L’ADA propose une HGPO 75 g entre 4 et 12 semaines après l’accouchement.</li>
      <li><strong>Puis tous les 1 à 3 ans</strong>, à vie, selon vos facteurs de risque.</li>
    </ul>
    <div class="callout warn">${icon('alert')}<p>Après un diabète gestationnel, le risque de diabète de type 2 est environ <strong>10 fois plus élevé</strong> (méta-analyse de 20 études, plus d’1,3 million de femmes). D’où l’importance de ce suivi.</p></div>
    <h2>Pour une prochaine grossesse</h2>
    <p>Un antécédent de diabète gestationnel est un facteur de risque : une glycémie à jeun est recommandée dès le premier trimestre.</p>
    <h2>Au quotidien</h2>
    <p>Activité physique régulière (au moins 150 minutes par semaine) et alimentation équilibrée restent recommandées après l’accouchement.</p>
    <p>Dans l’application, indiquez la date de naissance de votre bébé dans le profil : les conseils s’adaptent au post-partum.</p>
    ${sourcesBlock(['cngof2010', 'ada2025', 'vounzoulaki2020', 'who2020pa'])}`,

  sources: () => `
    <h2 style="margin-top:0">Confidentialité</h2>
    <p>Toutes vos données restent <strong>sur ce téléphone</strong>, dans le stockage de l’application. Rien n’est envoyé sur Internet. Les fichiers PDF et CSV sont créés sur le téléphone et ne sont transmis que si vous choisissez de les partager. Pensez à faire une sauvegarde (Profil → Mes données).</p>
    <h2>Limites</h2>
    <ul>
      <li>Cette application est un outil d’information et de suivi personnel. Elle ne pose pas de diagnostic et <strong>ne remplace pas</strong> l’avis de votre médecin, sage-femme ou diabétologue.</li>
      <li>Les recommandations françaises de référence (CNGOF-SFD) datent de 2010 ; les pratiques peuvent varier selon les maternités. <strong>Les objectifs fixés par votre équipe priment</strong> et peuvent être saisis dans le profil.</li>
      <li>Les conseils marqués « Repère de l’application » ne sont pas issus d’une recommandation officielle : seuil de valeur très élevée (2,00 g/L), détection de dépassements répétés (au moins 2 au même moment, ou au moins 20 % des mesures, sur 7 jours), repère de prise de poids « à ce stade » calculé à partir des rythmes de l’IOM.</li>
      <li>Conversions : 1 mmol/L = 18,0156 mg/dL = 0,180156 g/L (masse molaire du glucose : 180,156 g/mol). Les comparaisons aux seuils se font dans l’unité de saisie, avec les valeurs publiées dans cette unité.</li>
      <li>Âge gestationnel : par défaut, convention française du terme à 41 SA (287 jours après les dernières règles), modifiable (40 SA) dans le profil.</li>
    </ul>
    <h2>Droits d’auteur</h2>
    <p>LeSacADiabetGesta — application, textes, logo et illustrations : <strong>${COPYRIGHT}</strong> Toute reproduction ou diffusion sans autorisation de l’auteur est interdite. Les recommandations citées restent la propriété de leurs auteurs ; la bibliothèque jsPDF est distribuée sous licence MIT.</p>
    <h2>Références</h2>
    <div class="sources" style="margin-top:0;border:0;padding:0"><ol>${Object.keys(REFS).map((id) => {
      const r = REFS[id];
      const url = refUrl(id);
      return `<li>${esc(r.full)}${url ? ` <a href="${esc(url)}" target="_blank" rel="noopener">${esc(r.doi ? `doi:${r.doi}` : 'lien')}</a>` : ''}</li>`;
    }).join('')}</ol></div>`,
};

// ---------------------------------------------------------------------------------
// HGPO animée
// ---------------------------------------------------------------------------------

const OGTT_STEPS = [
  { at: -2, time: 'Les jours d’avant', icon: 'utensils', title: 'Mangez normalement', text: 'Sans régime particulier ni réduction des féculents : l’OMS demande une alimentation habituelle (plus de 150 g de glucides par jour) pendant au moins 3 jours avant le test.' },
  { at: -1, time: 'La veille au soir', icon: 'moon', title: 'Dîner habituel, puis à jeun', text: 'Ne mangez plus rien pendant 8 à 14 heures. L’eau est autorisée ; pas de café, de boisson sucrée ni de tabac.' },
  { at: 0, time: '0 min', icon: 'drop', title: '1re prise de sang, à jeun', text: 'Au laboratoire, le matin. Prévoyez environ 2 h 15 sur place et de quoi vous occuper.' },
  { at: 2, time: '0 à 5 min', icon: 'coffee', title: 'Boire 75 g de glucose', text: 'Dissous dans 250 à 300 ml d’eau, à boire en 5 minutes. Le temps est compté à partir du début de la prise.' },
  { at: 30, time: 'Pendant 2 heures', icon: 'clock', title: 'Patienter au calme', text: 'Restez au laboratoire, assise, sans manger, sans fumer et sans effort physique : cela pourrait fausser le résultat.' },
  { at: 60, time: '60 min', icon: 'drop', title: '2e prise de sang', text: 'Glycémie 1 heure après le début de la prise.' },
  { at: 120, time: '120 min', icon: 'drop', title: '3e prise de sang', text: 'Glycémie 2 heures après. C’est terminé : vous pouvez manger (pensez à apporter une collation).' },
];

function ogttFigure(minute) {
  const W = 320;
  const x = (m) => 24 + (Math.max(0, Math.min(120, m)) / 120) * (W - 48);
  const drops = [0, 60, 120];
  return `<svg viewBox="0 0 ${W} 120" role="img" aria-label="Frise de l’HGPO, ${Math.max(0, Math.round(minute))} minutes">
    <text class="clock-time" x="${W / 2}" y="34" text-anchor="middle">${minute < 0 ? 'Avant' : `${Math.round(minute)} min`}</text>
    <text class="clock-sub" x="${W / 2}" y="52" text-anchor="middle">${minute < 0 ? 'la préparation' : 'depuis le début de la prise de glucose'}</text>
    <line x1="${x(0)}" x2="${x(120)}" y1="82" y2="82" class="ring-bg" stroke-width="8" stroke-linecap="round"/>
    <line x1="${x(0)}" x2="${x(Math.max(0, minute))}" y1="82" y2="82" class="ring-fg" stroke-width="8" stroke-linecap="round"/>
    <rect x="${x(0)}" y="70" width="${x(5) - x(0)}" height="24" rx="4" fill="var(--accent)" opacity="0.35"/>
    ${drops.map((d) => `<g><circle class="tick ${minute >= d ? 'done' : ''}" cx="${x(d)}" cy="82" r="9"/>
      <text class="clock-sub" x="${x(d)}" y="112" text-anchor="middle">${d === 0 ? 'T0' : d === 60 ? '1 h' : '2 h'}</text></g>`).join('')}
  </svg>`;
}

const MOUNT = {
  hgpo(view) {
    const fig = view.querySelector('[data-ogtt-figure]');
    const steps = [...view.querySelectorAll('[data-step]')];
    let minute = -2;
    let timer = null;
    const paint = () => {
      fig.innerHTML = ogttFigure(minute);
      let active = 0;
      OGTT_STEPS.forEach((s, i) => { if (minute >= s.at) active = i; });
      steps.forEach((el, i) => {
        el.classList.toggle('active', i === active);
        el.classList.toggle('done', i < active);
      });
    };
    const stop = () => { clearInterval(timer); timer = null; };
    // Deux étapes de préparation (0,7 s chacune), puis les 2 heures compressées en ~8 secondes.
    const play = () => {
      stop();
      if (minute >= 120) minute = -2;
      let tick = 0;
      paint();
      timer = setInterval(() => {
        if (!document.body.contains(fig)) return stop();
        tick += 1;
        if (minute < 0) {
          if (tick % 10 === 0) minute += 1;
        } else {
          minute += 1;
        }
        if (minute >= 120) { minute = 120; stop(); }
        paint();
      }, 70);
    };
    view.querySelector('[data-ogtt-play]').addEventListener('click', play);
    view.querySelector('[data-ogtt-reset]').addEventListener('click', () => { stop(); minute = -2; paint(); });
    steps.forEach((el, i) => el.addEventListener('click', () => { stop(); minute = OGTT_STEPS[i].at; paint(); }));
    paint();
  },

  diagnostic(view) {
    const form = view.querySelector('[data-sim]');
    const fields = form.querySelector('[data-simfields]');
    const out = form.querySelector('[data-simresult]');
    let type = 'hgpo';
    const keys = () => (type === 'hgpo' ? [['t0', 'À jeun'], ['t60', 'À 1 heure'], ['t120', 'À 2 heures']] : [['t0', 'Glycémie à jeun']]);
    const drawFields = () => {
      const u = form.unit.value;
      fields.innerHTML = keys().map(([k, label]) => `<label class="field"><span class="label">${label}</span>
        <div class="input-group"><input class="input" name="${k}" inputmode="decimal" placeholder="${UNIT_INFO[u].example}" autocomplete="off"><span class="input-suffix">${u}</span></div></label>`).join('');
      evaluate();
    };
    const evaluate = () => {
      const u = form.unit.value;
      const vals = {};
      for (const [k] of keys()) {
        const n = parseNumber(form[k].value);
        if (n > 0) vals[k] = n;
      }
      if (!Object.keys(vals).length) { out.innerHTML = ''; return; }
      const odd = Object.values(vals).find((n) => guessUnit(n, u).changed);
      const lines = [];
      let positive = false;
      let overt = false;
      for (const [k, label] of keys()) {
        if (!(k in vals)) continue;
        const th = type === 'hgpo' ? DIAGNOSIS.ogtt[k] : DIAGNOSIS.t1Fasting.gdm;
        const hit = compareToThreshold(vals[k], u, th) >= 0;
        if (hit) positive = true;
        if (type === 'gaj' && compareToThreshold(vals[k], u, DIAGNOSIS.t1Fasting.overt) >= 0) overt = true;
        lines.push(`<li>${label} : <strong>${formatValue(vals[k], u)}</strong> — ${hit ? `atteint le seuil (≥ ${v(th, u)})` : `sous le seuil (< ${v(th, u)})`}</li>`);
      }
      const complete = Object.keys(vals).length === keys().length;
      let title;
      let text;
      if (overt) {
        title = 'Valeur compatible avec un diabète présent avant la grossesse';
        text = `Une glycémie à jeun ≥ ${v(DIAGNOSIS.t1Fasting.overt, u)} nécessite un avis médical rapide.`;
      } else if (positive) {
        title = 'Ces résultats correspondent aux critères du diabète gestationnel';
        text = 'Au moins une valeur atteint le seuil. Votre médecin ou sage-femme confirmera le diagnostic et organisera la prise en charge.';
      } else if (complete) {
        title = 'Aucune valeur n’atteint les seuils';
        text = type === 'gaj' ? 'Glycémie à jeun normale à ce stade : si vous avez un facteur de risque, une HGPO est recommandée entre 24 et 28 SA.' : 'Ces résultats ne correspondent pas aux critères du diabète gestationnel.';
      } else {
        title = 'Complétez les valeurs';
        text = 'Aucune des valeurs saisies n’atteint le seuil pour l’instant.';
      }
      out.innerHTML = `<div class="sim-result ${positive || overt ? 'pos' : complete ? 'neg' : ''}">
        <h3>${esc(title)}</h3><ul style="margin:6px 0 8px;padding-left:18px">${lines.join('')}</ul><p class="small">${esc(text)}</p>
        ${odd ? `<p class="small" style="color:var(--warn)">Une valeur semble inhabituelle pour l’unité ${esc(u)} : vérifiez l’unité du compte rendu.</p>` : ''}
        ${complete || positive ? `<div class="btn-row"><button type="button" class="btn btn-secondary btn-sm" data-savetest>${icon('download', { size: 18 })}Enregistrer ce résultat</button></div>` : ''}
      </div>`;
      out.querySelector('[data-savetest]')?.addEventListener('click', async () => {
        saveTest({ type, date: form.date.value, unit: u, values: vals });
        toast('Résultat enregistré dans votre profil');
        const profile = getState().profile;
        if ((positive || overt) && profile.status !== 'gdm' && profile.status !== 't2d') {
          const yes = await confirmDialog({
            title: 'Mettre à jour votre situation ?',
            message: 'Si votre médecin ou sage-femme a confirmé le diagnostic, l’application peut passer en mode « suivi du diabète gestationnel ».',
            confirm: 'Oui, diagnostic confirmé',
            cancel: 'Plus tard',
          });
          if (yes) {
            setProfile({ status: overt ? 't2d' : 'gdm', diagnosisDate: form.date.value || todayISO() });
            location.hash = '#/accueil';
          }
        } else if (!positive && !overt && complete && type === 'hgpo' && profile.status === 'unknown') {
          setProfile({ status: 'negative' });
        }
      });
    };
    form.addEventListener('click', (e) => {
      const b = e.target.closest('[data-simtype]');
      if (!b) return;
      type = b.dataset.simtype;
      form.querySelectorAll('[data-simtype]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      drawFields();
    });
    form.unit.addEventListener('change', drawFields);
    form.addEventListener('input', (e) => { if (e.target.name !== 'unit') evaluate(); });
    drawFields();
  },
};

