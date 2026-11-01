// Clavier virtuel : garde la fenêtre de saisie entièrement visible au-dessus du clavier.
//
// Sur iPhone (Safari) et sur Android (Chrome ≥ 108), le clavier ne réduit que la « zone visible »
// (Visual Viewport) : un élément fixé en bas de l'écran passe alors sous le clavier.
// On mesure donc en continu la zone réellement visible et on expose deux variables CSS :
//   --vv-h : hauteur visible (px)          --kb : hauteur masquée en bas de l'écran (px)
// ainsi que la classe body.kb-open lorsque le clavier est ouvert.

const KB_MIN = 120; // en dessous, il s'agit d'une barre d'outils et non d'un clavier

function isTextField(el) {
  if (!el) return false;
  if (el.isContentEditable || el.tagName === 'TEXTAREA') return true;
  if (el.tagName !== 'INPUT') return false;
  return !['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range', 'color', 'date', 'time', 'datetime-local', 'month', 'week'].includes(el.type);
}

export function initViewport(win = window) {
  const doc = win.document;
  const root = doc.documentElement;
  let baseline = 0; // hauteur visible de référence, clavier fermé
  let frame = 0;

  const measure = () => {
    frame = 0;
    const vv = win.visualViewport;
    const layoutH = win.innerHeight;
    const visibleH = vv ? vv.height : layoutH;
    const offsetTop = vv ? vv.offsetTop : 0;
    const hidden = Math.max(0, Math.round(layoutH - visibleH - offsetTop));
    const focused = isTextField(doc.activeElement);
    if (!focused) baseline = Math.max(baseline, visibleH);
    // iOS / Chrome par défaut : la zone visible rétrécit (hidden > 0).
    // Chrome avec interactive-widget=resizes-content : c'est la page entière qui rétrécit.
    const open = focused && (hidden > KB_MIN || baseline - visibleH > KB_MIN);
    root.style.setProperty('--vv-h', `${Math.round(visibleH)}px`);
    root.style.setProperty('--kb', `${hidden}px`);
    doc.body.classList.toggle('kb-open', open);
  };
  const schedule = () => {
    if (!frame) frame = win.requestAnimationFrame(measure);
  };

  win.visualViewport?.addEventListener('resize', schedule);
  win.visualViewport?.addEventListener('scroll', schedule);
  win.addEventListener('resize', schedule);
  win.addEventListener('orientationchange', () => { baseline = 0; setTimeout(schedule, 300); });
  doc.addEventListener('focusin', schedule);
  // À la fermeture du clavier, la zone visible change avec un léger décalage.
  doc.addEventListener('focusout', () => { schedule(); setTimeout(schedule, 120); setTimeout(schedule, 400); });
  measure();
  return measure;
}
