# tnav2Seamis

Outil du CROSS Jobourg qui transforme l'export des **déclarations de traversée (TNAV)** de [démarches-simplifiées](https://www.demarches-simplifiees.fr) en **entrées de la base balises de Seamis** (une clé HEXID ou MMSI et un texte à coller).

Les plaisanciers déclarent leur traversée sur démarches-simplifiées : navire, équipage, balises de détresse, moyens de contact, programme de navigation, contacts à terre. Le CROSS Jobourg en est le point de contact unique à partir du 3 novembre. Pour qu'une alerte de balise (406 MHz ou AIS) renvoie immédiatement vers le dossier, chaque balise déclarée doit figurer dans Seamis avec un résumé du dossier. Cet outil prépare ces résumés.

> Le mode d'emploi destiné aux opérateurs est dans [MODE_EMPLOI.md](MODE_EMPLOI.md).

## Ce que fait l'outil

- lit l'export **.ods** de démarches-simplifiées (le CSV ne contient ni les balises, ni l'équipage, ni les contacts à terre) ;
- croise les onglets de l'export (`Dossiers`, `Balises`, `Telephones portables`, `Membre d'equipage`, `Contact a terre`) par numéro de dossier ;
- ne retient que les dossiers dont la case **« Entré dans Seamis? »** n'est pas cochée, et ignore les dossiers archivés ;
- génère **une entrée par identifiant de balise** : une balise qui a un HEXID et un MMSI donne deux entrées au même texte ;
- normalise les clés (aucun espace, HEXID en majuscules, MMSI en chiffres seuls) ;
- produit un texte court (10 lignes au plus) encadré par des délimiteurs portant le n° de dossier, pour pouvoir empiler les mises à jour dans Seamis ;
- fournit pour chaque dossier la chaîne de recherche du navire dans Seamis (`mmsi:…, cs:…, immat:…, nom:…`), à copier pour y verser le PDF ;
- suit l'avancement des actions à faire (entrées balises saisies, PDF versés, cases cochées dans démarches-simplifiées), sans rien enregistrer ;
- signale les anomalies sans bloquer : HEXID ou MMSI invalide, préfixe AIS inattendu, pavillon incohérent avec le MID du MMSI, dossier sans balise, absence de contact à terre…

L'outil ne traite pas les PDF et ne coche pas la case « Entré dans Seamis? » : ces deux étapes restent manuelles.

## Confidentialité

Tout le traitement a lieu **dans le navigateur**. Le fichier n'est envoyé nulle part et rien n'est conservé après la fermeture de l'onglet.

Les exports réels contiennent des données personnelles : ils ne doivent **jamais** être versionnés. Le `.gitignore` exclut le dossier `exemples d'exports/` et les fichiers `*.ods`, `*.xlsx`, `*.csv`, `*.zip`, `*.pdf`. Les exemples cités dans la documentation et les jeux de test sont anonymisés.

## Démarrage

Prérequis : Node.js 20 ou plus récent.

```bash
npm install
npm run dev       # serveur de développement (http://localhost:5173)
npm test          # tests (vitest)
npm run build     # vérification TypeScript et build de production dans dist/
npm run preview   # sert le build localement
```

## Déploiement

Le workflow `.github/workflows/deploy.yml` lance les tests, construit l'application et la publie sur **GitHub Pages** à chaque push sur `main` : <https://babolab.github.io/tnav2Seamis/>.

La variable `VITE_BASE_URL` fixe le chemin de base du build (`/tnav2Seamis/` sur Pages, `/` par défaut).

## Organisation du code

```
src/
├── App.tsx                      coquille provisoire (en-tête CROSS Jobourg)
├── lib/utils.ts                 utilitaire cn() (clsx + tailwind-merge)
└── modules/tnav/
    ├── TnavModule.tsx           interface React : dépôt du fichier, actions à faire, entrées, dossiers, anomalies
    └── core/                    cœur du traitement, TypeScript pur, sans React
        ├── index.ts             point d'entrée : traiterExportOds()
        ├── odsReader.ts         lecture de l'ods (JSZip + XML), booléens office:value
        ├── exportDS.ts          reconnaissance des onglets et colonnes, construction des dossiers
        ├── normalisation.ts     valeurs vides, clés, dates, téléphones
        ├── controles.ts         contrôles de cohérence (anomalies)
        ├── generation.ts        clés, textes, fusion des dossiers qui partagent une clé
        ├── recherche.ts         chaîne de recherche du navire dans Seamis
        ├── types.ts             modèle de données
        └── __tests__/           tests, export ods fabriqué et anonymisé
```

Le cœur (`core/`) n'a aucune dépendance à React, pour pouvoir être réutilisé ailleurs (widget Grist / One Trick Pony) :

```ts
import { traiterExportOds } from './modules/tnav/core'

const resultat = await traiterExportOds(await fichier.arrayBuffer())
// resultat.entrees           : entrées balises (clé, type de clé, texte, anomalies)
// resultat.dossiersATraiter  : dossiers non cochés « Entré dans Seamis? »
// resultat.dossiersExclus    : dossiers ignorés et raison
// resultat.anomalies         : anomalies au niveau des dossiers
```

Le module est destiné à rejoindre [outils_cross](https://github.com/babolab/outils_cross) : seul le dossier `src/modules/tnav` y sera repris, avec une entrée dans la barre latérale.

## Points d'attention sur l'export démarches-simplifiées

- Les onglets et les colonnes sont reconnus **par leur libellé**, sans tenir compte de l'identifiant numérique entre parenthèses (qui change si le formulaire est modifié), des accents ni de la casse. Jamais par position.
- Les cases à cocher sont écrites sous une forme non standard (`office:value="1"`, sans texte) : le lecteur ods lit cet attribut.
- Une mise à jour d'une traversée arrive sous la forme d'un **nouveau dossier**. Si plusieurs dossiers à traiter partagent une clé, leurs textes sont réunis, le plus récent en tête.
- Démarches-simplifiées peut resservir un export déjà généré : pour avoir des données à jour, il faut demander un nouvel export (l'heure figure dans le nom du fichier).

## Tests

`npm test` exécute :

- `tnav.test.ts` : lecture ods, sélection des dossiers, génération des entrées, limite de lignes, anomalies, sur un export **fabriqué et anonymisé** (`jeuDeTest.ts`, `fabriquerOds.ts`) ;
- `exportReel.test.ts` : contrôle sur les exports réels présents dans `exemples d'exports/`. Ce test est ignoré automatiquement quand le dossier est absent (cas de la CI et de tout clone du dépôt).

## Documentation

- [MODE_EMPLOI.md](MODE_EMPLOI.md) : mode d'emploi pour les opérateurs ;
- [specification générale.md](<specification générale.md>) : spécification détaillée, structure de l'export, format du texte, décisions et points à vérifier.

## Licence

[CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/deed.fr)
