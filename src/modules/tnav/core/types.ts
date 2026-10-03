// Modèle des données issues de l'export ods démarches-simplifiées (TNAV)
// et des entrées balises à saisir dans Seamis.

/** Valeur d'une cellule : texte, booléen, ou null si la cellule est vide. */
export type Cellule = string | boolean | null

export interface Feuille {
  nom: string
  lignes: Cellule[][]
}

export interface Balise {
  ligne: number
  type: string
  hexId: string // normalisé (majuscules, sans espace), '' si absent
  mmsi: string  // normalisé (chiffres seuls), '' si absent
}

export interface Telephone {
  utilisateur: string
  numero: string
}

export interface MembreEquipage {
  nom: string
  statut: string
  age: string
  experience: string
  nationalite: string
  telephones: string
}

export interface ContactTerre {
  nom: string
  telephone: string
  email: string
  lien: string
  commentaire: string
}

export interface Dossier {
  numero: string
  etat: string
  archive: boolean
  entreDansSeamis: boolean
  /** Date de dépôt, null si absente ou illisible. */
  dateDepot: Date | null
  demandeur: { nom: string; prenom: string }
  navire: {
    nom: string
    marque: string
    modele: string
    longueur: string
    tirantEau: string
    immatriculation: string
    portAttache: string
    annee: string
    pavillon: string
    description: string
    mmsi: string
    indicatif: string
  }
  communications: {
    iridium: string
    internetSatellite: string
    autres: string
    habitudes: string
  }
  programme: {
    portDepart: string
    dateDepart: string
    portArrivee: string
    dateArrivee: string
    trajet: string
  }
  infosEquipage: string
  telephones: Telephone[]
  balises: Balise[]
  equipage: MembreEquipage[]
  contactsTerre: ContactTerre[]
}

export type Gravite = 'erreur' | 'avertissement' | 'info'

export interface Anomalie {
  gravite: Gravite
  dossier: string
  message: string
}

export type TypeCle = 'HEXID' | 'MMSI'

/** Une entrée de la base balises Seamis : une clé et le texte à coller. */
export interface EntreeBalise {
  cle: string
  typeCle: TypeCle
  typeBalise: string
  /** Dossiers contributeurs, du plus récent au plus ancien. */
  dossiers: string[]
  nomNavire: string
  texte: string
  /** Anomalies propres à cette clé (format invalide, préfixe AIS…). */
  anomalies: Anomalie[]
}

export type RaisonExclusion = 'entré dans Seamis' | 'archivé'

export interface ResultatTraitement {
  /** Nombre total de dossiers lus dans l'export. */
  totalDossiers: number
  /** Dossiers à traiter (case « Entré dans Seamis? » non cochée, non archivés). */
  dossiersATraiter: Dossier[]
  dossiersExclus: { numero: string; nomNavire: string; raison: RaisonExclusion }[]
  entrees: EntreeBalise[]
  /** Anomalies au niveau des dossiers (aucune balise, pas de contact à terre…). */
  anomalies: Anomalie[]
}
