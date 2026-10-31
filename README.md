# LeSacADiabetGesta

Application smartphone d’accompagnement des femmes enceintes à risque de **diabète gestationnel** : information sourcée, préparation du dépistage, carnet glycémique avec tableau et courbes, conseils adaptés aux recommandations, export **PDF** et **CSV (Excel)**.

L’application est une **PWA** (application web progressive) : elle s’installe sur l’écran d’accueil d’un iPhone ou d’un Android, fonctionne **hors connexion**, sans compte, et **toutes les données restent sur le téléphone**.

## Fonctionnalités

| Domaine | Contenu |
|---|---|
| **Profil (pré-requis)** | Datation de la grossesse (date de début de grossesse, dernières règles ou terme ; convention française 41 SA ou 40 SA), date de naissance, taille, poids avant grossesse et actuel (IMC calculé), antécédents, situation (dépistage à faire, normal, diabète gestationnel, diabète découvert), traitement, unité préférée, délai post-prandial (1 h / 2 h), objectifs personnalisés par l’équipe, date d’accouchement. |
| **Saisie des glycémies** | Bouton « + » toujours accessible ; moment proposé selon l’heure ; saisie dans **n’importe quelle unité** (g/L, mg/dL, mmol/L) avec **détection automatique** de l’unité, correspondances calculées instantanément, statut (objectif / au-dessus / basse) affiché avant l’enregistrement ; note, contexte et dose d’insuline facultatifs ; annulation en un geste. |
| **Suivi** | Tableau jour × moment (cases colorées, saisie rétroactive en touchant une case vide), courbes par moment avec ligne d’objectif et dépassements, liste détaillée, statistiques sur 7/14/30 jours ou toute la période. |
| **Conseils adaptatifs** | Selon l’âge gestationnel, les facteurs de risque, le statut, le traitement et l’analyse des 7 derniers jours (dépassements répétés, hypoglycémies, rythme de mesure, prise de poids). Chaque conseil affiche sa base : **recommandation citée** ou **« Repère de l’application »**. |
| **Comprendre** | Diabète gestationnel, facteurs de risque (avec votre situation), prévention, dépistage (frise avec vos dates), **HGPO pas à pas animée**, critères de diagnostic (avec **lecteur de résultats**), suivi après diagnostic, alimentation et activité, après l’accouchement, sources et limites. |
| **Partage** | **PDF** A4 (synthèse, indicateurs, statistiques par moment, courbes vectorielles, carnet jour par jour) et **CSV** Excel France (`;`, virgule décimale, UTF-8 avec BOM) en deux formats : une ligne par mesure (valeurs dans les 3 unités) ou une ligne par jour. Partage direct via la feuille de partage du téléphone, ou téléchargement. Sauvegarde/restauration complète (JSON). |

## Installer sur le téléphone

1. Ouvrir l’adresse de l’application dans **Chrome** (Android) ou **Safari** (iPhone) — pas dans le navigateur intégré de WhatsApp, Gmail ou Facebook.
2. **Android (Chrome)** : bouton « Installer » de l’application (bandeau d’accueil ou Profil → Installer l’application), ou menu ⋮ → « Installer l’application ».
   **iPhone (Safari)** : bouton Partager → « Sur l’écran d’accueil » → « Ajouter ».
3. L’application apparaît sous le nom **LeSacADiabetGesta** et s’ouvre en plein écran, sans réseau.

L’écran **Profil → Installer l’application** (adresse `#/installer`) donne les étapes adaptées au téléphone utilisé et un dépannage.

> **iPhone** : l’application installée ne partage pas les données de Safari. Si des glycémies ont été saisies dans Safari, faire une sauvegarde (Profil → Sauvegarder) puis « Restaurer une sauvegarde » dans l’application installée (bouton disponible dès l’écran de bienvenue).

### « Application déjà installée » mais introuvable

La version 1.0 s’installait sous le nom court « DiabetGesta », avec un autre identifiant. Depuis la 1.2.1, l’identifiant d’installation (`id` du manifeste) est nouveau : le navigateur la considère comme une nouvelle application. Si un message « déjà installée » persiste : sauvegarder les données, chercher « DiabetGesta » dans Paramètres → Applications et la désinstaller, consulter `chrome://webapks` dans Chrome (liste des applications web installées), fermer complètement le navigateur, puis réinstaller.

## Mise en ligne (GitHub Pages)

Le workflow `.github/workflows/pages.yml` lance les tests puis publie le site à chaque push sur `main`.
Une seule action manuelle : **Settings → Pages → Source : « GitHub Actions »**. Si la source reste « Deploy from a branch », le site est publié deux fois à chaque push (par le workflow et par la publication automatique de GitHub) ; le fichier `.nojekyll` garantit au moins que les fichiers sont servis tels quels. (Pour un dépôt privé, GitHub Pages nécessite un abonnement payant.)

Tout hébergement statique en HTTPS convient (Netlify, OVH, serveur hospitalier…) : il suffit de copier `index.html`, `manifest.webmanifest`, `sw.js`, `css/`, `js/`, `assets/`, `vendor/`.

## Développement

Aucune dépendance à installer, aucune étape de compilation.

```bash
npm start          # serveur local sur http://localhost:8080
npm test           # tests unitaires (Node ≥ 20) : conversions, seuils, âge gestationnel, conseils, CSV
npm run e2e        # parcours complet dans Chromium au format iPhone (nécessite Playwright), captures dans e2e-output/
node tools/icons.mjs  # régénère les icônes PNG depuis assets/icons/icon.svg
```

Après toute modification des fichiers, changer la version dans `js/version.js`, `package.json` et `VERSION` de `sw.js` (un test vérifie qu’elles concordent) : les téléphones téléchargent alors la mise à jour en arrière-plan et l’appliquent au lancement suivant.

### Architecture

```
index.html, manifest.webmanifest, sw.js   coquille PWA et mode hors ligne
css/app.css                               design (clair / sombre)
js/guidelines.js   seuils, objectifs, facteurs de risque, références (source unique des données médicales)
js/units.js        conversions et saisie tolérante (1 mmol/L = 18,0156 mg/dL)
js/pregnancy.js    âge gestationnel, terme, IMC, prise de poids
js/analysis.js     évaluation des mesures, statistiques, tendances
js/advice.js       moteur de conseils
js/chart.js        courbes (modèle partagé écran / PDF)
js/csv.js, js/pdf.js   exports
js/store.js        stockage local (localStorage), sauvegarde JSON
js/viewport.js     clavier virtuel : garde la fenêtre de saisie visible au-dessus du clavier
js/install.js      installation (bouton « Installer », détection du navigateur et du mode installé)
js/version.js      numéro de version
js/views/          écrans (accueil, saisie, carnet, comprendre, profil, partage, premier lancement)
vendor/jspdf/      jsPDF 4.2.1 (licence MIT), chargé uniquement à la création d’un PDF
```

## Références médicales utilisées

- CNGOF-SFD 2010 — Recommandations pour la pratique clinique : le diabète gestationnel ([PDF CNGOF](https://cngof.fr/app/uploads/2023/06/RPC_DIABETE_2010.pdf) ; synthèse : Diabetes Metab 2010;36:695-9, [doi:10.1016/j.diabet.2010.11.019](https://doi.org/10.1016/j.diabet.2010.11.019)) : facteurs de risque, dépistage ciblé, seuils (0,92 / 1,80 / 1,53 g/L ; 1,26 g/L), objectifs (< 0,95 g/L à jeun, < 1,20 g/L à 2 h), autosurveillance 4 à 6 fois/jour, insuline après 7 à 10 jours, dépistage post-partum.
- IADPSG 2010 — Diabetes Care 2010;33:676-82, [doi:10.2337/dc09-1848](https://doi.org/10.2337/dc09-1848).
- ADA Standards of Care 2025 — section 15 ([doi:10.2337/dc25-S015](https://doi.org/10.2337/dc25-S015)) : objectif à 1 h (< 140 mg/dL), HGPO 4 à 12 semaines après l’accouchement ; section 6 ([doi:10.2337/dc25-S006](https://doi.org/10.2337/dc25-S006)) : hypoglycémie < 70 et < 54 mg/dL.
- OMS 2025 — WHO recommendations on care for women with diabetes during pregnancy ([lien](https://www.who.int/publications/i/item/9789240117044)).
- OMS 2020 — activité physique pendant la grossesse ([doi:10.1136/bjsports-2020-102955](https://doi.org/10.1136/bjsports-2020-102955)).
- OMS 1999 — méthode de l’HGPO ([lien](https://iris.who.int/handle/10665/66040)).
- IOM 2009 — prise de poids recommandée selon l’IMC ([NCBI](https://www.ncbi.nlm.nih.gov/books/NBK32813/)).
- Cochrane 2017 ([doi:10.1002/14651858.CD010443.pub3](https://doi.org/10.1002/14651858.CD010443.pub3)) et 2020 ([doi:10.1002/14651858.CD012394.pub3](https://doi.org/10.1002/14651858.CD012394.pub3)) — prévention.
- Vounzoulaki 2020 — risque de diabète de type 2 après diabète gestationnel ([doi:10.1136/bmj.m1361](https://doi.org/10.1136/bmj.m1361)).
- SFD 2022 — Nutrition et diabète gestationnel ([PDF](https://www.sfdiabete.org/sites/www.sfdiabete.org/files/files/ressources/reco_nutrition_diabete_gestationnel_2022_v2_0.pdf)).
- HAS 2005 — Rapport de synthèse dépistage et diagnostic du diabète gestationnel ([lien](https://www.has-sante.fr/jcms/c_272475/fr/rapport-de-synthese-sur-le-depistage-et-le-diagnostic-du-diabete-gestationnel)).

### Repères propres à l’application (non issus d’une recommandation)

Ils sont signalés comme tels dans l’interface et paramétrables dans `js/guidelines.js` :

- alerte « valeur très élevée » à partir de 2,00 g/L (11,1 mmol/L) ;
- détection de « dépassements répétés » : au moins 2 dépassements au même moment, ou au moins 20 % des mesures (si ≥ 8 mesures), sur 7 jours ;
- repère de prise de poids « à ce stade » calculé à partir des rythmes hebdomadaires de l’IOM (tolérance ± 1 kg) ;
- détection automatique de l’unité selon des plages de valeurs usuelles (en cas d’ambiguïté, l’application le signale).

## Historique des versions

- **1.2.1** — Saisie : la fenêtre reste entièrement visible au-dessus du clavier sur iPhone et Android (mesure de la zone visible, bouton « Enregistrer » fixé au-dessus du clavier, affichage compact, choix du moment sur une seule ligne). Installation : nouvel identifiant d’installation, nom « LeSacADiabetGesta » sous l’icône, icônes PNG uniquement (dont icône adaptative 192 px), bouton « Installer », page d’aide et de dépannage, restauration d’une sauvegarde dès l’écran de bienvenue, mises à jour appliquées automatiquement.
- **1.0.0** — Première version.

## Limites, réglementation et confidentialité

- **Ce n’est pas un dispositif médical.** L’application informe et aide au suivi ; elle ne pose pas de diagnostic et ne remplace pas l’équipe soignante. Les objectifs fixés par l’équipe priment.
- **Diffusion publique** : un logiciel qui interprète des glycémies et oriente des décisions de soins peut relever du règlement européen (UE) 2017/745 relatif aux dispositifs médicaux (annexe VIII, règle 11 ; guide MDCG 2019-11). Une analyse réglementaire est nécessaire avant toute diffusion au-delà d’un usage personnel ou d’un pilote encadré.
- Les recommandations françaises de référence datent de 2010 ; le contenu médical doit être relu et validé par un professionnel avant usage clinique, et mis à jour en cas de nouvelles recommandations.
- **Confidentialité** : aucune donnée ne quitte le téléphone sans action de l’utilisatrice (partage d’un fichier). Pas de serveur, pas de compte, pas de traceur.
- **Rappels** : les notifications programmées ne sont pas disponibles sans serveur pour une PWA ; elles ne sont pas implémentées.
