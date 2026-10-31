// Partage du suivi : PDF visuel et fichiers CSV pour Excel.
import { getState } from '../store.js';
import { readingsBetween } from '../analysis.js';
import { readingsCsv, dailyCsv, csvBlob } from '../csv.js';
import { generatePdfBlob, reportFilename } from '../pdf.js';
import { UNITS } from '../units.js';
import { addDays, todayISO, isISODate, formatDateShort } from '../dates.js';
import { esc, icon, toast, shareOrDownload, canShareFiles } from '../ui.js';
import { periodRange } from './journal.js';

const opts = { period: 'all', from: '', to: '', unit: null, notes: true, csvFormat: 'detail' };

export function renderExport(view) {
  const st = getState();
  const today = todayISO();
  opts.unit = opts.unit || st.profile.unit;
  const share = canShareFiles();

  const range = () => {
    if (opts.period === 'custom' && isISODate(opts.from) && isISODate(opts.to)) {
      return opts.from <= opts.to ? { from: opts.from, to: opts.to } : { from: opts.to, to: opts.from };
    }
    if (opts.period === '14') return { from: addDays(today, -13), to: today };
    if (opts.period === '30') return { from: addDays(today, -29), to: today };
    return periodRange(st.readings, 'all', today);
  };

  view.innerHTML = `
    <a class="back-link" href="#/carnet">${icon('chevronLeft', { size: 20 })}Carnet</a>
    <header class="page-head"><h1>Partager mon suivi</h1>
      <p class="muted" style="margin-top:6px">Créez un document à transmettre à votre sage-femme, médecin ou diabétologue. Les fichiers sont créés sur ce téléphone.</p></header>

    <section class="card">
      <div class="field"><span class="label">Période</span>
        <div class="seg" role="group" aria-label="Période">
          ${[['all', 'Tout'], ['14', '14 jours'], ['30', '30 jours'], ['custom', 'Dates']].map(([id, l]) => `<button type="button" data-period="${id}" aria-pressed="${opts.period === id}">${l}</button>`).join('')}
        </div></div>
      <div class="grid-2" data-custom ${opts.period === 'custom' ? '' : 'hidden'} style="margin-top:12px">
        <label class="field"><span class="label">Du</span><input class="input" type="date" name="from" value="${esc(opts.from || addDays(today, -13))}" max="${today}"></label>
        <label class="field"><span class="label">Au</span><input class="input" type="date" name="to" value="${esc(opts.to || today)}" max="${today}"></label>
      </div>
      <div class="field" style="margin-top:14px"><span class="label">Unité du document</span>
        <div class="seg" role="group" aria-label="Unité">${UNITS.map((u) => `<button type="button" data-unit="${u}" aria-pressed="${opts.unit === u}">${u}</button>`).join('')}</div></div>
      <label class="check" style="margin-top:14px"><input type="checkbox" name="notes" ${opts.notes ? 'checked' : ''}><span class="box">${icon('check', { size: 16 })}</span><span class="check-text">Inclure les notes et le contexte<small>Repas, activité, malaise…</small></span></label>
      <p class="small muted" style="margin-top:12px" data-summary></p>
    </section>

    <section class="card">
      <div class="export-option">
        <span class="eo-ico eo-pdf">${icon('file', { size: 24 })}</span>
        <div class="grow"><h2 style="font-size:17px">Rapport PDF</h2>
          <p class="small muted">Synthèse, statistiques par moment, courbes avec objectifs et dépassements, carnet jour par jour.</p></div>
      </div>
      <button type="button" class="btn btn-primary btn-block" style="margin-top:12px" data-pdf>${icon(share ? 'share' : 'download', { size: 20 })}${share ? 'Créer et partager le PDF' : 'Télécharger le PDF'}</button>
    </section>

    <section class="card">
      <div class="export-option">
        <span class="eo-ico eo-csv">${icon('sheet', { size: 24 })}</span>
        <div class="grow"><h2 style="font-size:17px">Fichier Excel (CSV)</h2>
          <p class="small muted">S’ouvre dans Excel, Numbers ou LibreOffice (séparateur point-virgule, virgule décimale).</p></div>
      </div>
      <div class="seg" role="group" aria-label="Format CSV" style="margin-top:12px">
        <button type="button" data-csvformat="detail" aria-pressed="${opts.csvFormat === 'detail'}">1 ligne par mesure</button>
        <button type="button" data-csvformat="daily" aria-pressed="${opts.csvFormat === 'daily'}">1 ligne par jour</button>
      </div>
      <p class="tiny muted" style="margin-top:8px" data-csvhint></p>
      <button type="button" class="btn btn-secondary btn-block" style="margin-top:10px" data-csv>${icon(share ? 'share' : 'download', { size: 20 })}${share ? 'Créer et partager le CSV' : 'Télécharger le CSV'}</button>
    </section>
    <p class="disclaimer">${icon('lock', { size: 14 })} Ces fichiers contiennent des données de santé : partagez-les uniquement avec des personnes de confiance.</p>`;

  const summary = view.querySelector('[data-summary]');
  const hint = view.querySelector('[data-csvhint]');
  const refresh = () => {
    const { from, to } = range();
    const n = readingsBetween(st.readings, from, to).length;
    summary.textContent = `${n} mesure${n > 1 ? 's' : ''} du ${formatDateShort(from)} au ${formatDateShort(to)}.`;
    hint.textContent = opts.csvFormat === 'detail'
      ? 'Date, heure, âge gestationnel, moment, valeur saisie et son unité, valeurs en g/L, mg/dL et mmol/L, objectif, statut, insuline, contexte, note.'
      : `Une ligne par jour : à jeun, après chaque repas (en ${opts.unit}), autres mesures, nombre de dépassements, notes.`;
    view.querySelectorAll('[data-pdf],[data-csv]').forEach((b) => { b.disabled = n === 0; });
  };

  view.addEventListener('click', async (e) => {
    const p = e.target.closest('[data-period]');
    if (p) {
      opts.period = p.dataset.period;
      view.querySelectorAll('[data-period]').forEach((b) => b.setAttribute('aria-pressed', String(b === p)));
      view.querySelector('[data-custom]').hidden = opts.period !== 'custom';
      if (opts.period === 'custom') {
        opts.from = view.querySelector('[name="from"]').value;
        opts.to = view.querySelector('[name="to"]').value;
      }
      refresh();
      return;
    }
    const u = e.target.closest('[data-unit]');
    if (u) {
      opts.unit = u.dataset.unit;
      view.querySelectorAll('[data-unit]').forEach((b) => b.setAttribute('aria-pressed', String(b === u)));
      refresh();
      return;
    }
    const f = e.target.closest('[data-csvformat]');
    if (f) {
      opts.csvFormat = f.dataset.csvformat;
      view.querySelectorAll('[data-csvformat]').forEach((b) => b.setAttribute('aria-pressed', String(b === f)));
      refresh();
      return;
    }
    if (e.target.closest('[data-pdf]')) {
      const btn = e.target.closest('[data-pdf]');
      btn.disabled = true;
      const label = btn.innerHTML;
      btn.textContent = 'Création du PDF…';
      try {
        const { from, to } = range();
        const blob = await generatePdfBlob(getState(), { from, to, unit: opts.unit, includeNotes: opts.notes });
        const res = await shareOrDownload(blob, reportFilename('pdf'), { title: 'Relevé glycémique', text: `Relevé glycémique du ${formatDateShort(from)} au ${formatDateShort(to)}` });
        if (res === 'downloaded') toast('PDF téléchargé');
      } catch (err) {
        toast(err.message || 'Le PDF n’a pas pu être créé');
      } finally {
        btn.innerHTML = label;
        btn.disabled = false;
      }
      return;
    }
    if (e.target.closest('[data-csv]')) {
      const { from, to } = range();
      const readings = readingsBetween(getState().readings, from, to);
      const profile = { ...getState().profile, unit: opts.unit };
      const text = opts.csvFormat === 'daily' ? dailyCsv(readings, profile) : readingsCsv(readings, profile);
      const name = `LeSacADiabetGesta_${opts.csvFormat === 'daily' ? 'carnet' : 'mesures'}_${today}.csv`;
      const res = await shareOrDownload(csvBlob(text), name, { title: 'Relevé glycémique (CSV)' });
      if (res === 'downloaded') toast('Fichier CSV téléchargé');
    }
  });
  view.addEventListener('change', (e) => {
    if (e.target.name === 'notes') opts.notes = e.target.checked;
    if (e.target.name === 'from' || e.target.name === 'to') {
      opts[e.target.name] = e.target.value;
      refresh();
    }
  });
  refresh();
}
