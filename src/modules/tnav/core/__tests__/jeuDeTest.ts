// Export démarches-simplifiées fictif et anonymisé, reprenant la structure réelle (onglets, libellés)
// et les cas rencontrés dans les vrais exports.

import type { Cellule } from '../types'
import type { FeuilleTest } from './fabriquerOds'

const COLONNES_DOSSIERS = [
  'N° dossier', 'Adresse électronique', 'Nom [Identité du demandeur]', 'Prénom [Identité du demandeur]',
  'État du dossier', 'Archivé', 'Date de dépôt', 'Nom du navire', 'Marque / Chantier', 'Type / Modèle',
  'Longueur hors-tout', "Tirant d'eau", 'Immatriculation', "Port d'attache", 'Pavillon', 'Description du navire',
  'MMSI du navire', "Indicatif d'appel (Call Sign)", 'Numéro Iridium / satellitaire',
  'Accès internet satellitaire (Starlink, etc.)', 'Autres équipements de communication',
  'Habitudes de correspondance avec la terre', 'Port de départ', 'Date de départ prévue', "Port d'arrivée",
  "Date d'arrivée prévue", 'Détail du trajet', "Informations complémentaires sur l'équipage", 'Entré dans Seamis?',
] as const

type Colonne = (typeof COLONNES_DOSSIERS)[number]

function dossier(valeurs: Partial<Record<Colonne, Cellule>>): Cellule[] {
  return COLONNES_DOSSIERS.map(c => valeurs[c] ?? null)
}

const TRAJET_LONG =
  'Départ de Cherbourg, passage par Alderney puis Guernesey, escale à Saint-Peter-Port deux nuits, ' +
  'puis traversée vers Dartmouth et retour par Weymouth selon la météo.'

export const FEUILLES_TEST: FeuilleTest[] = [
  {
    nom: 'Dossiers',
    lignes: [
      [...COLONNES_DOSSIERS],
      // Déjà entré dans Seamis : exclu
      dossier({
        'N° dossier': '10000001', 'Nom [Identité du demandeur]': 'NOM', 'Prénom [Identité du demandeur]': 'Prénom',
        'État du dossier': 'En instruction', 'Archivé': false, 'Date de dépôt': '2026-09-28 19:40:49 +0200',
        'Nom du navire': 'NAVIRE A', 'MMSI du navire': '227000001', 'Pavillon': 'Français', 'Entré dans Seamis?': true,
      }),
      // Mise à jour du navire A, non cochée : à traiter (case jamais cochée = cellule vide)
      dossier({
        'N° dossier': '10000002', 'Nom [Identité du demandeur]': 'NOM', 'Prénom [Identité du demandeur]': 'Prénom',
        'État du dossier': 'En instruction', 'Archivé': false, 'Date de dépôt': '2026-10-03 13:33:55 +0200',
        'Nom du navire': 'NAVIRE A', 'Marque / Chantier': 'Chantier', 'Type / Modèle': 'Modèle 30',
        'Longueur hors-tout': '9.12', "Tirant d'eau": '2', 'Immatriculation': 'XX00000', "Port d'attache": '/',
        'Pavillon': 'Français', 'Description du navire': '?', 'MMSI du navire': '227000001',
        "Indicatif d'appel (Call Sign)": 'fax0000', 'Port de départ': 'Cherbourg', 'Date de départ prévue': '2026-09-29',
        "Port d'arrivée": 'Cherbourg', "Date d'arrivée prévue": '2026-09-30', 'Détail du trajet': 'Tour de la rade',
      }),
      // Valeurs « vides » saisies par l'usager, pavillon incohérent, pas de balise
      dossier({
        'N° dossier': '10000003', 'Nom [Identité du demandeur]': 'DUPONT', 'Prénom [Identité du demandeur]': 'Alice',
        'État du dossier': 'En construction', 'Archivé': false, 'Date de dépôt': '2026-09-28 19:46:17 +0200',
        'Nom du navire': 'NAVIRE B', 'Pavillon': 'FRANCAIS', 'MMSI du navire': '235 000 000',
        'Numéro Iridium / satellitaire': '/', 'Accès internet satellitaire (Starlink, etc.)': 'Non communiqué',
        'Autres équipements de communication': 'VHF', 'Habitudes de correspondance avec la terre': 'TOUS LES SOIRS VERS 21H30',
        'Entré dans Seamis?': false,
      }),
      // Archivé : exclu
      dossier({
        'N° dossier': '10000004', 'Nom du navire': 'NAVIRE C', 'Archivé': true,
        'Date de dépôt': '2026-09-20 10:00:00 +0200',
      }),
      // Chef de bord déclaré, plusieurs contacts, trajet long, balise sans identifiant
      dossier({
        'N° dossier': '10000005', 'Nom [Identité du demandeur]': 'MARTIN', 'Prénom [Identité du demandeur]': 'Paul',
        'État du dossier': 'En instruction', 'Date de dépôt': '2026-09-30 08:00:00 +0200',
        'Nom du navire': 'NAVIRE D', 'MMSI du navire': '227000005', 'Pavillon': 'France',
        'Port de départ': 'Cherbourg', 'Date de départ prévue': '2026-10-01', 'Détail du trajet': TRAJET_LONG,
        "Informations complémentaires sur l'équipage": '3 POB AVEC PSC1 ET PSE2',
      }),
      // Mise à jour du navire D : même SART AIS que le dossier 10000005
      dossier({
        'N° dossier': '10000006', 'Nom [Identité du demandeur]': 'MARTIN', 'Prénom [Identité du demandeur]': 'Paul',
        'État du dossier': 'En instruction', 'Date de dépôt': '2026-10-02 09:15:00 +0200',
        'Nom du navire': 'NAVIRE D', 'MMSI du navire': '227000005', 'Pavillon': 'France',
        'Port de départ': 'Cherbourg', 'Date de départ prévue': '2026-10-05',
      }),
    ],
  },
  { nom: 'Etablissements', lignes: [] },
  { nom: 'Avis', lignes: [] },
  {
    nom: '(6276262) Telephones portables',
    lignes: [
      ['Dossier ID', 'Ligne', '(Bloc répétable Téléphones portables) – Nom et prénom de la personne utilisant le téléphone.',
        '(Bloc répétable Téléphones portables) – Numéro de téléphone GSM'],
      ['10000002', '1', 'Moi', '0600000000'],
      ['10000003', '1', '0000000000', '0600000003'],
      ['10000005', '1', 'Paul MARTIN', '0600000005'],
    ],
  },
  {
    nom: '(6276266) Balises',
    lignes: [
      ['Dossier ID', 'Ligne', '(Bloc répétable Balises) – Type de balise',
        '(Bloc répétable Balises) – Numéro hexadécimal (HEXA ID) de la balise',
        '(Bloc répétable Balises) – MMSI éventuel de la balise'],
      ['10000002', '1', 'EPIRB', '9c7a 3e1b 2d4f 601', '227000001'],
      ['10000002', '2', 'PLB', 'essaiy75d69a4de', null],
      ['10000002', '3', 'MOB AIS', 'Non communiqué', '227000099'],
      ['10000005', '2', 'PLB', '/', null],
      ['10000005', '1', 'SART AIS', null, '970000001'],
      ['10000006', '1', 'SART AIS', null, '970 000 001'],
    ],
  },
  {
    nom: "(6276282) Membre d'equipage",
    lignes: [
      ['Dossier ID', 'Ligne', "(Bloc répétable Membre d'équipage) – Nom et prénom",
        "(Bloc répétable Membre d'équipage) – Statut à bord", "(Bloc répétable Membre d'équipage) – Âge",
        "(Bloc répétable Membre d'équipage) – Expérience nautique", "(Bloc répétable Membre d'équipage) – Nationalité",
        "(Bloc répétable Membre d'équipage) – Numéro(s) de téléphone"],
      ['10000002', '1', 'Jean TEST', 'Passager', null, null, null, '+3312345678'],
      ['10000005', '1', 'Marie SKIPPER', 'Chef de bord', '45', 'Confirmée', 'Française', '0611111111'],
      ['10000005', '2', 'Luc EQUIPIER', 'Équipier', null, null, null, null],
    ],
  },
  {
    nom: '(6276292) Contact a terre',
    lignes: [
      ['Dossier ID', 'Ligne', '(Bloc répétable Contact à terre) – Nom et prénom',
        '(Bloc répétable Contact à terre) – Numéro de téléphone', '(Bloc répétable Contact à terre) – Adresse électronique',
        "(Bloc répétable Contact à terre) – Lien avec l'équipage", '(Bloc répétable Contact à terre) – Commentaire libre'],
      ['10000002', '1', 'Contact A', '0200000000', null, 'Travail', null],
      ['10000003', '1', 'Contact B', '0200000003', 'contact.b@example.org', 'Conjointe', null],
      ['10000005', '1', 'Contact D1', '0200000051', null, 'Frère', null],
      ['10000005', '2', 'Contact D2', '0200000052', null, 'Sœur', null],
      ['10000005', '3', 'Contact D3', '0200000053', null, 'Ami', null],
    ],
  },
]
