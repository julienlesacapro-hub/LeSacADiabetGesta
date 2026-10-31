// Profil : informations pré-requises (grossesse, mensurations, antécédents, diagnostic), préférences et données.
import { getState, setProfile, exportBackup, importBackup, resetAll, deleteTest } from '../store.js';
import { RISK_FACTORS, OTHER_FACTORS, STATUSES, TREATMENTS, TARGETS } from '../guidelines.js';
import { pregnancyInfo, formatGA, bmi, bmiCategory, maternalAge } from '../pregnancy.js';
import { UNITS, UNIT_INFO, parseNumber, formatNumber, formatValue, isUnit, makeThreshold } from '../units.js';
import { formatDateShort, todayISO } from '../dates.js';
import { esc, icon, toast, confirmDialog, downloadBlob } from '../ui.js';

export const APP_VERSION = '1.0.0';

function checkbox(name, label, checked, hint = '', type = 'checkbox', value = 'on') {
  return `<label class="check"><input type="${type}" name="${name}" value="${esc(value)}" ${checked ? 'checked' : ''}><span class="box">${icon('check', { size: 16 })}</span><span class="check-text">${label}${hint ? `<small>${hint}</small>` : ''}</span></label>`;
}

export function pregnancyFields(p) {
  return `
    <div class="field"><span class="label">Comment dater la grossesse&nbsp;?</span>
      <select class="select" name="datingMethod">
        <option value="ddg" ${p.datingMethod === 'ddg' ? 'selected' : ''}>Date de début de grossesse (compte rendu d’échographie)</option>
        <option value="ddr" ${p.datingMethod === 'ddr' ? 'selected' : ''}>Premier jour des dernières règles</option>
        <option value="terme" ${p.datingMethod === 'terme' ? 'selected' : ''}>Date prévue du terme</option>
      </select></div>
    <label class="field"><span class="label" data-datinglabel>Date</span><input class="input" type="date" name="datingDate" value="${esc(p.datingDate)}"></label>
    <div class="field" data-convention><span class="label">Convention du terme</span>
      <select class="select" name="termConvention">
        <option value="fr41" ${p.termConvention !== 'int40' ? 'selected' : ''}>41 SA — usage français</option>
        <option value="int40" ${p.termConvention === 'int40' ? 'selected' : ''}>40 SA — usage international</option>
      </select>
      <span class="hint">En France, le terme est habituellement fixé à 41 SA. En cas de doute, utilisez plutôt la date de début de grossesse de l’échographie.</span></div>
    <div class="ga-preview" data-gapreview aria-live="polite"></div>`;
}

export function bodyFields(p) {
  return `
    <label class="field"><span class="label">Prénom <span class="muted small">(facultatif)</span></span><input class="input" name="firstName" autocomplete="given-name" value="${esc(p.firstName)}" maxlength="40"></label>
    <label class="field"><span class="label">Date de naissance</span><input class="input" type="date" name="birthDate" value="${esc(p.birthDate)}" max="${todayISO()}"></label>
    <div class="grid-2" style="margin-top:14px">
      <label class="field"><span class="label">Taille</span><div class="input-group"><input class="input" name="heightCm" inputmode="decimal" value="${p.heightCm ?? ''}" placeholder="165"><span class="input-suffix">cm</span></div></label>
      <label class="field"><span class="label">Poids avant grossesse</span><div class="input-group"><input class="input" name="prePregnancyWeightKg" inputmode="decimal" value="${p.prePregnancyWeightKg != null ? formatNumber(p.prePregnancyWeightKg, p.prePregnancyWeightKg % 1 ? 1 : 0) : ''}" placeholder="62"><span class="input-suffix">kg</span></div></label>
    </div>
    <label class="field"><span class="label">Poids actuel <span class="muted small">(facultatif)</span></span><div class="input-group"><input class="input" name="currentWeightKg" inputmode="decimal" value="${p.currentWeightKg != null ? formatNumber(p.currentWeightKg, p.currentWeightKg % 1 ? 1 : 0) : ''}" placeholder="68"><span class="input-suffix">kg</span></div></label>
    <div class="ga-preview" data-bmipreview aria-live="polite"></div>`;
}

export function historyFields(p) {
  return `
    ${RISK_FACTORS.filter((r) => !r.auto).map((r) => checkbox(`riskFactors.${r.id}`, esc(r.label), p.riskFactors?.[r.id])).join('')}
    ${OTHER_FACTORS.map((r) => checkbox(`riskFactors.${r.id}`, esc(r.label), p.riskFactors?.[r.id], 'Situation à signaler à votre soignant')).join('')}
    <p class="tiny muted" style="margin-top:10px">L’âge (35 ans ou plus) et l’IMC (25 ou plus) sont calculés automatiquement.</p>`;
}

export function statusFields(p) {
  return `
    ${STATUSES.map((s) => checkbox('status', esc(s.label), p.status === s.id, '', 'radio', s.id)).join('')}
    <div data-diagbox ${p.status === 'gdm' || p.status === 't2d' ? '' : 'hidden'}>
      <label class="field" style="margin-top:14px"><span class="label">Date du diagnostic</span><input class="input" type="date" name="diagnosisDate" value="${esc(p.diagnosisDate)}" max="${todayISO()}"></label>
      <label class="field"><span class="label">Prise en charge actuelle</span><select class="select" name="treatment">${TREATMENTS.map((t) => `<option value="${t.id}" ${p.treatment === t.id ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}</select></label>
    </div>`;
}

export function unitFields(p) {
  return `
    <div class="field"><span class="label">Unité de votre lecteur ou du laboratoire</span>
      <div class="seg" role="radiogroup" aria-label="Unité">${UNITS.map((u) => `<button type="button" role="radio" data-setunit="${u}" aria-pressed="${p.unit === u}" aria-checked="${p.unit === u}">${u}</button>`).join('')}</div>
      <span class="hint">Exemple d’objectif à jeun : ${UNITS.map((u) => formatValue(TARGETS.fasting[u], u)).join(' = ')}. Vous pourrez toujours saisir une valeur dans une autre unité : la conversion est automatique.</span></div>`;
}

/** Lit les champs d'un formulaire et construit un « patch » de profil. */
export function collectProfile(form, current) {
  const patch = {};
  const rf = { ...current.riskFactors };
  const num = (name) => {
    const el = form.elements[name];
    if (!el) return undefined;
    const n = parseNumber(el.value);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.name.startsWith('riskFactors.')) rf[el.name.split('.')[1]] = el.checked;
  }
  patch.riskFactors = rf;
  for (const name of ['firstName', 'birthDate', 'datingMethod', 'datingDate', 'termConvention', 'diagnosisDate', 'treatment', 'deliveryDate', 'careTeam']) {
    const el = form.elements[name];
    if (el) patch[name] = el.value.trim();
  }
  for (const name of ['heightCm', 'prePregnancyWeightKg', 'currentWeightKg']) {
    const n = num(name);
    if (n !== undefined) patch[name] = n;
  }
  const status = form.querySelector('input[name="status"]:checked');
  if (status) patch.status = status.value;
  if (form.elements.postprandialDelay) patch.postprandialDelay = Number(form.elements.postprandialDelay.value) === 60 ? 60 : 120;
  if (form.elements.useCustom) {
    const unit = current.unit;
    if (form.elements.useCustom.checked) {
      const f = num('customFasting');
      const p = num('customPost');
      patch.customTargets = {
        fasting: f ? { value: f, unit } : null,
        post: p ? { value: p, unit } : null,
      };
    } else {
      patch.customTargets = { fasting: null, post: null };
    }
  }
  return patch;
}

export function refreshPreviews(root, profile) {
  const ga = root.querySelector('[data-gapreview]');
  if (ga) {
    const info = pregnancyInfo(profile);
    ga.hidden = false;
    if (!info) ga.textContent = 'Indiquez une date pour calculer l’âge gestationnel.';
    else if (!info.valid) ga.textContent = 'La date semble incohérente : vérifiez-la.';
    else ga.textContent = `Aujourd’hui : ${formatGA({ weeks: info.weeks, extraDays: info.extraDays })} · terme prévu le ${formatDateShort(info.term)} · HGPO entre le ${formatDateShort(info.ogttFrom)} et le ${formatDateShort(info.ogttTo)}`;
  }
  const label = root.querySelector('[data-datinglabel]');
  if (label) {
    label.textContent = { ddg: 'Date de début de grossesse', ddr: 'Premier jour des dernières règles', terme: 'Date prévue du terme' }[profile.datingMethod] || 'Date';
  }
  const b = root.querySelector('[data-bmipreview]');
  if (b) {
    const value = bmi(profile.heightCm, profile.prePregnancyWeightKg);
    const cat = bmiCategory(value);
    const age = maternalAge(profile);
    b.hidden = value == null && age == null;
    b.textContent = [age != null ? `${age} ans` : '', value != null ? `IMC avant grossesse : ${formatNumber(value, 1)} kg/m² (${cat.label.toLowerCase()})` : ''].filter(Boolean).join(' · ');
  }
  const diag = root.querySelector('[data-diagbox]');
  if (diag) diag.hidden = !(profile.status === 'gdm' || profile.status === 't2d');
  const custom = root.querySelector('[data-custombox]');
  if (custom && root.querySelector('[name="useCustom"]')) custom.hidden = !root.querySelector('[name="useCustom"]').checked;
}

export function renderProfile(view) {
  const st = getState();
  const p = st.profile;
  const unit = p.unit;
  const cf = p.customTargets?.fasting && isUnit(p.customTargets.fasting.unit) ? makeThreshold(p.customTargets.fasting.value, p.customTargets.fasting.unit)[unit] : null;
  const cp = p.customTargets?.post && isUnit(p.customTargets.post.unit) ? makeThreshold(p.customTargets.post.value, p.customTargets.post.unit)[unit] : null;
  const useCustom = cf != null || cp != null;
  const tests = st.tests || [];

  view.innerHTML = `
    <header class="page-head"><div class="eyebrow">Vos informations</div><h1>Profil</h1>
      <p class="muted small" style="margin-top:6px">Ces informations personnalisent les repères et les conseils. Elles restent sur ce téléphone.</p></header>
    <form data-profile novalidate>
      <h2 class="section-title">Ma grossesse</h2>
      <section class="card">${pregnancyFields(p)}
        <label class="field" style="margin-top:14px"><span class="label">Date de l’accouchement <span class="muted small">(après la naissance)</span></span><input class="input" type="date" name="deliveryDate" value="${esc(p.deliveryDate)}" max="${todayISO()}"></label>
      </section>

      <h2 class="section-title">Moi</h2>
      <section class="card">${bodyFields(p)}</section>

      <h2 class="section-title">Mes antécédents</h2>
      <section class="card">${historyFields(p)}</section>

      <h2 class="section-title">Ma situation</h2>
      <section class="card">${statusFields(p)}
        ${tests.length ? `<div style="margin-top:16px"><span class="label" style="font-weight:600;font-size:14.5px">Résultats enregistrés</span>
          ${tests.map((t) => `<div class="row-between small" style="padding:8px 0;border-bottom:1px solid var(--border)">
            <span>${t.type === 'hgpo' ? 'HGPO' : 'Glycémie à jeun'}${t.date ? ` du ${formatDateShort(t.date)}` : ''} : ${['t0', 't60', 't120'].filter((k) => t.values[k]).map((k) => formatValue(t.values[k], t.unit)).join(' / ')}</span>
            <button type="button" class="btn btn-ghost btn-sm" data-deltest="${t.id}" aria-label="Supprimer ce résultat">${icon('trash', { size: 18 })}</button></div>`).join('')}</div>` : ''}
        <a class="btn btn-secondary btn-sm" style="margin-top:14px" href="#/comprendre/diagnostic">${icon('flask', { size: 18 })}Saisir un résultat de test</a>
      </section>

      <h2 class="section-title">Mesures et objectifs</h2>
      <section class="card">
        ${unitFields(p)}
        <div class="field" style="margin-top:16px"><span class="label">Mesure après le repas</span>
          <select class="select" name="postprandialDelay">
            <option value="120" ${p.postprandialDelay !== 60 ? 'selected' : ''}>2 heures après le début du repas (objectif &lt; ${formatValue(TARGETS.post120[unit], unit)})</option>
            <option value="60" ${p.postprandialDelay === 60 ? 'selected' : ''}>1 heure après le début du repas (objectif &lt; ${formatValue(TARGETS.post60[unit], unit)})</option>
          </select></div>
        <div style="margin-top:16px">${checkbox('useCustom', 'Mon équipe m’a fixé d’autres objectifs', useCustom, 'Ils remplacent les objectifs par défaut dans toute l’application')}</div>
        <div data-custombox ${useCustom ? '' : 'hidden'}>
          <div class="grid-2" style="margin-top:12px">
            <label class="field"><span class="label">À jeun, inférieur à</span><div class="input-group"><input class="input" name="customFasting" inputmode="decimal" value="${cf != null ? formatNumber(cf, UNIT_INFO[unit].decimals) : ''}" placeholder="${formatNumber(TARGETS.fasting[unit], UNIT_INFO[unit].decimals)}"><span class="input-suffix">${unit}</span></div></label>
            <label class="field"><span class="label">Après repas, inférieur à</span><div class="input-group"><input class="input" name="customPost" inputmode="decimal" value="${cp != null ? formatNumber(cp, UNIT_INFO[unit].decimals) : ''}" placeholder="${formatNumber((p.postprandialDelay === 60 ? TARGETS.post60 : TARGETS.post120)[unit], UNIT_INFO[unit].decimals)}"><span class="input-suffix">${unit}</span></div></label>
          </div>
        </div>
        <label class="field" style="margin-top:16px"><span class="label">Équipe soignante <span class="muted small">(facultatif, figure sur le PDF)</span></span><input class="input" name="careTeam" value="${esc(p.careTeam)}" maxlength="120" placeholder="Ex. : Dr Martin, maternité…"></label>
      </section>
    </form>

    <h2 class="section-title">Mes données</h2>
    <section class="card settings-group">
      <a class="setting" href="#/export"><span class="s-ico">${icon('share', { size: 20 })}</span><span class="s-text"><strong>Partager mon suivi</strong><span>PDF et fichier Excel (CSV)</span></span>${icon('chevronRight', { size: 18 })}</a>
      <button type="button" class="setting" data-backup><span class="s-ico">${icon('download', { size: 20 })}</span><span class="s-text"><strong>Sauvegarder</strong><span>Fichier de sauvegarde complet (.json)</span></span></button>
      <label class="setting" style="cursor:pointer"><span class="s-ico">${icon('upload', { size: 20 })}</span><span class="s-text"><strong>Restaurer une sauvegarde</strong><span>Remplace les données actuelles</span></span><input type="file" accept="application/json,.json" data-restore hidden></label>
      <button type="button" class="setting danger" data-reset><span class="s-ico">${icon('trash', { size: 20 })}</span><span class="s-text"><strong>Tout effacer</strong><span>Supprime toutes les données de ce téléphone</span></span></button>
    </section>

    <h2 class="section-title">À propos</h2>
    <section class="card settings-group">
      <a class="setting" href="#/comprendre/sources"><span class="s-ico">${icon('book', { size: 20 })}</span><span class="s-text"><strong>Sources, limites et confidentialité</strong><span>Références médicales utilisées</span></span>${icon('chevronRight', { size: 18 })}</a>
      <div class="setting"><span class="s-ico">${icon('shield', { size: 20 })}</span><span class="s-text"><strong>LeSacADiabetGesta ${APP_VERSION}</strong><span>Outil d’information et de suivi personnel. Ne remplace pas un avis médical.</span></span></div>
    </section>`;

  const form = view.querySelector('[data-profile]');
  const save = () => {
    const patch = collectProfile(form, getState().profile);
    setProfile(patch);
    refreshPreviews(view, getState().profile);
  };
  form.addEventListener('change', (e) => {
    save();
    if (e.target.name === 'status' || e.target.name === 'useCustom') refreshPreviews(view, getState().profile);
    toast('Profil enregistré', { duration: 1400 });
  });
  form.addEventListener('input', (e) => {
    if (['datingDate', 'heightCm', 'prePregnancyWeightKg', 'birthDate'].includes(e.target.name)) {
      refreshPreviews(view, { ...getState().profile, ...collectProfile(form, getState().profile) });
    }
  });
  view.querySelectorAll('[data-setunit]').forEach((b) => b.addEventListener('click', () => {
    // Les objectifs personnalisés sont conservés dans leur unité d'origine.
    setProfile({ unit: b.dataset.setunit });
    renderProfile(view);
    toast(`Unité d’affichage : ${b.dataset.setunit}`, { duration: 1600 });
  }));
  view.querySelectorAll('[data-deltest]').forEach((b) => b.addEventListener('click', async () => {
    if (await confirmDialog({ title: 'Supprimer ce résultat ?', message: 'Le résultat de test sera retiré de votre profil.', confirm: 'Supprimer', danger: true })) {
      deleteTest(b.dataset.deltest);
      renderProfile(view);
    }
  }));
  view.querySelector('[data-backup]').addEventListener('click', () => {
    downloadBlob(new Blob([exportBackup()], { type: 'application/json' }), `LeSacADiabetGesta_sauvegarde_${todayISO()}.json`);
    toast('Sauvegarde créée');
  });
  view.querySelector('[data-restore]').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await confirmDialog({ title: 'Restaurer la sauvegarde ?', message: 'Les données actuelles de ce téléphone seront remplacées.', confirm: 'Restaurer' });
    if (!ok) return;
    try {
      const s = importBackup(await file.text());
      toast(`Sauvegarde restaurée : ${s.readings.length} mesures`);
      renderProfile(view);
    } catch (err) {
      toast(err.message || 'Fichier illisible');
    }
  });
  view.querySelector('[data-reset]').addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Tout effacer ?', message: 'Toutes vos mesures et informations seront supprimées de ce téléphone. Pensez à faire une sauvegarde avant.', confirm: 'Tout effacer', danger: true });
    if (!ok) return;
    resetAll();
    location.hash = '#/bienvenue';
  });
  refreshPreviews(view, p);
}

