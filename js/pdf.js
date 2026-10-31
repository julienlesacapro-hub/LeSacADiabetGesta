// Rapport PDF (A4) : synthèse, statistiques, courbes vectorielles et carnet détaillé.
// buildPdf() ne dépend pas du DOM : il reçoit le constructeur jsPDF en paramètre.
import { MAIN_MOMENTS, STATUSES, TREATMENTS, REFS, HYPO, momentById, TAGS } from './guidelines.js';
import { computeStats, dailyTable, evaluateReading, readingsBetween, resolveTargets, sortReadings } from './analysis.js';
import { chartModel, yDomain } from './chart.js';
import { pregnancyInfo, gestationalAgeAt, formatGA, bmi, maternalAge } from './pregnancy.js';
import { fromMgdl, formatNumber, formatValue, roundTo, UNIT_INFO, MGDL_PER_MMOL } from './units.js';
import { daysBetween, formatDateShort, formatDayCompact, formatTime, todayISO } from './dates.js';

const C = {
  plum: [107, 74, 126],
  plumDark: [85, 58, 102],
  plumSoft: [240, 231, 244],
  ivory: [250, 246, 242],
  text: [42, 34, 48],
  text2: [93, 83, 100],
  text3: [135, 124, 140],
  border: [231, 221, 214],
  white: [255, 255, 255],
  ok: [12, 163, 12],
  okText: [29, 122, 58],
  okSoft: [229, 244, 232],
  high: [208, 59, 59],
  highText: [176, 46, 46],
  highSoft: [251, 232, 230],
  low: [42, 120, 214],
  lowText: [31, 94, 166],
  lowSoft: [229, 238, 250],
  grid: [236, 230, 226],
};

const PAGE = { w: 210, h: 297, m: 14 };

/** Les polices standard PDF ne couvrent pas certains symboles : on les remplace. */
function clean(s) {
  return String(s ?? '')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/[  ]/g, ' ')
    .replace(/[^\u0000-ÿŒœ‘’“”–—…€•]/g, '');
}

function statusColors(status) {
  if (status === 'high') return { fill: C.highSoft, text: C.highText, mark: C.high };
  if (status === 'low' || status === 'verylow') return { fill: C.lowSoft, text: C.lowText, mark: C.low };
  if (status === 'ok') return { fill: C.okSoft, text: C.text, mark: C.ok };
  return { fill: null, text: C.text, mark: C.text3 };
}

export function reportFilename(ext, today = todayISO()) {
  return `LeSacADiabetGesta_releve_${today}.${ext}`;
}

/**
 * @param {Function} JsPDF constructeur jsPDF
 * @param {object} state état de l'application
 * @param {{from:string,to:string,unit?:string,includeNotes?:boolean,today?:string}} opts
 */
export function buildPdf(JsPDF, state, opts) {
  const today = opts.today || todayISO();
  const profile = { ...state.profile, unit: opts.unit || state.profile.unit };
  const unit = profile.unit;
  const targets = resolveTargets(profile);
  const readings = sortReadings(readingsBetween(state.readings, opts.from, opts.to));
  const stats = computeStats(readings, profile);
  const doc = new JsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({
    title: 'Relevé d’autosurveillance glycémique',
    subject: 'Diabète gestationnel — LeSacADiabetGesta',
    creator: 'LeSacADiabetGesta',
  });

  const fill = (c) => doc.setFillColor(...c);
  const draw = (c) => doc.setDrawColor(...c);
  const ink = (c) => doc.setTextColor(...c);
  const font = (style = 'normal', size = 10) => { doc.setFont('helvetica', style); doc.setFontSize(size); };
  const text = (s, x, y, o) => doc.text(clean(s), x, y, o);
  const fv = (mgdl) => formatNumber(roundTo(fromMgdl(mgdl, unit), unit), UNIT_INFO[unit].decimals);

  function marker(status, x, y, r = 1.3) {
    const col = statusColors(status).mark;
    fill(col);
    if (status === 'high') doc.triangle(x, y - r * 1.15, x + r * 1.1, y + r * 0.8, x - r * 1.1, y + r * 0.8, 'F');
    else if (status === 'low' || status === 'verylow') doc.triangle(x, y + r * 1.15, x + r * 1.1, y - r * 0.8, x - r * 1.1, y - r * 0.8, 'F');
    else if (status === 'ok') doc.circle(x, y, r * 0.95, 'F');
    else { draw(C.text3); doc.setLineWidth(0.25); doc.rect(x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6, 'S'); }
  }

  // ---------------------------------------------------------------- En-tête
  fill(C.plum);
  doc.rect(0, 0, PAGE.w, 36, 'F');
  fill(C.plumDark);
  doc.circle(PAGE.w - 10, -6, 34, 'F');
  // Logo : goutte
  fill(C.white);
  doc.circle(21, 19.5, 5.2, 'F');
  doc.triangle(21, 9.5, 16.2, 17.6, 25.8, 17.6, 'F');
  fill(C.plum);
  doc.circle(21, 19.5, 2, 'F');
  ink(C.white);
  font('bold', 17);
  text('Relevé d’autosurveillance glycémique', 31, 17);
  font('normal', 10);
  text('Diabète gestationnel  •  LeSacADiabetGesta', 31, 24);
  font('normal', 8.5);
  text(`Édité le ${formatDateShort(today)}`, PAGE.w - PAGE.m, 14, { align: 'right' });
  text(`Période : ${formatDateShort(opts.from)} au ${formatDateShort(opts.to)}`, PAGE.w - PAGE.m, 19.5, { align: 'right' });
  text(`Unité : ${unit}`, PAGE.w - PAGE.m, 25, { align: 'right' });

  // ---------------------------------------------------------------- Identité
  let y = 44;
  const preg = pregnancyInfo(profile, today);
  const b = bmi(profile.heightCm, profile.prePregnancyWeightKg);
  const age = maternalAge(profile, today);
  const status = STATUSES.find((s) => s.id === profile.status);
  const diagnosed = profile.status === 'gdm' || profile.status === 't2d';
  const left = [
    ['Patiente', profile.firstName || '—'],
    ['Âge', age != null ? `${age} ans` : '—'],
    ['Taille / poids avant grossesse', profile.heightCm && profile.prePregnancyWeightKg ? `${formatNumber(profile.heightCm)} cm / ${formatNumber(profile.prePregnancyWeightKg, profile.prePregnancyWeightKg % 1 ? 1 : 0)} kg` : '—'],
    ['IMC avant grossesse', b != null ? `${formatNumber(b, 1)} kg/m²` : '—'],
  ];
  const right = [
    [preg?.delivered ? 'Accouchement' : `Âge gestationnel au ${formatDateShort(today)}`, preg?.delivered ? formatDateShort(profile.deliveryDate) : preg && preg.valid ? formatGA({ weeks: preg.weeks, extraDays: preg.extraDays }) : '—'],
    ['Terme prévu', preg ? `${formatDateShort(preg.term)} (${profile.termConvention === 'int40' ? '40' : '41'} SA)` : '—'],
    ['Situation', `${status?.short || '—'}${diagnosed && profile.diagnosisDate ? ` (le ${formatDateShort(profile.diagnosisDate)})` : ''}`],
    ['Prise en charge', diagnosed ? TREATMENTS.find((t) => t.id === profile.treatment)?.label || '—' : '—'],
  ];
  const boxH = profile.careTeam ? 38 : 33;
  fill(C.ivory);
  draw(C.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(PAGE.m, y, PAGE.w - 2 * PAGE.m, boxH, 3, 3, 'FD');
  const kv = (rows, x, w) => rows.forEach(([k, v], i) => {
    font('normal', 7.5); ink(C.text3); text(k.toUpperCase(), x, y + 7 + i * 6.4);
    const free = w - doc.getTextWidth(clean(k.toUpperCase())) - 3;
    // Réduit la taille si la valeur risque de chevaucher son libellé.
    let size = 9.5;
    font('bold', size);
    while (size > 6.5 && doc.getTextWidth(clean(v)) > free) { size -= 0.5; font('bold', size); }
    ink(C.text); text(v, x + w, y + 7 + i * 6.4, { align: 'right' });
  });
  kv(left, PAGE.m + 5, 82);
  draw(C.border);
  doc.line(PAGE.w / 2, y + 4, PAGE.w / 2, y + 27);
  kv(right, PAGE.w / 2 + 5, 82);
  if (profile.careTeam) {
    font('normal', 8); ink(C.text2);
    text(`Équipe soignante : ${profile.careTeam}`, PAGE.m + 5, y + boxH - 4);
  }
  y += boxH + 6;

  // Objectifs
  const custom = targets.custom.fasting || targets.custom.post;
  font('bold', 9.5); ink(C.plumDark);
  text('Objectifs glycémiques', PAGE.m, y);
  font('normal', 9); ink(C.text2);
  text(`À jeun < ${formatValue(targets.fasting[unit], unit)}   •   ${targets.delay === 60 ? '1 h' : '2 h'} après le début du repas < ${formatValue(targets.post[unit], unit)}   •   ${custom ? 'objectifs personnalisés par l’équipe' : targets.delay === 60 ? 'CNGOF-SFD 2010 / ADA 2025' : 'CNGOF-SFD 2010'}`, PAGE.m + 40, y);
  y += 6;

  // ---------------------------------------------------------------- Indicateurs
  const o = stats.overall;
  const tiles = [
    ['Mesures', String(o.n), `sur ${stats.dayCount} jour${stats.dayCount > 1 ? 's' : ''}`, C.text],
    ['Dans l’objectif', o.pctOk == null ? '–' : `${formatNumber(o.pctOk * 100)} %`, `${o.ok} / ${o.evaluated} mesures`, C.okText],
    ['Au-dessus de l’objectif', String(o.high), o.evaluated ? `${formatNumber((o.high / o.evaluated) * 100)} % des mesures` : '', C.highText],
    ['Glycémies basses', String(o.low), `< ${formatValue(HYPO.level1[unit], unit)}`, C.lowText],
  ];
  const tw = (PAGE.w - 2 * PAGE.m - 3 * 4) / 4;
  tiles.forEach(([label, val, sub, col], i) => {
    const x = PAGE.m + i * (tw + 4);
    fill(C.white); draw(C.border);
    doc.roundedRect(x, y, tw, 22, 2.5, 2.5, 'FD');
    font('normal', 7.5); ink(C.text3); text(label.toUpperCase(), x + 4, y + 6);
    font('bold', 16); ink(col); text(val, x + 4, y + 14.5);
    font('normal', 7.5); ink(C.text3); text(sub, x + 4, y + 19);
  });
  y += 28;

  // ---------------------------------------------------------------- Statistiques par moment
  font('bold', 11); ink(C.text); text('Synthèse par moment de mesure', PAGE.m, y);
  y += 3;
  const cols = [
    ['Moment', 40, 'left'], ['Mesures', 20, 'right'], ['Moyenne', 24, 'right'], ['Min – max', 32, 'right'], ['Dans l’objectif', 32, 'right'], ['Dépassements', 30, 'right'],
  ];
  const rowH = 7;
  fill(C.plumSoft);
  doc.roundedRect(PAGE.m, y, PAGE.w - 2 * PAGE.m, rowH, 1.5, 1.5, 'F');
  let x = PAGE.m + 3;
  font('bold', 8); ink(C.plumDark);
  cols.forEach(([h, w, al]) => { text(h, al === 'right' ? x + w - 3 : x, y + 4.7, { align: al }); x += w; });
  y += rowH;
  const momentRows = [...MAIN_MOMENTS, momentById('other')].filter((m) => m.id !== 'other' || stats.perMoment.other.n);
  momentRows.forEach((m, i) => {
    const s = stats.perMoment[m.id];
    if (i % 2) { fill([252, 250, 248]); doc.rect(PAGE.m, y, PAGE.w - 2 * PAGE.m, rowH, 'F'); }
    x = PAGE.m + 3;
    const vals = [
      m.label,
      String(s.n),
      s.n ? `${fv(s.mean)}` : '–',
      s.n ? `${fv(s.min)} – ${fv(s.max)}` : '–',
      s.evaluated ? `${formatNumber(s.pctOk * 100)} %` : '–',
      s.evaluated ? String(s.high) : '–',
    ];
    vals.forEach((val, k) => {
      const [, w, al] = cols[k];
      font(k === 0 ? 'bold' : 'normal', 8.5);
      ink(k === 5 && s.high ? C.highText : C.text);
      text(val, al === 'right' ? x + w - 3 : x, y + 4.8, { align: al });
      x += w;
    });
    draw(C.border); doc.setLineWidth(0.2);
    doc.line(PAGE.m, y + rowH, PAGE.w - PAGE.m, y + rowH);
    y += rowH;
  });
  font('normal', 7); ink(C.text3);
  text(`Moyennes, minimums et maximums exprimés en ${unit}.`, PAGE.m, y + 4);
  y += 10;

  // ---------------------------------------------------------------- Courbes
  font('bold', 11); ink(C.text); text('Courbes par moment', PAGE.m, y);
  y += 3;
  const domain = yDomain(readings, targets, unit);
  const cw = (PAGE.w - 2 * PAGE.m - 6) / 2;
  const ch = 50;
  MAIN_MOMENTS.forEach((m, i) => {
    const cx = PAGE.m + (i % 2) * (cw + 6);
    const cy = y + Math.floor(i / 2) * (ch + 5);
    drawChart(chartModel(readings, { momentId: m.id, from: opts.from, to: opts.to, unit, targets, domain }), cx, cy, cw, ch, m.label);
  });
  y += 2 * (ch + 5) + 1;
  // Légende
  const legend = [['ok', 'Dans l’objectif'], ['high', 'Au-dessus de l’objectif'], ['low', 'Glycémie basse']];
  x = PAGE.m;
  legend.forEach(([s, l]) => {
    marker(s, x + 1.5, y - 1);
    font('normal', 8); ink(C.text2); text(l, x + 4.5, y);
    x += doc.getTextWidth(clean(l)) + 12;
  });
  draw(C.text2); doc.setLineWidth(0.35); doc.setLineDashPattern([1.2, 1], 0);
  doc.line(x, y - 1, x + 7, y - 1); doc.setLineDashPattern([], 0);
  text('Objectif', x + 9, y);

  function drawChart(model, cx, cy, w, h, title) {
    fill(C.white); draw(C.border); doc.setLineWidth(0.3);
    doc.roundedRect(cx, cy, w, h, 2.5, 2.5, 'FD');
    const n = model.points.length;
    const high = model.points.filter((p) => p.status === 'high').length;
    font('bold', 8.5); ink(C.text); text(title, cx + 3.5, cy + 5.5);
    font('normal', 7); ink(C.text3); text(n ? `${n} mesure${n > 1 ? 's' : ''} • ${high} dépassement${high > 1 ? 's' : ''}` : 'aucune mesure', cx + w - 3.5, cy + 5.5, { align: 'right' });
    const pl = cx + 11; const pr = cx + w - 4; const pt = cy + 9; const pb = cy + h - 7;
    const X = (v) => pl + v * (pr - pl);
    const Y = (v) => pb - v * (pb - pt);
    if (model.target) {
      fill(C.okSoft);
      doc.rect(pl, Y(model.target.y), pr - pl, pb - Y(model.target.y), 'F');
    }
    doc.setLineWidth(0.15); draw(C.grid);
    model.ticks.forEach((t) => {
      doc.line(pl, Y(t.y), pr, Y(t.y));
      font('normal', 6); ink(C.text3); text(t.label, pl - 1.5, Y(t.y) + 1, { align: 'right' });
    });
    model.xLabels.forEach((l) => { font('normal', 6); ink(C.text3); text(l.label, X(l.x), pb + 4, { align: 'center' }); });
    if (model.target) {
      draw(C.text2); doc.setLineWidth(0.35); doc.setLineDashPattern([1.2, 1], 0);
      doc.line(pl, Y(model.target.y), pr, Y(model.target.y));
      doc.setLineDashPattern([], 0);
    }
    if (model.points.length > 1) {
      draw(C.plum); doc.setLineWidth(0.45);
      for (let k = 1; k < model.points.length; k++) {
        const a = model.points[k - 1]; const bb = model.points[k];
        doc.line(X(a.x), Y(a.y), X(bb.x), Y(bb.y));
      }
    }
    model.points.forEach((p) => {
      fill(C.white); doc.circle(X(p.x), Y(p.y), 1.55, 'F');
      marker(p.status, X(p.x), Y(p.y), 1.15);
    });
    if (model.target) {
      // Étiquette sur fond blanc, dessinée après les points pour rester lisible.
      const label = `objectif < ${formatValue(model.target.value, unit, { withUnit: false })}`;
      font('bold', 6);
      const lw = doc.getTextWidth(clean(label));
      const ly = Y(model.target.y) - 1.4;
      const crowded = model.points.some((p) => p.x > 0.7 && Math.abs(Y(p.y) - ly) < 3);
      const lx = crowded ? pl + 1 : pr - 1 - lw;
      fill(C.white); doc.roundedRect(lx - 0.8, ly - 2.3, lw + 1.6, 3.1, 0.6, 0.6, 'F');
      ink(C.text2); text(label, lx, ly);
    }
  }

  // ---------------------------------------------------------------- Carnet détaillé
  doc.addPage();
  y = PAGE.m + 4;
  font('bold', 14); ink(C.plumDark); text('Carnet glycémique', PAGE.m, y);
  font('normal', 8.5); ink(C.text3);
  text(`Valeurs en ${unit} • heure de mesure sous la valeur • jours les plus récents en premier`, PAGE.m, y + 5.5);
  y += 10;

  const table = dailyTable(readings);
  const days = daysBetween(opts.from, opts.to).reverse().filter((d) => table.has(d));
  const includeNotes = opts.includeNotes !== false;
  const W = PAGE.w - 2 * PAGE.m;
  const colW = includeNotes ? [27, 22, 22, 22, 22, 20] : [30, 30, 30, 30, 30, 32];
  const notesW = includeNotes ? W - colW.reduce((a, c) => a + c, 0) : 0;
  const heads = ['Jour', 'À jeun', 'Après p.-déj.', 'Après déj.', 'Après dîner', 'Autres', ...(includeNotes ? ['Notes'] : [])];
  const subs = ['', `< ${formatValue(targets.fasting[unit], unit, { withUnit: false })}`, ...Array(3).fill(`< ${formatValue(targets.post[unit], unit, { withUnit: false })}`), '', ''];

  const tableHeader = () => {
    fill(C.plum);
    doc.roundedRect(PAGE.m, y, W, 10, 1.5, 1.5, 'F');
    let hx = PAGE.m;
    heads.forEach((h, k) => {
      const w = k < colW.length ? colW[k] : notesW;
      font('bold', 7.5); ink(C.white);
      text(h, k === 0 || k === 6 ? hx + 2.5 : hx + w / 2, y + 4.3, { align: k === 0 || k === 6 ? 'left' : 'center' });
      if (subs[k]) { font('normal', 6.5); text(subs[k], hx + w / 2, y + 8, { align: 'center' }); }
      hx += w;
    });
    y += 10;
  };
  tableHeader();

  if (!days.length) {
    font('normal', 9); ink(C.text3); text('Aucune mesure sur la période.', PAGE.m + 2, y + 8);
  }
  days.forEach((day, idx) => {
    const cells = table.get(day);
    const noteLines = includeNotes
      ? doc.splitTextToSize(clean(MAIN_MOMENTS.concat([momentById('other')]).flatMap((m) => cells[m.id]).filter((r) => r.note || r.tags?.length).map((r) => `${formatTime(r.ts)} ${[...(r.tags || []).map((t) => TAGS.find((x) => x.id === t)?.label || ''), r.note].filter(Boolean).join(', ')}`).join(' | ')), notesW - 4).slice(0, 4)
      : [];
    const maxPerCell = Math.max(1, ...[...MAIN_MOMENTS, momentById('other')].map((m) => cells[m.id].length));
    const rh = Math.max(10, 3 + Math.min(maxPerCell, 3) * 6.5, noteLines.length * 3 + 4);
    if (y + rh > PAGE.h - 18) {
      doc.addPage();
      y = PAGE.m;
      tableHeader();
    }
    if (idx % 2) { fill([252, 250, 248]); doc.rect(PAGE.m, y, W, rh, 'F'); }
    let cx = PAGE.m;
    // Jour
    font('bold', 8); ink(C.text); text(formatDayCompact(day), cx + 2.5, y + 4.5);
    const ga = gestationalAgeAt(profile, day);
    font('normal', 6.5); ink(C.text3); text(formatGA(ga), cx + 2.5, y + 8);
    cx += colW[0];
    // Moments
    [...MAIN_MOMENTS, momentById('other')].forEach((m, k) => {
      const w = colW[k + 1];
      const list = cells[m.id].slice(0, 3);
      if (list.length) {
        const evs = list.map((r) => evaluateReading(r, targets).status);
        const worst = evs.includes('verylow') ? 'verylow' : evs.includes('low') ? 'low' : evs.includes('high') ? 'high' : evs.includes('ok') ? 'ok' : 'none';
        const col = statusColors(worst);
        if (col.fill) { fill(col.fill); doc.rect(cx + 0.4, y + 0.4, w - 0.8, rh - 0.8, 'F'); }
        list.forEach((r, j) => {
          const st = evs[j];
          const cy = y + 4.6 + j * 6.5;
          const val = fv(r.mgdl);
          font(st === 'high' || st === 'low' || st === 'verylow' ? 'bold' : 'normal', 8.5);
          const tw2 = doc.getTextWidth(val);
          marker(st, cx + w / 2 - tw2 / 2 - 2.2, cy - 1.1, 0.95);
          ink(statusColors(st).text);
          text(val, cx + w / 2 + 0.6, cy, { align: 'center' });
          font('normal', 6); ink(C.text3);
          text(formatTime(r.ts) + (r.insulin != null ? ` • ${formatNumber(r.insulin, r.insulin % 1 ? 1 : 0)} UI` : ''), cx + w / 2, cy + 2.8, { align: 'center' });
        });
        if (cells[m.id].length > 3) { font('normal', 6); ink(C.text3); text(`+${cells[m.id].length - 3}`, cx + w - 1.5, y + rh - 1.5, { align: 'right' }); }
      } else {
        font('normal', 8); ink(C.border); text('–', cx + w / 2, y + rh / 2 + 1, { align: 'center' });
      }
      cx += w;
    });
    if (includeNotes && noteLines.length) {
      font('normal', 6.5); ink(C.text2);
      noteLines.forEach((l, j) => doc.text(l, cx + 2, y + 4 + j * 3));
    }
    draw(C.border); doc.setLineWidth(0.2);
    doc.line(PAGE.m, y + rh, PAGE.w - PAGE.m, y + rh);
    y += rh;
  });

  // ---------------------------------------------------------------- Tests et repères
  const tests = state.tests || [];
  const tail = 30 + tests.length * 5;
  if (y + tail > PAGE.h - 18) { doc.addPage(); y = PAGE.m; } else { y += 8; }
  if (tests.length) {
    font('bold', 10); ink(C.text); text('Résultats de dépistage saisis', PAGE.m, y);
    y += 5;
    tests.forEach((t) => {
      font('normal', 8.5); ink(C.text2);
      const vals = [['t0', 'à jeun'], ['t60', '1 h'], ['t120', '2 h']].filter(([k]) => t.values[k]).map(([k, l]) => `${l} ${formatValue(t.values[k], t.unit)}`).join(' • ');
      text(`${t.type === 'hgpo' ? 'HGPO 75 g' : 'Glycémie à jeun'}${t.date ? ` du ${formatDateShort(t.date)}` : ''} : ${vals}`, PAGE.m, y);
      y += 5;
    });
    y += 3;
  }
  font('bold', 8.5); ink(C.text); text('Repères', PAGE.m, y);
  font('normal', 7.5); ink(C.text2);
  const notes = [
    `Conversions : 1 mmol/L = ${formatNumber(MGDL_PER_MMOL, 4)} mg/dL = ${formatNumber(MGDL_PER_MMOL / 100, 6)} g/L. Chaque valeur est évaluée dans l’unité où elle a été saisie.`,
    `Objectifs par défaut : ${REFS.cngof2010.short} (à jeun et 2 h) ; ${REFS.ada2025.short} (1 h). Glycémie basse : < ${formatValue(HYPO.level1[unit], unit)} (${REFS.ada2025hypo.short}).`,
  ];
  notes.forEach((n, i) => doc.text(doc.splitTextToSize(clean(n), W), PAGE.m, y + 4.5 + i * 4));

  // ---------------------------------------------------------------- Pieds de page
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    draw(C.border); doc.setLineWidth(0.3);
    doc.line(PAGE.m, PAGE.h - 12, PAGE.w - PAGE.m, PAGE.h - 12);
    font('normal', 7); ink(C.text3);
    text('Document établi à partir des données saisies par la patiente dans LeSacADiabetGesta. Ne remplace pas un avis médical.', PAGE.m, PAGE.h - 7.5);
    text(`Page ${i} / ${total}`, PAGE.w - PAGE.m, PAGE.h - 7.5, { align: 'right' });
  }
  return doc;
}

let loading = null;
/** Charge jsPDF (fichier local, disponible hors connexion). */
export function loadJsPDF() {
  if (globalThis.jspdf?.jsPDF) return Promise.resolve(globalThis.jspdf.jsPDF);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'vendor/jspdf/jspdf.umd.min.js';
      s.onload = () => resolve(globalThis.jspdf.jsPDF);
      s.onerror = () => { loading = null; reject(new Error('Impossible de charger le module PDF')); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

export async function generatePdfBlob(state, opts) {
  const JsPDF = await loadJsPDF();
  return buildPdf(JsPDF, state, opts).output('blob');
}
