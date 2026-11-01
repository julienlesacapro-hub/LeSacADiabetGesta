// Écran d'accueil : situation, mesures du jour, synthèse de la semaine et conseils personnalisés.
// © 2026 LESACA Julien. Tous droits réservés.
import { getState } from '../store.js';
import { MAIN_MOMENTS, STATUSES, TREATMENTS } from '../guidelines.js';
import { buildAdvice } from '../advice.js';
import { computeStats, evaluateReading, lastDays, resolveTargets } from '../analysis.js';
import { pregnancyInfo, formatGA } from '../pregnancy.js';
import { formatMgdl, formatNumber } from '../units.js';
import { formatDateLong, formatDateShort, formatTime, todayISO, tsDate } from '../dates.js';
import { esc, icon, statusMark } from '../ui.js';
import { adviceCard, ring } from './components.js';
import { openEntry } from './entry.js';
import { bannerDismissed, canPromptInstall, dismissBanner, isStandalone, promptInstall } from '../install.js';

const MOMENT_ICONS = { fasting: 'sunrise', post_breakfast: 'coffee', post_lunch: 'utensils', post_dinner: 'moon' };

/** Les conseils importants sont toujours visibles ; les autres sont regroupés pour garder l'accueil lisible. */
function adviceSection(advice) {
  if (!advice.length) return '';
  const important = advice.filter((a) => a.level !== 'info');
  const info = advice.filter((a) => a.level === 'info');
  const shownInfo = info.slice(0, Math.max(1, 3 - important.length));
  const rest = info.slice(shownInfo.length);
  return `<h2 class="section-title">Pour vous</h2>
    ${[...important, ...shownInfo].map(adviceCard).join('')}
    ${rest.length ? `<details class="more-advice"><summary>Voir ${rest.length} autre${rest.length > 1 ? 's' : ''} conseil${rest.length > 1 ? 's' : ''}${icon('chevronDown', { size: 18 })}</summary>${rest.map(adviceCard).join('')}</details>` : ''}`;
}

export function renderHome(view) {
  const st = getState();
  const { profile, readings } = st;
  const unit = profile.unit;
  const today = todayISO();
  const preg = pregnancyInfo(profile, today);
  const targets = resolveTargets(profile);
  const diagnosed = profile.status === 'gdm' || profile.status === 't2d';
  const todays = readings.filter((r) => tsDate(r.ts) === today);
  const week = lastDays(readings, 7, today);
  const stats = computeStats(week, profile);
  const advice = buildAdvice(st, today);
  const statusLabel = STATUSES.find((s) => s.id === profile.status)?.short;
  const treatment = diagnosed ? TREATMENTS.find((t) => t.id === profile.treatment)?.label : null;

  let pregBlock = '';
  if (preg?.delivered) {
    pregBlock = `<div class="pills" style="margin-top:12px"><span class="pill pill-primary">${icon('baby', { size: 16 })}Né(e) le ${formatDateShort(profile.deliveryDate)}</span></div>`;
  } else if (preg && preg.valid) {
    const pct = Math.min(1, preg.days / (preg.days + Math.max(0, (Date.parse(preg.term) - Date.parse(today)) / 86400000)));
    pregBlock = `
      <div class="pills" style="margin-top:12px">
        <span class="pill pill-primary">${icon('heart', { size: 16 })}${formatGA({ weeks: preg.weeks, extraDays: preg.extraDays })}</span>
        <span class="pill">${icon('calendar', { size: 16 })}Terme : ${formatDateShort(preg.term)}</span>
        ${statusLabel ? `<span class="pill ${diagnosed ? 'pill-warn' : ''}">${esc(statusLabel)}</span>` : ''}
      </div>
      <div class="preg-bar" aria-label="Avancement de la grossesse">
        <div class="preg-track"><div class="preg-fill" style="width:${(pct * 100).toFixed(1)}%"></div></div>
        <div class="preg-legend"><span>Début</span><span>${preg.weeks} SA</span><span>Terme</span></div>
      </div>`;
  } else {
    pregBlock = `<div class="pills" style="margin-top:12px"><a class="pill pill-primary" href="#/profil">${icon('calendar', { size: 16 })}Indiquer ma date de grossesse</a></div>`;
  }

  const slots = MAIN_MOMENTS.map((m) => {
    const list = todays.filter((r) => r.moment === m.id);
    const last = list[list.length - 1];
    if (!last) {
      return `<button type="button" class="slot slot-empty" data-add="${m.id}">
        <span class="slot-label">${icon(MOMENT_ICONS[m.id])}${esc(m.short)}</span>
        <span class="slot-value">${icon('plus', { size: 18 })}Ajouter</span>
        <span class="slot-time">&nbsp;</span>
      </button>`;
    }
    const ev = evaluateReading(last, targets);
    return `<button type="button" class="slot is-${ev.status}" data-edit="${last.id}" aria-label="${esc(`${m.label} : ${formatMgdl(last.mgdl, unit)}`)}">
      <span class="slot-label">${icon(MOMENT_ICONS[m.id])}${esc(m.short)}</span>
      <span class="slot-value">${statusMark(ev.status, 13)}${formatMgdl(last.mgdl, unit, { withUnit: false })}<small>${esc(unit)}</small></span>
      <span class="slot-time">${formatTime(last.ts)}${list.length > 1 ? ` · ${list.length} mesures` : ''}</span>
    </button>`;
  }).join('');

  const o = stats.overall;
  const weekCard = o.n
    ? `<section class="card">
        <div class="card-head"><h2>7 derniers jours</h2><a class="card-link" href="#/carnet">Carnet${icon('chevronRight', { size: 18 })}</a></div>
        <div class="kpi">
          <div class="kpi-ring">${ring(o.pctOk)}<div class="val">${o.pctOk == null ? '–' : `${formatNumber(o.pctOk * 100)}%`}</div></div>
          <div class="kpi-lines">
            <span><strong>${o.n}</strong> mesure${o.n > 1 ? 's' : ''} sur ${stats.dayCount} jour${stats.dayCount > 1 ? 's' : ''}</span>
            <span>${statusMark('ok', 11)} <strong>${o.ok}</strong> dans l’objectif</span>
            <span>${statusMark('high', 11)} <strong>${o.high}</strong> au-dessus</span>
            ${o.low ? `<span>${statusMark('low', 11)} <strong>${o.low}</strong> basse${o.low > 1 ? 's' : ''}</span>` : ''}
          </div>
        </div>
        <div class="mbars">
          ${MAIN_MOMENTS.map((m) => {
            const b = stats.perMoment[m.id];
            const tot = b.evaluated || 1;
            return `<div class="mbar"><span>${esc(m.short)}</span>
              <div class="mbar-track" role="img" aria-label="${esc(`${m.label} : ${b.ok} dans l’objectif, ${b.high} au-dessus, ${b.low} basses`)}">
                ${b.ok ? `<span class="mbar-ok" style="width:${(b.ok / tot) * 100}%"></span>` : ''}
                ${b.high ? `<span class="mbar-high" style="width:${(b.high / tot) * 100}%"></span>` : ''}
                ${b.low ? `<span class="mbar-low" style="width:${(b.low / tot) * 100}%"></span>` : ''}
              </div>
              <span class="mbar-val">${b.evaluated ? `${b.ok}/${b.evaluated}` : '–'}</span></div>`;
          }).join('')}
        </div>
        <p class="tiny muted" style="margin-top:12px">Objectifs : à jeun &lt; ${formatMgdl(targets.fasting['mg/dL'], unit)} · ${targets.delay === 60 ? '1 h' : '2 h'} après le repas &lt; ${formatMgdl(targets.post['mg/dL'], unit)}${targets.custom.fasting || targets.custom.post ? ' (personnalisés)' : ''}</p>
      </section>`
    : '';

  const todayCard = `<section class="card">
      <div class="card-head"><h2>Aujourd’hui</h2>${todays.length ? `<span class="tiny muted">${todays.length} mesure${todays.length > 1 ? 's' : ''}</span>` : ''}</div>
      ${diagnosed || readings.length ? '' : '<p class="small muted" style="margin-top:-6px">Notez vos glycémies si votre équipe vous l’a demandé.</p>'}
      <div class="slots">${slots}</div>
    </section>`;

  const name = profile.firstName ? `Bonjour ${esc(profile.firstName)}` : 'Bonjour';
  // Bandeau d'installation : uniquement dans le navigateur, tant qu'il n'a pas été masqué.
  const showInstall = !isStandalone() && !bannerDismissed();
  const installBanner = showInstall
    ? `<section class="card install-banner" data-installbanner>
        <span class="ib-ico">${icon('download')}</span>
        <span class="ib-text"><strong>Installer l’application</strong>Accès en un geste, plein écran, hors connexion.</span>
        ${canPromptInstall()
          ? '<button type="button" class="btn btn-primary btn-sm" data-installnow>Installer</button>'
          : '<a class="btn btn-secondary btn-sm" href="#/installer">Comment ?</a>'}
        <button type="button" class="icon-btn" data-installhide aria-label="Masquer">${icon('x', { size: 18 })}</button>
      </section>`
    : '';
  view.innerHTML = `
    ${installBanner}
    <header class="page-head">
      <div class="eyebrow">${esc(formatDateLong(today, { year: false }))}</div>
      <h1 class="hello">${name}</h1>
      ${treatment ? `<p class="small muted" style="margin-top:4px">Prise en charge : ${esc(treatment.toLowerCase())}</p>` : ''}
      ${pregBlock}
    </header>
    ${diagnosed ? todayCard + weekCard : ''}
    ${adviceSection(advice)}
    ${diagnosed ? '' : todayCard + weekCard}
    <p class="disclaimer">${icon('shield', { size: 14, cls: 'inline' })} Vos données restent sur ce téléphone. Cette application ne remplace pas l’avis de votre équipe soignante.</p>
  `;

  view.querySelector('[data-installnow]')?.addEventListener('click', async () => {
    if ((await promptInstall()) === 'unavailable') location.hash = '#/installer';
  });
  view.querySelector('[data-installhide]')?.addEventListener('click', () => {
    dismissBanner();
    view.querySelector('[data-installbanner]')?.remove();
  });
  view.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => openEntry({ moment: b.dataset.add })));
  view.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => {
    const r = getState().readings.find((x) => x.id === b.dataset.edit);
    if (r) openEntry({ reading: r });
  }));
}
