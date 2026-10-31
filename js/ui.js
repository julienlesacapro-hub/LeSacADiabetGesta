// Petits utilitaires d'interface : échappement, icônes, feuilles modales, notifications.

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function $(sel, root = document) {
  return root.querySelector(sel);
}

export function $$(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

// Icônes au trait (24×24), dessinées pour l'application.
const P = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  journal: '<rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path d="M3.5 9h17M9 9v11M15 9v11"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M8 7h8M8 10.5h6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  share: '<path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  chevronRight: '<path d="m9 5 7 7-7 7"/>',
  chevronLeft: '<path d="m15 5-7 7 7 7"/>',
  chevronDown: '<path d="m5 9 7 7 7-7"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  alert: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.1"/>',
  drop: '<path d="M12 3s6.5 7 6.5 11.5A6.5 6.5 0 0 1 5.5 14.5C5.5 10 12 3 12 3z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  sunrise: '<path d="M4 18h16M7 14a5 5 0 0 1 10 0"/><path d="M12 3v4M5.2 7.6l1.8 1.8M18.8 7.6 17 9.4M2.5 14H4.5M19.5 14h2"/>',
  coffee: '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5v2.5M12 3.5v2.5"/>',
  utensils: '<path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10"/><path d="M17 3c-2 1.5-2.5 4-2.5 7h2.5v11"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3"/>',
  download: '<path d="M12 3v12M7.5 10.5 12 15l4.5-4.5"/><path d="M5 19h14"/>',
  upload: '<path d="M12 15V3M7.5 7.5 12 3l4.5 4.5"/><path d="M5 19h14"/>',
  chart: '<path d="M4 4v16h16"/><path d="m7 15 4-5 3 3 5-6"/>',
  table: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"/>',
  walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="m9 21 2.5-6.5L14 17v4M8 11l3-3.5 3 1.5 2 3.5M11.5 14.5 11 8"/>',
  apple: '<path d="M12 7.5c-1.5-1-5-1.3-6.5 1.5S5 16 7.5 19c1.4 1.7 2.8 1.6 4.5.8 1.7.8 3.1.9 4.5-.8 2.5-3 3.5-7.2 2-10S13.5 6.5 12 7.5z"/><path d="M12 7.5c0-2 1-3.5 3-4"/>',
  flask: '<path d="M9 3h6M10 3v6l-5.5 9.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7.5 15h9"/>',
  syringe: '<path d="m18 2 4 4M16 4l4 4M19 7l-9.5 9.5-3-3L16 4"/><path d="M6.5 13.5 3 17l4 4 3.5-3.5M9 11l2 2M12 8l2 2"/>',
  sparkles: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  sheet: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M8.5 12h7v6h-7zM8.5 15h7M12 12v6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  baby: '<circle cx="12" cy="8.5" r="5"/><path d="M10 8.5h.01M14 8.5h.01M10.5 11a2 2 0 0 0 3 0"/><path d="M7 21c0-2.8 2.2-5 5-5s5 2.2 5 5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  scale: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8.5 9a5 5 0 0 1 7 0l-2.5 3"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
};

export function icon(name, { size = 22, cls = '' } = {}) {
  const p = P[name] || P.info;
  return `<svg class="ico ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${p}</svg>`;
}

/** Marqueur d'état (forme + couleur) : rond = objectif, triangle haut = au-dessus, triangle bas = basse. */
export function statusMark(status, size = 12) {
  const s = size;
  if (status === 'high') return `<svg class="mark mark-high" width="${s}" height="${s}" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.2 11 10.5H1z"/></svg>`;
  if (status === 'low' || status === 'verylow') return `<svg class="mark mark-low" width="${s}" height="${s}" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 10.8 11 1.5H1z"/></svg>`;
  if (status === 'ok') return `<svg class="mark mark-ok" width="${s}" height="${s}" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.8"/></svg>`;
  return `<svg class="mark mark-none" width="${s}" height="${s}" viewBox="0 0 12 12" aria-hidden="true"><rect x="1.5" y="1.5" width="9" height="9" rx="2"/></svg>`;
}

// --- Notifications ---------------------------------------------------------------

export function toast(message, { action, onAction, duration = 3200 } = {}) {
  const root = document.getElementById('toast-root');
  // Une seule notification à la fois.
  root.querySelectorAll('.toast').forEach((t) => t.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span>${esc(message)}</span>${action ? `<button type="button" class="toast-action">${esc(action)}</button>` : ''}`;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const close = () => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
  };
  if (action) el.querySelector('.toast-action').addEventListener('click', () => { onAction?.(); close(); });
  setTimeout(close, action ? duration + 2500 : duration);
}

// --- Feuilles modales (bottom sheet) ------------------------------------------

let openSheetEl = null;

export function openSheet(html, { label = 'Fenêtre', onClose, className = '' } = {}) {
  closeSheet(true);
  const root = document.getElementById('sheet-root');
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-backdrop" data-close></div>
    <section class="sheet ${className}" role="dialog" aria-modal="true" aria-label="${esc(label)}">
      <div class="sheet-grip" aria-hidden="true"></div>
      ${html}
    </section>`;
  root.appendChild(wrap);
  document.body.classList.add('sheet-open');
  const prevFocus = document.activeElement;
  wrap._onClose = () => {
    onClose?.();
    prevFocus?.focus?.({ preventScroll: true });
  };
  wrap.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) closeSheet();
  });
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSheet();
  });
  requestAnimationFrame(() => wrap.classList.add('show'));
  openSheetEl = wrap;
  return wrap.querySelector('.sheet');
}

export function closeSheet(immediate = false) {
  const wrap = openSheetEl;
  if (!wrap) return;
  openSheetEl = null;
  document.body.classList.remove('sheet-open');
  wrap.classList.remove('show');
  wrap._onClose?.();
  if (immediate) wrap.remove();
  else setTimeout(() => wrap.remove(), 280);
}

export function isSheetOpen() {
  return !!openSheetEl;
}

/** Boîte de confirmation simple. Renvoie une promesse booléenne. */
export function confirmDialog({ title, message, confirm = 'Confirmer', cancel = 'Annuler', danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    const sheet = openSheet(`
      <div class="sheet-body">
        <h2 class="sheet-title">${esc(title)}</h2>
        <p class="muted">${esc(message)}</p>
        <div class="btn-row">
          <button type="button" class="btn btn-secondary" data-answer="no">${esc(cancel)}</button>
          <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-answer="yes">${esc(confirm)}</button>
        </div>
      </div>`, { label: title, onClose: () => { if (!answered) resolve(false); } });
    sheet.addEventListener('click', (e) => {
      const b = e.target.closest('[data-answer]');
      if (!b) return;
      answered = true;
      resolve(b.dataset.answer === 'yes');
      closeSheet();
    });
    sheet.querySelector('[data-answer="yes"]').focus();
  });
}

// --- Fichiers -----------------------------------------------------------------------

/** Partage un fichier (feuille de partage du téléphone) ou, à défaut, le télécharge. */
export async function shareOrDownload(blob, filename, { title, text, preferShare = true } = {}) {
  const file = typeof File === 'function' ? new File([blob], filename, { type: blob.type }) : null;
  if (preferShare && file && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text });
      return 'shared';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled';
    }
  }
  downloadBlob(blob, filename);
  return 'downloaded';
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function canShareFiles() {
  try {
    const f = new File(['x'], 'x.txt', { type: 'text/plain' });
    return !!navigator.canShare?.({ files: [f] });
  } catch {
    return false;
  }
}
