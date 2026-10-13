# Mode d'emploi : TNAV → Seamis

Ce guide s'adresse aux opérateurs du CROSS Jobourg chargés de reporter dans Seamis les déclarations de traversée (TNAV) déposées sur démarches-simplifiées.

**En résumé :** télécharger l'export .ods et son .zip, les déposer dans l'outil, copier chaque clé et chaque texte dans le référentiel balises de Seamis, retrouver chaque navire avec la recherche fournie et y verser le PDF et les pièces jointes du dossier, puis cocher « Entré dans Seamis » dans démarches-simplifiées.

Référentiel Seamis (réseau interne) : [balises](http://10.50.204.34/referentiel-client/#/beacons) · [navires](http://10.50.204.34/referentiel-client/#/ships)

Outil en ligne : <https://babolab.github.io/tnav2Seamis/>

> Le fichier est traité dans votre navigateur. Aucune donnée n'est transmise ni conservée : fermer l'onglet efface tout.

---

## 1. Télécharger l'export depuis démarches-simplifiées

1. Dans démarches-simplifiées, ouvrir la démarche **Déclaration de traversée**.
2. Demander un **nouvel export au format ODS** (tableur).
   - Ne pas prendre le CSV : il ne contient ni les balises, ni l'équipage, ni les contacts à terre.
   - Démarches-simplifiées peut proposer un export déjà généré. Vérifier l'heure dans le nom du fichier (`dossiers_declaration-traversee_AAAA-MM-JJ_HH-MM.ods`) et en demander un nouveau s'il n'est pas récent.
3. Télécharger aussi le **ZIP** de l'export : il contient le PDF et les pièces jointes (photos…) de chaque dossier (étape 4).

## 2. Charger l'export dans l'outil

Ouvrir l'outil et **glisser-déposer le fichier .ods et le fichier .zip** n'importe où dans la page (ensemble ou l'un après l'autre, même après avoir fait défiler la page), ou cliquer sur la zone de dépôt pour les choisir. Sous la zone de dépôt, deux pastilles indiquent si chaque fichier est chargé (vert) ou reste à déposer (rouge).

L'outil affiche alors :

| Indicateur | Signification |
|---|---|
| Dossiers dans l'export | nombre total de dossiers lus |
| Déjà dans Seamis | dossiers dont la case « Entré dans Seamis? » est cochée : ignorés |
| Dossiers à traiter | dossiers non cochés et non archivés |
| Entrées balises | nombre de clés à saisir dans Seamis |
| Erreurs | anomalies bloquantes pour une entrée (voir § 5) |

Tous les états de dossier sont traités (en construction, en instruction, accepté…), sauf les dossiers archivés.

Le cadre **Actions à faire** rappelle les étapes (1 balises, 2a pièces jointes des navires, 2b case démarches-simplifiées) et suit votre avancement d'après les cases que vous cochez sur les cartes. Une étape reste **rouge** tant qu'il reste à faire et passe au **vert** une fois terminée.

La page comporte ensuite deux parties de couleurs différentes : **1. Balises Seamis** (bleu) et **2. Navires Seamis** (orange).

## 3. Saisir les entrées dans le référentiel balises de Seamis

Chaque carte correspond à **une clé** : un HEXID (balise 406 MHz) ou un MMSI (balise AIS).
Une balise qui a les deux donne **deux cartes au même texte**, pour être retrouvée quelle que soit l'alerte reçue.

Pour chaque carte, suivre les trois boutons numérotés :

1. **Copier la clé**.
2. **Ouvrir le référentiel balises** (nouvel onglet) et y coller la clé.
   - Si la balise **n'existe pas** dans Seamis : créer l'entrée.
   - Si la balise **existe déjà** : l'ouvrir.
3. **Copier le texte** et le coller dans le champ texte :
   - nouvelle balise : coller le texte tel quel ;
   - balise existante : coller le texte **en tête**, au-dessus du texte existant. **Ne rien effacer** : les déclarations précédentes doivent être conservées.

Cocher ensuite **Saisie dans Seamis** sur la carte pour suivre votre avancement. La carte s'estompe.
   - Cette case ne sert qu'à vous repérer : elle n'est pas enregistrée et disparaît si vous rechargez la page ou un autre fichier.

Si la copie échoue (message rouge), sélectionner le texte à la main et le copier avec Ctrl+C.

### Lire le texte d'une entrée

```
===== TNAV 10000002 - déposée le 03/10/2026 11:33 UTC =====
Navire : NAVIRE A
Modèle : J boats J92
Longueur : 9,12 m
Immatriculation : XX00000
Pavillon : Français
MMSI navire : 227000001
Indicatif : FAX0000

À bord : Prénom NOM (demandeur) - GSM 0600000000
Départ : Cherbourg le 29/09/2026 - Arrivée : Cherbourg le 30/09/2026
Trajet : Tour de la rade
Contact à terre : CROSS Jobourg (Travail) - 0233521616

Autre balise : PLB HEXID ESSAIY75D69A4DE
Autre balise : MOB AIS MMSI 227123789
Détails complets : consulter le PDF de la démarche déposée (fiche navire Seamis) ou le demander au CROSS Jobourg.
===== fin TNAV 10000002 =====
```

- Les lignes `=====` encadrent chaque déclaration et portent le n° de dossier. Dans Seamis, la déclaration la plus récente est toujours en haut.
- Le texte est découpé en trois parties séparées par une ligne vide : **le navire**, **les personnes et le trajet**, **les autres balises et le renvoi au PDF**. Chaque information du navire et chaque autre balise du dossier occupe sa propre ligne. La balise de l'entrée n'est pas répétée : c'est la clé.
- La date de dépôt est en **UTC**. Les dates du programme sont au format JJ/MM/AAAA.
- « À bord » cite le chef de bord déclaré dans l'équipage, à défaut le demandeur du dossier.
- Un seul contact à terre est cité ; s'il y en a d'autres, la ligne se termine par « (+N autres, voir PDF) ».
- Le texte est limité à 25 lignes (lignes vides non comptées) : au-delà, les informations les moins utiles (description de la coque, port d'attache, autres moyens de communication…) sont omises. L'équipage complet et le détail sont dans le **PDF du dossier**.

### Plusieurs dossiers pour la même balise

Une mise à jour de traversée arrive sous la forme d'un **nouveau dossier**. Si deux dossiers à traiter concernent la même balise, l'outil réunit leurs textes dans **une seule carte**, le plus récent en tête : il suffit de coller le tout une fois.

## 4. Verser le PDF et les pièces jointes au navire

Chaque dossier à traiter a sa carte dans la partie **2. Navires Seamis**, avec le nom du navire en gros à gauche et le n° de démarche à droite. Pour chacun :

1. **Copier la recherche**, puis **ouvrir le référentiel navires** et y coller la chaîne pour retrouver le navire. Elle reprend les identifiants du navire séparés par une virgule, par exemple :
   ```
   mmsi:227000001, cs:FAX0000, immat:00000, nom:NAVIRE A
   ```
   - Les critères non renseignés dans le dossier sont omis.
   - MMSI, indicatif (`cs`) et immatriculation sont écrits sans espace ; l'indicatif et le nom sont en majuscules.
   - L'immatriculation est donnée sans les lettres du quartier maritime : « CH 123456 » devient `immat:123456`.
   - Si le dossier ne donne aucun identifiant du navire, la carte le signale : retrouver le navire à partir du PDF.
2. Le cadre **Pièces jointes** liste le PDF de la démarche et les autres fichiers du dossier (photos du navire…), lus dans le ZIP. Cliquer sur chaque fichier (ou **Tout télécharger**) pour l'enregistrer.
   - Avec Chrome ou Edge, les fichiers téléchargés peuvent être **glissés directement depuis la liste des téléchargements** (icône en haut à droite) vers la zone de dépôt de Seamis.
   - Si le navigateur demande l'autorisation de télécharger plusieurs fichiers, l'accepter.
3. Les verser dans les **pièces jointes de l'entrée navire** dans Seamis.
4. Cocher **PDF et pièces jointes versés au navire dans Seamis** sur la carte.

Si le ZIP n'a pas été déposé, la carte le rappelle. Si le ZIP ne contient aucun fichier pour le dossier, vérifier qu'il vient bien du même export que le .ods.

Les dossiers sans balise apparaissent aussi dans cette liste : ils ne donnent aucune entrée balise, mais leur PDF doit quand même être versé au navire.

Comme la case « Saisie dans Seamis » des entrées balises, ces cases ne servent qu'à suivre votre avancement : elles ne sont pas enregistrées.

## 5. Vérifier les anomalies

Les anomalies sont **signalées sans bloquer** : l'entrée est générée et c'est à vous de décider. Elles apparaissent sur la carte concernée et dans la colonne « Anomalies » de la liste des dossiers.

| Couleur | Gravité | Exemples |
|---|---|---|
| Rouge | Erreur | balise sans HEXID ni MMSI : aucune entrée possible, voir le PDF |
| Orange | Avertissement | HEXID invalide (15 caractères hexadécimaux 0-9 A-F attendus), MMSI invalide (9 chiffres), MOB AIS dont le MMSI ne commence pas par 972 (SART AIS : 970, EPIRB AIS : 974), pavillon incohérent avec le MMSI du navire, aucune balise, aucun contact à terre |
| Bleu | Information | date de dépôt illisible, identifiant déclaré deux fois, balise présente dans plusieurs dossiers |

En cas de doute sur un identifiant, se reporter au PDF du dossier, voire contacter le déclarant.

Certaines réponses du formulaire sont considérées comme vides et n'apparaissent pas dans le texte : « / », « ? », « - », « RAS », « Néant », « Aucun », « N/A », « NC », « Non communiqué », « 0000000000 ».

## 6. Cocher « Entré dans Seamis » dans démarches-simplifiées

Une fois les entrées saisies et les PDF versés :

1. Cliquer sur **Copier les n° de démarche** à côté du titre de la partie 2, pour les avoir sous la main.
2. Dans démarches-simplifiées, cocher la case **« Entré dans Seamis? »** de chacun de ces dossiers.
3. Cocher la case correspondante sur la carte du dossier dans l'outil : la carte s'estompe quand le PDF est versé et la case cochée.

**C'est cette case qui fait l'historique.** L'outil ne la coche pas : tant qu'elle n'est pas cochée, le dossier sera de nouveau proposé au prochain export, et ses textes seraient collés une deuxième fois dans Seamis.

---

## Questions fréquentes

**L'outil affiche « Déposez l'export … au format .ods ».**
Le fichier déposé n'est pas un .ods (souvent le CSV). Demander l'export au format ODS.

**Un dossier que je viens de déclarer n'apparaît pas.**
L'export est probablement ancien : en demander un nouveau et vérifier l'heure dans le nom du fichier.

**Un dossier déjà saisi réapparaît.**
La case « Entré dans Seamis? » n'a pas été cochée dans démarches-simplifiées, ou l'export date d'avant le cochage. Ne pas recoller le texte : vérifier dans Seamis que la déclaration y figure (son n° est dans les lignes `=====`), puis cocher la case.

**J'ai coché « Entré dans Seamis? » par erreur.**
La décocher dans démarches-simplifiées : le dossier sera de nouveau proposé au prochain export.

**Le navire a envoyé une mise à jour.**
Elle arrive comme un nouveau dossier. La traiter comme les autres : coller le nouveau texte **en tête** de l'entrée balise existante, sans effacer l'ancien.
