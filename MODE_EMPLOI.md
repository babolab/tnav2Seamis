# Mode d'emploi : TNAV → Seamis

Ce guide s'adresse aux opérateurs du CROSS Jobourg chargés de reporter dans Seamis les déclarations de traversée (TNAV) déposées sur démarches-simplifiées.

**En résumé :** télécharger l'export .ods, le déposer dans l'outil, copier chaque clé et chaque texte dans la base balises de Seamis, verser les PDF au navire, puis cocher « Entré dans Seamis » dans démarches-simplifiées.

Outil en ligne : <https://babolab.github.io/tnav2Seamis/>

> Le fichier est traité dans votre navigateur. Aucune donnée n'est transmise ni conservée : fermer l'onglet efface tout.

---

## 1. Télécharger l'export depuis démarches-simplifiées

1. Dans démarches-simplifiées, ouvrir la démarche **Déclaration de traversée**.
2. Demander un **nouvel export au format ODS** (tableur).
   - Ne pas prendre le CSV : il ne contient ni les balises, ni l'équipage, ni les contacts à terre.
   - Démarches-simplifiées peut proposer un export déjà généré. Vérifier l'heure dans le nom du fichier (`dossiers_declaration-traversee_AAAA-MM-JJ_HH-MM.ods`) et en demander un nouveau s'il n'est pas récent.
3. Télécharger aussi le **ZIP** de l'export : il contient les PDF des dossiers (étape 4).

## 2. Charger l'export dans l'outil

Ouvrir l'outil et **glisser-déposer le fichier .ods** dans la zone prévue, ou cliquer dessus pour le choisir.

L'outil affiche alors :

| Indicateur | Signification |
|---|---|
| Dossiers dans l'export | nombre total de dossiers lus |
| Déjà dans Seamis | dossiers dont la case « Entré dans Seamis? » est cochée : ignorés |
| Dossiers à traiter | dossiers non cochés et non archivés |
| Entrées balises | nombre de clés à saisir dans Seamis |
| Saisies cochées | votre avancement (cases « Saisie dans Seamis ») |
| Erreurs | anomalies bloquantes pour une entrée (voir § 5) |

Tous les états de dossier sont traités (en construction, en instruction, accepté…), sauf les dossiers archivés.

## 3. Saisir les entrées dans la base balises de Seamis

Chaque carte correspond à **une clé** : un HEXID (balise 406 MHz) ou un MMSI (balise AIS).
Une balise qui a les deux donne **deux cartes au même texte**, pour être retrouvée quelle que soit l'alerte reçue.

Pour chaque carte :

1. Cliquer sur **Copier la clé** et la coller dans le champ clé de la base balises de Seamis.
   - Si la balise **n'existe pas** dans Seamis : créer l'entrée.
   - Si la balise **existe déjà** : l'ouvrir.
2. Cliquer sur **Copier le texte** et le coller dans le champ texte :
   - nouvelle balise : coller le texte tel quel ;
   - balise existante : coller le texte **en tête**, au-dessus du texte existant. **Ne rien effacer** : les déclarations précédentes doivent être conservées.
3. Cocher **Saisie dans Seamis** sur la carte pour suivre votre avancement. La carte s'estompe.
   - Cette case ne sert qu'à vous repérer : elle n'est pas enregistrée et disparaît si vous rechargez la page ou un autre fichier.

Si la copie échoue (message rouge), sélectionner le texte à la main et le copier avec Ctrl+C.

### Lire le texte d'une entrée

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

- Les lignes `=====` encadrent chaque déclaration et portent le n° de dossier. Dans Seamis, la déclaration la plus récente est toujours en haut.
- La date de dépôt est en **UTC**. Les dates du programme sont au format JJ/MM/AAAA.
- « À bord » cite le chef de bord déclaré dans l'équipage, à défaut le demandeur du dossier.
- Un seul contact à terre est cité ; s'il y en a d'autres, la ligne se termine par « (+N autres, voir PDF) ».
- Le texte est limité à 10 lignes : les informations les moins utiles (autres moyens de communication, indicatif…) peuvent être omises. L'équipage complet et le détail sont dans le **PDF du dossier**.

### Plusieurs dossiers pour la même balise

Une mise à jour de traversée arrive sous la forme d'un **nouveau dossier**. Si deux dossiers à traiter concernent la même balise, l'outil réunit leurs textes dans **une seule carte**, le plus récent en tête : il suffit de coller le tout une fois.

## 4. Verser les PDF au navire

L'outil ne traite pas les PDF. Pour chaque dossier de la liste **Dossiers à traiter** :

1. Retrouver le PDF du dossier dans le ZIP téléchargé à l'étape 1 (le n° de dossier figure dans le nom du fichier).
2. Le verser dans les **pièces jointes de l'entrée navire** dans Seamis.

Les dossiers sans balise apparaissent aussi dans cette liste : ils ne donnent aucune entrée balise, mais leur PDF doit quand même être versé au navire.

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

1. Cliquer sur **Copier les n° de dossier** au-dessus de la liste des dossiers à traiter, pour les avoir sous la main.
2. Dans démarches-simplifiées, cocher la case **« Entré dans Seamis? »** de chacun de ces dossiers.

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
