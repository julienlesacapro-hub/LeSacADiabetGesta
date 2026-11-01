// Premier lancement : avertissement, puis recueil des informations pré-requises en 5 étapes courtes.
import { getState, setProfile, update, requestPersistence, importBackup } from '../store.js';
import { isStandalone } from '../install.js';
import { activeRiskFactors } from '../pregnancy.js';
import { RISK_FACTORS } from '../guidelines.js';
import { esc, icon, toast } from '../ui.js';
import { pregnancyFields, bodyFields, historyFields, statusFields, unitFields, collectProfile, refreshPreviews } from './profile.js';

const STEPS = [
  { id: 'welcome' },
  { id: 'pregnancy', title: 'Votre grossesse', lead: 'Pour calculer l’âge gestationnel (en semaines d’aménorrhée, SA) et les dates de dépistage.' },
  { id: 'body', title: 'Vous', lead: 'L’âge et l’IMC avant grossesse font partie des facteurs de risque et orientent les repères de prise de poids.' },
  { id: 'history', title: 'Vos antécédents', lead: 'Cochez ce qui vous concerne. Ces critères servent à savoir si un dépistage est recommandé.' },
  { id: 'status', title: 'Où en êtes-vous ?', lead: 'L’application adapte ses conseils à votre situation. Vous pourrez la modifier à tout moment.' },
  { id: 'unit', title: 'Vos glycémies', lead: 'Choisissez l’unité de votre lecteur de glycémie ou de votre laboratoire.' },
];

let step = 0;

export function renderOnboarding(view) {
  const st = getState();
  const p = st.profile;
  const s = STEPS[step];
  if (s.id === 'welcome') {
    view.innerHTML = `<div class="onb view-enter">
      <div class="brand"><img class="brand-logo" src="assets/icons/icon-192.png" alt="" width="56" height="56"><div class="brand-name">LeSacADiabetGesta<small>Diabète gestationnel</small></div></div>
      <div class="onb-body">
        <h1 class="welcome-hero">Votre grossesse, en toute sérénité.</h1>
        <p class="muted">Un compagnon simple pour comprendre le diabète gestationnel, préparer le dépistage et suivre vos glycémies.</p>
        <div class="welcome-list">
          <div class="welcome-item"><span class="w-ico">${icon('book')}</span><div><strong>Comprendre</strong><span>Facteurs de risque, prévention, tests et critères de diagnostic, avec leurs sources.</span></div></div>
          <div class="welcome-item"><span class="w-ico">${icon('drop')}</span><div><strong>Noter en 3 secondes</strong><span>Dans n’importe quelle unité : g/L, mg/dL ou mmol/L. Conversions automatiques.</span></div></div>
          <div class="welcome-item"><span class="w-ico">${icon('chart')}</span><div><strong>Suivre et partager</strong><span>Tableau, courbes avec objectifs et dépassements, export PDF et Excel.</span></div></div>
          <div class="welcome-item"><span class="w-ico">${icon('lock')}</span><div><strong>Vos données restent sur votre téléphone</strong><span>Aucun compte, aucun envoi sur Internet.</span></div></div>
        </div>
        <div class="callout warn">${icon('alert')}<p>Cette application est un outil d’information et de suivi personnel. Elle <strong>ne remplace pas</strong> l’avis de votre médecin, sage-femme ou diabétologue, et ne pose pas de diagnostic. En cas de malaise ou d’inquiétude, contactez votre équipe ou le 15.</p></div>
      </div>
      <div class="onb-foot"><button type="button" class="btn btn-primary" data-next>J’ai compris, commencer${icon('chevronRight', { size: 20 })}</button></div>
      <div class="row wrap" style="justify-content:center;margin-top:10px">
        ${isStandalone() ? '' : `<a class="btn btn-ghost btn-sm" href="#/installer">${icon('download', { size: 18 })}Installer l’application</a>`}
        <label class="btn btn-ghost btn-sm" style="cursor:pointer">${icon('upload', { size: 18 })}Restaurer une sauvegarde<input type="file" accept="application/json,.json" data-restore hidden></label>
      </div>
    </div>`;
    view.querySelector('[data-restore]').addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const s = importBackup(await file.text());
        update((x) => { x.onboarded = true; x.disclaimerAcceptedAt = x.disclaimerAcceptedAt || new Date().toISOString(); });
        toast(`Sauvegarde restaurée : ${s.readings.length} mesure${s.readings.length > 1 ? 's' : ''}`);
        location.hash = '#/accueil';
      } catch (err) {
        toast(err.message || 'Fichier illisible');
      }
    });
    view.querySelector('[data-next]').addEventListener('click', () => {
      update((x) => { x.disclaimerAcceptedAt = new Date().toISOString(); });
      requestPersistence();
      step = 1;
      renderOnboarding(view);
    });
    return;
  }

  const fields = {
    pregnancy: pregnancyFields(p),
    body: bodyFields(p),
    history: historyFields(p),
    status: statusFields(p),
    unit: unitFields(p),
  }[s.id];
  const last = step === STEPS.length - 1;
  view.innerHTML = `<form class="onb view-enter" novalidate>
    <div class="onb-progress" aria-label="Étape ${step} sur ${STEPS.length - 1}">${STEPS.slice(1).map((_, i) => `<span class="${i < step ? 'on' : ''}"></span>`).join('')}</div>
    <div class="onb-body">
      <h1>${esc(s.title)}</h1>
      <p class="muted" style="margin:8px 0 20px">${esc(s.lead)}</p>
      ${fields}
      ${s.id === 'history' ? '<div class="ga-preview" data-rfsummary></div>' : ''}
    </div>
    <div class="onb-foot">
      <button type="button" class="btn btn-secondary" data-prev aria-label="Étape précédente">${icon('chevronLeft')}</button>
      <button type="submit" class="btn btn-primary">${last ? 'Terminer' : 'Continuer'}${icon(last ? 'check' : 'chevronRight', { size: 20 })}</button>
    </div>
    ${last ? '' : '<button type="button" class="btn btn-ghost btn-block" data-skip style="margin-top:8px">Passer cette étape</button>'}
  </form>`;

  const form = view.querySelector('form');
  const sync = () => {
    setProfile(collectProfile(form, getState().profile));
    const prof = getState().profile;
    refreshPreviews(view, prof);
    const rs = view.querySelector('[data-rfsummary]');
    if (rs) {
      const n = activeRiskFactors(prof);
      rs.textContent = n.length
        ? `${n.length} facteur${n.length > 1 ? 's' : ''} de risque : ${n.map((id) => RISK_FACTORS.find((r) => r.id === id).label.toLowerCase()).join(', ')}.`
        : 'Aucun facteur de risque pour l’instant.';
    }
  };
  form.addEventListener('change', sync);
  form.addEventListener('input', (e) => { if (e.target.type !== 'radio' && e.target.type !== 'checkbox') sync(); });
  view.querySelectorAll('[data-setunit]').forEach((b) => b.addEventListener('click', () => {
    setProfile({ unit: b.dataset.setunit });
    view.querySelectorAll('[data-setunit]').forEach((x) => { x.setAttribute('aria-pressed', String(x === b)); x.setAttribute('aria-checked', String(x === b)); });
  }));
  const go = (delta) => {
    sync();
    step += delta;
    if (step >= STEPS.length) {
      update((x) => { x.onboarded = true; });
      step = 0;
      location.hash = '#/accueil';
      return;
    }
    if (step < 0) step = 0;
    renderOnboarding(view);
    window.scrollTo(0, 0);
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); go(1); });
  view.querySelector('[data-prev]').addEventListener('click', () => go(-1));
  view.querySelector('[data-skip]')?.addEventListener('click', () => go(1));
  sync();
}

export function resetOnboarding() {
  step = 0;
}
