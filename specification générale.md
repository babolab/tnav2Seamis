# spécification générale
Les TNAV sont des fiches remplies par les plaisanciers sur le site démarches simplifiées. Elles permettent de transmettre les informations utiles aux CROSS, et en particulier le CROSS Jobourg , SPOC à partir du 3 novembre.
# spécification particulière
Afin d'être plus rapidement et efficacement expoitables, ces informations ont exploitées de plusieurs manières différentes:
- les extractions pdf sont versées dans les pièces jointes des entrée "navires" de la base de données de Seamis, notre système de gestion des opérations.
- un extrait du dossier, contenant entre autres le nom d'une personne du bord, le numéro du dossier de démarches.gouv.fr, le nom du bateau et les moyens de contact est attaché à chaque objet balise de détresse ( EPIRB, PLB, MOB AIS, SART AIS, EPIRB AIS, etc. - tout ce qui possède un MMSI ou un HEXID). Une base de Seamis permet d'ajouter de nouvelles balises de détresse (deux champs : une clé, qui sera MMSI ou HEXID, et le texte libre à générer pour ajouter au moins les informations requises).

## contraintes
- On peut avoir plusieurs mises à jour d'une balise ou d'une traversée pour un navire, il convient donc de garder les dernières données en haut, mais aussi de conserver les mises à jour précédentes.
- un même dossier peut contenir plusieurs balises, il faut générer pour chaque balise un descriptif du dossier, et y inclre les numéros éventuels des autres balises déclarées.
- Les exports de démarches ne sont pas très bons, comme ceux que tu as en exemple. Il y a du croisement de bases à faire
### mise en oeuvre
- Le code capable de faire cela devra être compatible avec mon code outils-cross sur github, auteur babolab.
- il est envisagé ensuite une focntionnalité sur grist avec one trick pony
- il ne faut exporter que les dossiers pour lesquels la case "Entré dans Seamis" n'est pas déjà cochée.

---

# Précisions (questions/réponses du 3 octobre 2026)

## Source des données
- **Entrée : l'export xlsx/ods de démarches-simplifiées**, téléchargé à la main par l'opérateur.
  - L'export CSV ne suffit pas : il ne contient pas les **champs répétables** (balises, équipage, contacts à terre), ni le GSM du bord.
  - L'export xlsx/ods met chaque bloc répétable dans un onglet séparé, relié au n° de dossier : c'est là que se fait le « croisement de bases ».
  - Le ZIP d'export ne contient que les PDF et les pièces jointes, pas de tableur.

### Structure de l'export ods (constatée le 3 octobre 2026)
| Onglet | Contenu | Jointure |
|---|---|---|
| `Dossiers` | 1 ligne par dossier : demandeur, état, dates, navire, communications (hors GSM), programme, « Entré dans Seamis? » | `N° dossier` (attention : espace insécable après « N° ») |
| `(6276262) Telephones portables` | Nom et prénom de la personne utilisant le téléphone, Numéro de téléphone GSM | `Dossier ID` + `Ligne` |
| `(6276266) Balises` | Type de balise, Numéro hexadécimal (HEXA ID) de la balise, MMSI éventuel de la balise | `Dossier ID` + `Ligne` |
| `(6276282) Membre d'equipage` | Nom et prénom, Statut à bord, Âge, Expérience nautique, Nationalité, Numéro(s) de téléphone | `Dossier ID` + `Ligne` |
| `(6276292) Contact a terre` | Nom et prénom, Numéro de téléphone, Adresse électronique, Lien avec l'équipage, Commentaire libre | `Dossier ID` + `Ligne` |
| `Etablissements`, `Avis` | Vides, ignorés | |

- Les colonnes des blocs sont préfixées « (Bloc répétable Xxx) – ».
- Le nombre entre parenthèses dans les noms d'onglet est l'identifiant du champ dans la démarche. Il change si le formulaire est modifié. **Le parsing reconnaît donc les onglets et les colonnes par leur libellé**, sans tenir compte de l'identifiant, des accents ni de la casse.
- Les colonnes de l'onglet `Dossiers` diffèrent légèrement de celles du CSV (par exemple « Déposé avec FranceConnect »). **Le parsing travaille par nom de colonne, jamais par position.**
- Un dossier peut n'avoir aucune ligne dans un bloc. Dans l'exemple, seul le dossier 10000002 a des balises et un équipage : les autres ont été déposés avant l'ajout de ces blocs au formulaire.
- Les dates sont du texte au format `AAAA-MM-JJ HH:MM:SS +0200`, et les téléphones des chiffres sans espace (`0600000000`).

### Booléens dans l'export ods (vérifié sur l'export du 3 octobre 2026 à 14:08)
- Les cellules booléennes (« Archivé », « Dépôt pour un tiers », « Entré dans Seamis? »…) **ne contiennent aucun texte**. Leur valeur est uniquement dans l'attribut XML :
  `<table:table-cell office:value-type="boolean" office:value="1">` pour vrai, `office:value="0"` pour faux.
  - C'est une forme non standard : la norme ODF prévoit `office:boolean-value="true"`.
  - **Le parseur doit donc lire l'attribut `office:value`**, et non le texte de la cellule. À vérifier avec la bibliothèque retenue (SheetJS, par exemple) : un lecteur qui ne regarde que le texte verra toutes ces cases vides.
- **« Entré dans Seamis? »** prend trois formes :
  - cochée : booléen `1` (exemple : dossier 10000001) ;
  - jamais cochée : cellule totalement vide, sans type ;
  - décochée après avoir été cochée : probablement booléen `0`, non observé.
- **Règle :** un dossier est exclu si et seulement si la case vaut booléen `1`. Tout le reste (vide ou `0`) est traité.
- Exemple utile pour les tests : le 10000001 (*NAVIRE A*) est coché, mais sa mise à jour 10000002 ne l'est pas. Elle doit donc être traitée.
- Pas d'appel à l'API démarches-simplifiées, donc pas de jeton à gérer.

## Forme de l'outil
- **Nouveau module de [outils_cross](https://github.com/babolab/outils_cross)** (React + TypeScript + Vite), entièrement dans le navigateur.
  - Aucune donnée personnelle ne quitte le poste, et rien n'est stocké après la fermeture de l'onglet.
- **Le cœur du traitement est écrit en TypeScript pur**, sans dépendance à React : lecture de l'export, normalisation, contrôles, génération des textes.
  - But : pouvoir le réutiliser plus tard dans un widget Grist / One Trick Pony.
  - L'interface React n'est qu'une couche d'affichage.

## Sélection des dossiers
- Seuls les dossiers dont la case **« Entré dans Seamis? » n'est pas cochée** sont traités.
- **C'est l'opérateur qui coche la case**, à la main dans démarches-simplifiées, une fois la saisie dans Seamis faite. L'outil ne la coche pas.
- L'historique repose donc sur ce cochage : un dossier déjà coché n'est plus proposé.
- **Tous les états de dossier sont traités** (en construction, en instruction, accepté, refusé, classé sans suite…), **sauf les dossiers archivés**.
  - En principe, les dossiers archivés ne figurent pas dans les exports : *à vérifier*. S'ils y sont, la colonne « Archivé » (booléen `1`) les exclut.

## Mises à jour
- Une mise à jour arrive sous la forme d'un **nouveau dossier** et non d'une modification de l'ancien.
  - Exemple : le dossier 10000002 reprend le navire *NAVIRE A*, déjà déclaré dans le 10000001.
- L'outil traite chaque dossier non coché indépendamment, sans connaître ce qui est déjà dans Seamis.
- **Dans Seamis, l'opérateur colle le nouveau texte en tête de l'entrée balise existante**, au-dessus des versions précédentes, qui sont conservées.
- Chaque texte est encadré par un délimiteur d'ouverture et un de fermeture, qui portent le n° de dossier, pour distinguer les ajouts empilés (voir le format ci-dessous).

## Entrées balises (copier-coller manuel dans Seamis)
- L'outil affiche une liste d'entrées **clé + texte**, chacune avec un bouton « copier ».
- **Règle de clé :**
  - une entrée par identifiant ;
  - une balise qui a à la fois un **HEXID et un MMSI** donne **deux entrées** (une clée HEXID, une clée MMSI) avec le même texte, pour la retrouver quelle que soit l'alerte (406 ou AIS) ;
  - le **MMSI du navire** n'est pas une clé de balise ; il figure dans le texte.
- **Normalisation des clés : aucun espace** (ni espace, ni espace insécable, ni tiret ou point séparateur).
  - HEXID en majuscules ;
  - MMSI en chiffres seuls.
  - Les identifiants cités dans le texte (MMSI du navire, autres balises) suivent la même règle.
- **Contenu du texte de chaque balise :**
  - n° de dossier démarches-simplifiées et date de dépôt ;
  - **personne du bord : le membre d'équipage dont le statut est « Chef de bord »**, avec son téléphone, **à défaut le demandeur du dossier**. Le libellé exact du statut n'est pas déterminant : l'opérateur consultera de toute façon le PDF du dossier ;
  - moyens de contact du bord : GSM (et son utilisateur), Iridium/satellite, accès internet satellitaire, VHF et autres équipements, habitudes de correspondance avec la terre ;
  - **description du navire** : nom, type et modèle, longueur, couleur et description de la coque, immatriculation, pavillon, port d'attache, MMSI, indicatif d'appel ;
  - **programme de navigation** : port et date de départ, port et date d'arrivée, détail du trajet ;
  - **contacts à terre** : nom, téléphone, e-mail, lien avec l'équipage ;
  - **les autres balises du même dossier** (type + HEXID/MMSI) ;
  - **une mention renvoyant au PDF** : « Détails complets : consulter le PDF de la démarche déposée (fiche navire Seamis) ou le demander au CROSS Jobourg. »
- L'équipage complet n'est pas repris, il reste consultable dans le PDF joint au navire.

### Format du texte (version courte, première itération)
- **10 lignes maximum entre les délimiteurs**, soit 12 lignes au plus avec ceux-ci.
- Une ligne n'est écrite que si elle a au moins une valeur. Dans une ligne, les éléments vides sont omis, sans « / » ni « ? ».
- Les textes libres longs (détail du trajet, description de la coque) sont tronqués avec « … » pour tenir sur une ligne (environ 100 caractères, à ajuster).
- Si plusieurs contacts à terre sont déclarés, seul le premier figure sur sa ligne, suivi de « (+N autres, voir PDF) ».
- **Dates :** `JJ/MM/AAAA` pour les dates du programme (sans heure dans le formulaire) ; `JJ/MM/AAAA HH:MM UTC` pour la date de dépôt, convertie depuis l'heure locale de l'export (`+0200` → UTC).
- **Délimiteurs** : une ligne d'ouverture avec le n° de dossier et la date de dépôt, une ligne de fermeture avec le n° de dossier.

Exemple (dossier 10000002, entrée clée sur le HEXID de l'EPIRB) :
```
===== TNAV 10000002 - déposée le 03/10/2026 11:33 UTC =====
Navire : NAVIRE A - J boats J92 - 9,12 m - immat. XX00000 - pavillon Français
MMSI navire 227000001 - indicatif FAX0000
À bord : Prénom NOM (demandeur) - GSM 0600000000
Départ : Cherbourg le 29/09/2026 - Arrivée : Cherbourg le 30/09/2026
Trajet : Tour de la rade
Contact à terre : CROSS Jobourg (Travail) - 0233521616
Cette balise : EPIRB HEXID ESSAI7GRE659ZSD / MMSI 227123456
Autres balises : PLB HEXID ESSAIY75D69A4DE ; MOB AIS MMSI 227123789
Détails complets : consulter le PDF de la démarche déposée (fiche navire Seamis) ou le demander au CROSS Jobourg.
===== fin TNAV 10000002 =====
```
- Ordre de priorité des lignes si la limite de 10 est atteinte (de la plus importante à la moins importante) : délimiteurs, navire, personne à bord, contact à terre, cette balise, autres balises, mention PDF, programme, trajet, MMSI navire et indicatif, autres moyens de communication (Iridium, Starlink, VHF, vacations). Les lignes de moindre priorité sont supprimées en premier.

## PDF
- L'outil ne traite pas les PDF.
- L'opérateur les prend directement dans le ZIP démarches-simplifiées et les verse dans l'entrée « navire » de Seamis.

## Contrôles et qualité des données
- **Les anomalies sont signalées sans bloquer** : l'entrée est quand même générée, avec un avertissement visible, et l'opérateur décide.
- **Valeurs traitées comme vides :** « / », « ? », « Non communiqué », « - », « RAS », les chaînes vides et celles qui ne contiennent que des espaces, ainsi que les suites de zéros (vues dans « Nom et prénom de la personne utilisant le téléphone » : `0000000000`).
- « Moi » comme utilisateur du GSM désigne le demandeur.
- **Contrôles prévus :**
  - HEXID : 15 caractères hexadécimaux (la forme à 22 caractères reste à confirmer) ;
  - MMSI : 9 chiffres ;
  - cohérence du pavillon avec le MID du MMSI ;
  - dossier sans aucune balise ;
  - absence de contact à terre.

## Données d'exemple (`exemples d'exports/`, non versionné)
- **Réels :** noms, MMSI et immatriculations des navires. Ce sont des données personnelles, d'où leur exclusion du dépôt (`.gitignore`).
- **Fictifs :** MMSI et HEXID des balises.
  - Les HEXID de test (`essai7gre659zsd`, `essaiy75d69a4de`) font bien 15 caractères mais ne sont pas hexadécimaux. Ils serviront de cas de test pour l'avertissement « HEXID invalide ».
- Fichiers d'exemple : CSV (les deux fichiers sont identiques), ZIP (PDF et photos), un PDF isolé, l'export ods de 14:01 (aucun dossier coché) et celui de 14:08 (dossier 10000001 coché « Entré dans Seamis? »).
- Démarches-simplifiées peut resservir un export déjà généré : pour avoir des données à jour, il faut demander un nouvel export (l'heure figure dans le nom du fichier).
- Pour les tests automatisés du module, il faudra un jeu de données **anonymisé**, versionnable, construit à partir de ces exemples.
- Les exemples cités dans cette spécification sont anonymisés (n° de dossier, navire, identité, téléphone), le dépôt étant public.

## Questions résolues (3 octobre 2026)
1. Libellé « Chef de bord » : non déterminant, le PDF sera consulté. Repli sur le demandeur, et mention du PDF dans le texte.
2. Contraintes du texte libre Seamis : toujours inconnues. On commence court (10 lignes entre délimiteurs).
3. Normalisation des clés : sans espace, HEXID en majuscules.
4. Dates : `JJ/MM/AAAA`, et heure de dépôt en UTC.
5. États traités : tous, sauf les archivés.
6. Valeur de la case « Entré dans Seamis? » : voir « Booléens dans l'export ods ».

## Points à vérifier
- Les dossiers archivés sont-ils absents des exports ? oui, les acceptés aussi
- Le champ texte libre de Seamis accepte-t-il les retours à la ligne et les caractères accentués, et a-t-il une longueur maximale ? 
- Les HEXID à 22 caractères (forme longue) sont-ils possibles dans le formulaire ? non
- La décision de supprimer les lignes de moindre priorité est-elle satisfaisante une fois testée sur des dossiers réels ? à vérifier
