// Point d'entrée : routage, barre d'onglets, bouton d'ajout et mode hors ligne.
import { load, getState, subscribe } from './store.js';
import { icon, isSheetOpen, closeSheet } from './ui.js';
import { renderHome } from './views/home.js';
import { renderJournal } from './views/journal.js';
import { renderLearnIndex, renderTopic } from './views/learn.js';
import { renderProfile } from './views/profile.js';
import { renderOnboarding, resetOnboarding } from './views/onboarding.js';
import { renderExport } from './views/export.js';
import { openEntry } from './views/entry.js';
import { renderInstall } from './views/install.js';
import { initViewport } from './viewport.js';
import { initInstall, onInstallChange } from './install.js';

const view = document.getElementById('view');
const tabbar = document.getElementById('tabbar');

const TABS = [
  { href: '#/accueil', label: 'Accueil', icon: 'home', match: 'accueil' },
  { href: '#/carnet', label: 'Carnet', icon: 'journal', match: 'carnet' },
  null,
  { href: '#/comprendre', label: 'Comprendre', icon: 'book', match: 'comprendre' },
  { href: '#/profil', label: 'Profil', icon: 'user', match: 'profil' },
];

function renderTabbar(section) {
  tabbar.innerHTML = TABS.map((t) => (t
    ? `<a class="tab" href="${t.href}" ${t.match === section ? 'aria-current="page"' : ''}>${icon(t.icon, { size: 24 })}<span>${t.label}</span></a>`
    : `<button type="button" class="fab" data-fab aria-label="Ajouter une glycémie">${icon('plus', { size: 30 })}</button>`)).join('');
}

tabbar.addEventListener('click', (e) => {
  if (e.target.closest('[data-fab]')) openEntry();
});

function parseRoute() {
  const parts = (location.hash || '#/accueil').replace(/^#\/?/, '').split('/').filter(Boolean);
  return { section: parts[0] || 'accueil', param: parts[1] || null };
}

let lastKey = '';
let pendingReload = false;
const OPEN_BEFORE_ONBOARDING = ['bienvenue', 'comprendre', 'installer'];

function route({ preserveScroll = false } = {}) {
  if (pendingReload && !isSheetOpen()) { location.reload(); return; }
  const st = getState();
  let { section, param } = parseRoute();
  if (!st.onboarded && !OPEN_BEFORE_ONBOARDING.includes(section)) {
    location.replace('#/bienvenue');
    return;
  }
  if (section === 'saisie') {
    history.replaceState(null, '', '#/accueil');
    section = 'accueil';
    setTimeout(() => openEntry(), 0);
  }
  if (isSheetOpen() && !preserveScroll) closeSheet(true);
  const key = `${section}/${param || ''}`;
  const scroll = window.scrollY;
  document.body.classList.toggle('no-tabbar', section === 'bienvenue' || !st.onboarded);
  view.classList.remove('view-enter');
  switch (section) {
    case 'bienvenue':
      if (st.onboarded) { location.replace('#/accueil'); return; }
      renderOnboarding(view);
      break;
    case 'carnet': renderJournal(view); break;
    case 'comprendre': param ? renderTopic(view, param) : renderLearnIndex(view); break;
    case 'profil': renderProfile(view); break;
    case 'export': renderExport(view); break;
    case 'installer': renderInstall(view); break;
    default: section = 'accueil'; renderHome(view);
  }
  renderTabbar({ export: 'carnet', installer: 'profil' }[section] || section);
  if (key !== lastKey) {
    void view.offsetWidth;
    view.classList.add('view-enter');
    window.scrollTo(0, 0);
    view.focus({ preventScroll: true });
  } else if (preserveScroll) {
    window.scrollTo(0, scroll);
  }
  const titles = { accueil: 'Accueil', carnet: 'Carnet', comprendre: 'Comprendre', profil: 'Profil', export: 'Partager', bienvenue: 'Bienvenue', installer: 'Installer' };
  document.title = `${titles[section] || 'Accueil'} · LeSacADiabetGesta`;
  lastKey = key;
}

load();
window.addEventListener('hashchange', () => route());

// Après une saisie ou une modification, on redessine l'écran courant (sauf profil et onboarding,
// qui gèrent eux-mêmes leurs formulaires pour ne pas perdre la saisie en cours).
subscribe(() => {
  const { section } = parseRoute();
  if (!getState().onboarded) {
    if (!OPEN_BEFORE_ONBOARDING.includes(section)) { resetOnboarding(); location.replace('#/bienvenue'); }
    return;
  }
  if (['accueil', 'carnet'].includes(section)) route({ preserveScroll: true });
});

initViewport();
initInstall();
onInstallChange(() => {
  if (parseRoute().section === 'accueil') route({ preserveScroll: true });
});
route();

// Mode hors ligne et mises à jour : quand une nouvelle version prend le relais, on recharge la page
// (sauf pendant une saisie : le rechargement attend la fermeture de la fenêtre).
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || pendingReload) return;
    pendingReload = true;
    if (!isSheetOpen()) location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    }).catch(() => { /* hors ligne indisponible : l'application fonctionne quand même */ });
  });
}
