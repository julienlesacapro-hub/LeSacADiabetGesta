// Page « Installer l'application » : bouton d'installation quand le navigateur le permet,
// © 2026 LESACA Julien. Tous droits réservés.
// instructions selon le téléphone, et dépannage du message « application déjà installée ».
import { exportBackup } from '../store.js';
import { canPromptInstall, detectPlatform, isStandalone, onInstallChange, promptInstall } from '../install.js';
import { APP_VERSION } from '../version.js';
import { todayISO } from '../dates.js';
import { downloadBlob, icon, toast } from '../ui.js';

let unsubscribe = null;

function steps(list) {
  return `<ol class="install-steps">${list.map((s) => `<li>${s}</li>`).join('')}</ol>`;
}

export function renderInstall(view) {
  unsubscribe?.();
  const p = detectPlatform();
  const standalone = isStandalone();
  const canPrompt = canPromptInstall();
  const url = location.href.split('#')[0];

  let howTo;
  if (p.inApp) {
    howTo = `<div class="callout warn">${icon('alert')}<p>Vous consultez la page dans le navigateur intégré d’une autre application (WhatsApp, Gmail, Facebook…). <strong>L’installation y est impossible.</strong> Ouvrez le lien dans ${p.ios ? 'Safari' : 'Chrome'} : menu ⋮ ou ··· → « Ouvrir dans le navigateur », ou copiez le lien ci-dessous.</p></div>`;
  } else if (p.iosSafari) {
    howTo = steps([
      `Touchez le bouton <strong>Partager</strong> ${icon('share', { size: 16, cls: 'inline' })} (en bas de l’écran, ou en haut sur iPad).`,
      'Faites défiler et touchez <strong>« Sur l’écran d’accueil »</strong>.',
      'Touchez <strong>« Ajouter »</strong>. L’icône LeSacADiabetGesta apparaît sur l’écran d’accueil.',
    ]);
  } else if (p.ios) {
    howTo = steps([
      'Ouvrez cette page dans <strong>Safari</strong> (recommandé), ou touchez le bouton Partager de votre navigateur.',
      'Choisissez <strong>« Sur l’écran d’accueil »</strong> puis <strong>« Ajouter »</strong>.',
    ]);
  } else if (p.samsung) {
    howTo = steps([
      'Touchez le menu <strong>≡</strong> en bas à droite.',
      'Choisissez <strong>« Ajouter la page à »</strong> puis <strong>« Écran d’accueil »</strong> (ou l’icône d’installation dans la barre d’adresse).',
    ]);
  } else if (p.firefox) {
    howTo = steps([
      'Touchez le menu <strong>⋮</strong>.',
      'Choisissez <strong>« Installer »</strong> ou <strong>« Ajouter à l’écran d’accueil »</strong>.',
    ]);
  } else {
    howTo = steps([
      'Touchez le menu <strong>⋮</strong> en haut à droite de Chrome.',
      'Choisissez <strong>« Installer l’application »</strong> (ou « Ajouter à l’écran d’accueil »), puis <strong>« Installer »</strong>.',
      'L’application apparaît dans la liste de vos applications sous le nom <strong>LeSacADiabetGesta</strong>.',
    ]);
  }

  view.innerHTML = `
    <a class="back-link" href="#/profil">${icon('chevronLeft', { size: 20 })}Profil</a>
    <header class="page-head"><h1>Installer l’application</h1>
      <p class="muted" style="margin-top:6px">Une fois installée, LeSacADiabetGesta s’ouvre depuis une icône, en plein écran, et fonctionne sans connexion.</p></header>

    <section class="card">
      ${standalone
        ? `<div class="install-status ok">${icon('check')}<div><strong>Vous utilisez l’application installée.</strong><span>Version ${APP_VERSION}</span></div></div>`
        : `<div class="install-status">${icon('info')}<div><strong>Vous utilisez l’application dans le navigateur.</strong><span>Version ${APP_VERSION}</span></div></div>
           ${canPrompt ? `<button type="button" class="btn btn-primary btn-block" style="margin-top:14px" data-install>${icon('download', { size: 20 })}Installer l’application</button>` : ''}
           <h2 style="font-size:17px;margin-top:18px">${canPrompt ? 'Ou manuellement' : 'Comment faire'}</h2>
           ${howTo}
           <button type="button" class="btn btn-secondary btn-sm" data-copy>${icon('file', { size: 18 })}Copier le lien de l’application</button>`}
    </section>

    ${p.ios ? `<section class="card">
      <div class="callout warn" style="margin:0">${icon('alert')}<p><strong>Sur iPhone, l’application installée ne partage pas les données de Safari.</strong> Si vous avez déjà saisi des glycémies dans Safari : faites une sauvegarde ci-dessous, puis, dans l’application installée, utilisez « Restaurer une sauvegarde » (écran d’accueil ou Profil).</p></div>
      <button type="button" class="btn btn-secondary btn-block" style="margin-top:12px" data-backup>${icon('download', { size: 18 })}Sauvegarder mes données</button>
    </section>` : ''}

    <h2 class="section-title">Un problème&nbsp;?</h2>
    <section class="card">
      <details class="faq" ${standalone ? '' : 'open'}>
        <summary>« Application déjà installée », mais introuvable ou qui ne s’ouvre pas</summary>
        <div class="faq-body">
          <p>Ce message apparaît généralement quand le téléphone a gardé la trace d’une installation précédente incomplète, ou quand l’application est installée sous son ancien nom. La version ${APP_VERSION} utilise un <strong>nouvel identifiant d’installation</strong> : elle peut être installée comme une nouvelle application.</p>
          ${steps([
            '<strong>Sauvegardez d’abord vos données</strong> (bouton ci-dessous) par précaution.',
            'Cherchez <strong>« DiabetGesta »</strong> (nom de la version 1.0) et « LeSacADiabetGesta » dans la liste de toutes vos applications et dans <strong>Paramètres → Applications</strong>. Si elle apparaît, désinstallez-la.',
            p.ios ? 'Sur iPhone : appui long sur l’ancienne icône éventuelle → « Supprimer l’app ».' : 'Dans Chrome, vous pouvez taper <strong>chrome://webapks</strong> dans la barre d’adresse : la liste indique les applications web réellement installées.',
            'Fermez complètement le navigateur, rouvrez cette page, puis installez à nouveau (voir « Comment faire »).',
          ])}
          <button type="button" class="btn btn-secondary btn-sm" data-backup>${icon('download', { size: 18 })}Sauvegarder mes données</button>
        </div>
      </details>
      <details class="faq">
        <summary>Je ne vois pas « Installer l’application » dans le menu</summary>
        <div class="faq-body">
          <p>Vérifiez que vous êtes dans <strong>Chrome</strong> (Android) ou <strong>Safari</strong> (iPhone), et non dans le navigateur intégré de WhatsApp, Gmail ou Facebook. La navigation privée empêche aussi l’installation. Sinon, utilisez « Ajouter à l’écran d’accueil ».</p>
        </div>
      </details>
      <details class="faq">
        <summary>L’application installée affiche une ancienne version</summary>
        <div class="faq-body">
          <p>Les mises à jour se téléchargent en arrière-plan quand le téléphone est connecté, puis s’appliquent automatiquement. Fermez l’application et rouvrez-la. La version utilisée est indiquée en haut de cette page.</p>
        </div>
      </details>
    </section>`;

  view.querySelector('[data-install]')?.addEventListener('click', async () => {
    const outcome = await promptInstall();
    if (outcome === 'dismissed') toast('Installation annulée');
    renderInstall(view);
  });
  view.querySelector('[data-copy]')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast('Lien copié');
    } catch {
      toast(url, { duration: 6000 });
    }
  });
  view.querySelectorAll('[data-backup]').forEach((b) => b.addEventListener('click', () => {
    downloadBlob(new Blob([exportBackup()], { type: 'application/json' }), `LeSacADiabetGesta_sauvegarde_${todayISO()}.json`);
    toast('Sauvegarde créée dans vos téléchargements');
  }));
  // Si le navigateur propose l'installation après l'affichage, on met la page à jour.
  unsubscribe = onInstallChange(() => {
    if (document.body.contains(view) && location.hash.startsWith('#/installer')) renderInstall(view);
    else unsubscribe?.();
  });
}
