// Composants d'interface partagés entre les écrans.
// © 2026 LESACA Julien. Tous droits réservés.
import { REFS, refUrl } from '../guidelines.js';
import { esc, icon } from '../ui.js';

const LEVEL_ICON = { alert: 'alert', warn: 'alert', info: 'info', success: 'check' };

export function refChip(id) {
  const r = REFS[id];
  if (!r) return '';
  const url = refUrl(id);
  return url
    ? `<a class="basis basis-reco" href="${esc(url)}" target="_blank" rel="noopener" title="${esc(r.full)}">${icon('book', { size: 13 })}${esc(r.short)}</a>`
    : `<span class="basis basis-reco" title="${esc(r.full)}">${esc(r.short)}</span>`;
}

export function adviceCard(a) {
  const basis = a.basis === 'app'
    ? `<span class="basis basis-app" title="Repère proposé par l’application, non issu d’une recommandation officielle">${icon('sparkles', { size: 13 })}Repère de l’application</span>`
    : a.refs.map(refChip).join('');
  const extraRefs = a.basis === 'app' && a.refs?.length ? a.refs.map(refChip).join('') : '';
  return `<article class="card advice ${a.level}" data-advice="${esc(a.id)}">
    <div class="advice-head">${icon(LEVEL_ICON[a.level] || 'info')}<h3>${esc(a.title)}</h3></div>
    <div class="advice-body">${a.body}</div>
    ${a.note ? `<p class="advice-note">${esc(a.note)}</p>` : ''}
    <div class="advice-foot">
      <div class="refs">${basis}${extraRefs}</div>
      ${a.action ? `<a class="btn btn-secondary btn-sm" href="${esc(a.action.href)}">${esc(a.action.label)}</a>` : ''}
    </div>
  </article>`;
}

export function sourcesBlock(ids) {
  return `<div class="sources"><h3>Sources</h3><ol>${ids.map((id) => {
    const r = REFS[id];
    const url = refUrl(id);
    return `<li>${esc(r.full)}${url ? ` <a href="${esc(url)}" target="_blank" rel="noopener">${esc(r.doi ? `doi:${r.doi}` : 'lien')}</a>` : ''}</li>`;
  }).join('')}</ol></div>`;
}

export function ring(pct, { size = 92, stroke = 10 } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = pct == null ? 0 : Math.max(0, Math.min(1, pct));
  return `<svg viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--ok-mark)" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${(c * v).toFixed(1)} ${c.toFixed(1)}"/>
  </svg>`;
}
