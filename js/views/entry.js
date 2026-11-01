// Saisie rapide d'une glycémie (feuille modale).
// © 2026 LESACA Julien. Tous droits réservés.
import { getState, saveReading, deleteReading } from '../store.js';
import { MOMENTS, TAGS, momentById } from '../guidelines.js';
import { UNITS, UNIT_INFO, parseNumber, guessUnit, convert, formatValue, isPlausible, formatNumber } from '../units.js';
import { evaluateReading, resolveTargets, suggestMoment, STATUS_LABELS } from '../analysis.js';
import { nowLocalTs, todayISO, tsDate, tsTime, formatTime, isISODate } from '../dates.js';
import { esc, icon, openSheet, closeSheet, toast, statusMark, confirmDialog } from '../ui.js';

const MOMENT_ICONS = { fasting: 'sunrise', post_breakfast: 'coffee', post_lunch: 'utensils', post_dinner: 'moon', other: 'clock' };
// Libellés courts : les cinq moments tiennent sur une ligne, même clavier ouvert.
const MOMENT_LABELS = { fasting: 'À jeun', post_breakfast: 'Petit-déj', post_lunch: 'Déjeuner', post_dinner: 'Dîner', other: 'Autre' };

export function openEntry({ reading = null, moment = null, date = null } = {}) {
  const st = getState();
  const profile = st.profile;
  const targets = resolveTargets(profile);
  const editing = !!reading;
  const preferred = profile.unit || 'g/L';

  const now = nowLocalTs();
  let ts = reading?.ts || now;
  if (!reading && isISODate(date) && date !== todayISO()) {
    const m = momentById(moment || 'fasting');
    ts = `${date}T${m.defaultTime || '12:00'}`;
  }
  const model = {
    moment: reading?.moment || moment || suggestMoment(st.readings),
    unit: reading?.unit || preferred,
    unitLocked: editing,
    raw: reading ? formatNumber(reading.value, UNIT_INFO[reading.unit].decimals) : '',
    date: tsDate(ts),
    time: tsTime(ts),
    insulin: reading?.insulin ?? '',
    note: reading?.note || '',
    tags: new Set(reading?.tags || []),
  };
  const showMore = !!(reading?.note || reading?.tags?.length || reading?.insulin != null);
  const showInsulin = profile.treatment === 'insulin' || reading?.insulin != null;

  const sheet = openSheet(`
    <form class="entry" novalidate>
      <div class="sheet-head">
        <h2 class="sheet-title">${editing ? 'Modifier la glycémie' : 'Nouvelle glycémie'}</h2>
        <button type="button" class="icon-btn" data-close aria-label="Fermer">${icon('x')}</button>
      </div>

      <div class="moment-grid" role="group" aria-label="Moment de la mesure">
        ${MOMENTS.map((m) => `<button type="button" class="moment-btn" data-moment="${m.id}" aria-pressed="${m.id === model.moment}" aria-label="${esc(m.label)}">${icon(MOMENT_ICONS[m.id], { size: 20 })}<span>${esc(MOMENT_LABELS[m.id])}</span></button>`).join('')}
      </div>

      <div class="value-box" data-valuebox>
        <label class="sr-only" for="glyc-value">Valeur de la glycémie</label>
        <div class="value-line">
          <input id="glyc-value" class="value-input" inputmode="decimal" autocomplete="off" enterkeyhint="done"
            placeholder="${esc(UNIT_INFO[model.unit].example)}" value="${esc(model.raw)}" aria-describedby="glyc-conv glyc-status">
          <span class="value-unit" data-unitlabel>${esc(model.unit)}</span>
        </div>
        <div class="value-conv num" id="glyc-conv" data-conv></div>
        <div class="value-status" id="glyc-status" data-status aria-live="polite"></div>
      </div>
      <div class="seg unit-switch" role="group" aria-label="Unité">
        ${UNITS.map((u) => `<button type="button" data-unit="${u}" aria-pressed="${u === model.unit}">${u}</button>`).join('')}
      </div>
      <div class="unit-note" data-unitnote></div>
      <div class="tiny muted" data-dup></div>

      <div class="entry-meta">
        <label class="field"><span class="label">Date</span><input class="input" type="date" name="date" value="${model.date}" max="${todayISO()}"></label>
        <label class="field"><span class="label">Heure</span><input class="input" type="time" name="time" value="${model.time}"></label>
      </div>

      <button type="button" class="btn btn-ghost btn-sm more-toggle" data-more aria-expanded="${showMore}">${icon(showMore ? 'chevronDown' : 'chevronRight', { size: 18 })}Note, contexte${showInsulin ? ', insuline' : ''}</button>
      <div data-morebox ${showMore ? '' : 'hidden'}>
        ${showInsulin ? `<label class="field"><span class="label">Insuline injectée (unités)</span><input class="input" name="insulin" inputmode="decimal" value="${esc(model.insulin ?? '')}" placeholder="facultatif"></label>` : ''}
        <div class="field"><span class="label">Contexte</span>
          <div class="chips wrap" role="group" aria-label="Contexte">
            ${TAGS.map((t) => `<button type="button" class="chip" data-tag="${t.id}" aria-pressed="${model.tags.has(t.id)}">${esc(t.label)}</button>`).join('')}
          </div>
        </div>
        <label class="field"><span class="label">Note</span><textarea class="textarea" name="note" maxlength="500" placeholder="Repas, activité, ressenti…">${esc(model.note)}</textarea></label>
      </div>

      <div class="entry-actions sheet-actions">
        ${editing ? `<button type="button" class="btn btn-danger" data-delete aria-label="Supprimer">${icon('trash')}</button>` : ''}
        <button type="submit" class="btn btn-primary" data-save>${icon('check')}Enregistrer</button>
      </div>
    </form>`, { label: editing ? 'Modifier la glycémie' : 'Nouvelle glycémie' });

  const form = sheet.querySelector('form');
  const input = sheet.querySelector('#glyc-value');
  const box = sheet.querySelector('[data-valuebox]');
  const conv = sheet.querySelector('[data-conv]');
  const statusEl = sheet.querySelector('[data-status]');
  const unitLabel = sheet.querySelector('[data-unitlabel]');
  const unitNote = sheet.querySelector('[data-unitnote]');
  const dupEl = sheet.querySelector('[data-dup]');

  function currentValue() {
    return parseNumber(input.value);
  }

  function refresh() {
    const value = currentValue();
    let note = '';
    if (value > 0 && !model.unitLocked) {
      const g = guessUnit(value, preferred);
      model.unit = g.unit;
      if (g.ambiguous) note = `Cette valeur est possible en ${g.candidates.join(' ou ')} : vérifiez l’unité de votre lecteur ou du laboratoire.`;
      else if (g.changed) note = `Unité détectée automatiquement : ${g.unit}. Touchez une autre unité pour corriger.`;
    }
    sheet.querySelectorAll('[data-unit]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.unit === model.unit)));
    unitLabel.textContent = model.unit;
    input.placeholder = UNIT_INFO[model.unit].example;
    sheet.querySelectorAll('[data-moment]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.moment === model.moment)));

    box.className = 'value-box';
    if (value > 0) {
      const others = UNITS.filter((u) => u !== model.unit).map((u) => formatValue(convert(value, model.unit, u), u));
      conv.textContent = `= ${others.join('  ·  ')}`;
      if (!isPlausible(value, model.unit)) {
        statusEl.className = 'value-status high';
        statusEl.innerHTML = `${icon('alert', { size: 18 })}Valeur inhabituelle : vérifiez la saisie et l’unité`;
      } else {
        const ev = evaluateReading({ value, unit: model.unit, moment: model.moment }, targets);
        box.classList.add(`is-${ev.status}`);
        statusEl.className = `value-status ${ev.status}`;
        const tgt = ev.target ? ` (< ${formatValue(ev.target[model.unit], model.unit)})` : '';
        statusEl.innerHTML = `${statusMark(ev.status, 14)}${esc(STATUS_LABELS[ev.status])}${esc(tgt)}`;
      }
    } else {
      conv.textContent = input.value.trim() ? 'Saisissez un nombre, par exemple 1,05' : `Objectif ${momentById(model.moment).kind === 'fasting' ? 'à jeun' : 'après le repas'} : ${momentById(model.moment).kind === 'other' ? 'aucun' : `< ${formatValue((momentById(model.moment).kind === 'fasting' ? targets.fasting : targets.post)[model.unit], model.unit)}`}`;
      statusEl.className = 'value-status';
      statusEl.textContent = '';
    }
    unitNote.textContent = note;

    // Doublon éventuel (même jour, même moment)
    const date = form.date.value;
    const dup = getState().readings.find((r) => r.id !== reading?.id && r.moment === model.moment && model.moment !== 'other' && tsDate(r.ts) === date);
    dupEl.textContent = dup ? `Déjà une mesure « ${momentById(dup.moment).label.toLowerCase()} » ce jour-là (${formatValue(dup.value, dup.unit)} à ${formatTime(dup.ts)}).` : '';
  }

  sheet.addEventListener('click', (e) => {
    const m = e.target.closest('[data-moment]');
    if (m) {
      model.moment = m.dataset.moment;
      refresh();
      // Garde le clavier ouvert : la valeur est l'étape suivante.
      if (!input.value.trim()) input.focus({ preventScroll: true });
      return;
    }
    const u = e.target.closest('[data-unit]');
    if (u) {
      const value = currentValue();
      model.unit = u.dataset.unit;
      model.unitLocked = true;
      if (!(value > 0)) input.focus();
      refresh();
      return;
    }
    const t = e.target.closest('[data-tag]');
    if (t) {
      if (model.tags.has(t.dataset.tag)) model.tags.delete(t.dataset.tag);
      else model.tags.add(t.dataset.tag);
      t.setAttribute('aria-pressed', String(model.tags.has(t.dataset.tag)));
      return;
    }
    const more = e.target.closest('[data-more]');
    if (more) {
      const boxMore = sheet.querySelector('[data-morebox]');
      boxMore.hidden = !boxMore.hidden;
      more.setAttribute('aria-expanded', String(!boxMore.hidden));
      more.querySelector('svg').outerHTML = icon(boxMore.hidden ? 'chevronRight' : 'chevronDown', { size: 18 });
      return;
    }
    if (e.target.closest('[data-delete]')) {
      confirmDialog({ title: 'Supprimer cette mesure ?', message: 'Cette action est définitive.', confirm: 'Supprimer', danger: true }).then((yes) => {
        if (!yes) return;
        const removed = deleteReading(reading.id);
        toast('Mesure supprimée', { action: 'Annuler', onAction: () => removed && saveReading(removed) });
      });
    }
  });

  input.addEventListener('input', refresh);
  // Les champs du bas (insuline, note) sont ramenés au centre une fois le clavier ouvert.
  sheet.addEventListener('focusin', (e) => {
    const el = e.target;
    if (el === input || !el.matches?.('input, textarea')) return;
    setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 320);
  });
  form.date.addEventListener('change', refresh);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = currentValue();
    if (!(value > 0)) {
      input.focus();
      conv.textContent = 'Saisissez une valeur, par exemple 1,05';
      return;
    }
    if (!isPlausible(value, model.unit)) {
      const ok = await confirmDialog({
        title: 'Valeur inhabituelle',
        message: `${formatValue(value, model.unit)} est en dehors des valeurs habituelles. Vérifiez l’unité. Enregistrer quand même ?`,
        confirm: 'Enregistrer',
      });
      if (!ok) return;
    }
    const date = isISODate(form.date.value) ? form.date.value : todayISO();
    const time = /^\d{2}:\d{2}$/.test(form.time.value) ? form.time.value : tsTime(nowLocalTs());
    const insulinRaw = form.insulin ? parseNumber(form.insulin.value) : NaN;
    const saved = saveReading({
      id: reading?.id,
      createdAt: reading?.createdAt,
      ts: `${date}T${time}`,
      moment: model.moment,
      value,
      unit: model.unit,
      insulin: Number.isFinite(insulinRaw) ? insulinRaw : null,
      note: form.note.value.trim(),
      tags: [...model.tags],
    });
    closeSheet();
    const ev = evaluateReading(saved, targets);
    const msg = `${formatValue(saved.value, saved.unit)} enregistré · ${STATUS_LABELS[ev.status]}`;
    if (editing) toast(msg);
    else toast(msg, { action: 'Annuler', onAction: () => deleteReading(saved.id) });
  });

  refresh();
  // Focus synchrone : indispensable pour ouvrir le clavier sur iOS.
  if (!editing) input.focus({ preventScroll: true });
}
