// Construction des dossiers à partir des onglets de l'export ods démarches-simplifiées.
//
// Les onglets et les colonnes sont reconnus par leur libellé, jamais par leur position :
// les colonnes changent d'un format d'export à l'autre, et le nombre entre parenthèses
// des onglets de blocs répétables (« (6276266) Balises ») change si le formulaire est modifié.

import { cleComparaison, lireDateExport, nettoyer, normaliserHexId, normaliserMmsi } from './normalisation'
import type { Balise, Cellule, ContactTerre, Dossier, Feuille, MembreEquipage, Telephone } from './types'

/** Nom d'onglet sans l'identifiant de champ : « (6276266) Balises » -> « balises ». */
function nomOnglet(nom: string): string {
  return cleComparaison(nom.replace(/^\(\d+\)\s*/, ''))
}

/** Libellé de colonne sans le préfixe de bloc : « (Bloc répétable Balises) – Type de balise » -> « type de balise ». */
function nomColonne(libelle: string): string {
  return cleComparaison(libelle.replace(/^\(bloc r[ée]p[ée]table[^)]*\)\s*[–—-]\s*/i, ''))
}

/** Accès aux lignes d'un onglet par libellé de colonne. */
class Table {
  private index = new Map<string, number>()
  readonly lignes: Cellule[][]

  constructor(feuille: Feuille) {
    const [entete = [], ...lignes] = feuille.lignes
    entete.forEach((libelle, i) => {
      if (typeof libelle === 'string') {
        const cle = nomColonne(libelle)
        if (!this.index.has(cle)) this.index.set(cle, i)
      }
    })
    this.lignes = lignes
  }

  /** Indice de la première colonne dont le libellé correspond à l'un des candidats (égalité, sinon préfixe). */
  private colonne(candidats: string[]): number | undefined {
    for (const c of candidats.map(cleComparaison)) {
      if (this.index.has(c)) return this.index.get(c)
    }
    for (const c of candidats.map(cleComparaison)) {
      for (const [libelle, i] of this.index) if (libelle.startsWith(c)) return i
    }
    return undefined
  }

  aColonne(...candidats: string[]): boolean {
    return this.colonne(candidats) !== undefined
  }

  texte(ligne: Cellule[], ...candidats: string[]): string {
    const i = this.colonne(candidats)
    if (i === undefined) return ''
    const v = ligne[i]
    if (v == null) return ''
    return typeof v === 'boolean' ? (v ? 'true' : 'false') : v
  }

  booleen(ligne: Cellule[], ...candidats: string[]): boolean {
    const i = this.colonne(candidats)
    if (i === undefined) return false
    const v = ligne[i]
    if (typeof v === 'boolean') return v
    if (typeof v === 'string') return ['true', 'oui', '1', 'vrai'].includes(cleComparaison(v))
    return false
  }
}

const COL_NUMERO = ['N° dossier', 'Numéro de dossier', 'Dossier ID', 'ID']
const COL_SEAMIS = ['Entré dans Seamis?', 'Entré dans Seamis', 'Entre dans Seamis']

/** Lit tous les dossiers de l'export, sans filtrage. */
export function lireDossiers(feuilles: Feuille[]): Dossier[] {
  const feuilleDossiers = feuilles.find(f => nomOnglet(f.nom) === 'dossiers')
  if (!feuilleDossiers) {
    throw new Error("Onglet « Dossiers » introuvable : ce fichier n'est pas un export démarches-simplifiées.")
  }
  const t = new Table(feuilleDossiers)
  if (!t.aColonne(...COL_NUMERO)) throw new Error("Colonne « N° dossier » introuvable dans l'onglet « Dossiers ».")
  if (!t.aColonne(...COL_SEAMIS)) {
    throw new Error(
      "Colonne « Entré dans Seamis? » introuvable : impossible de savoir quels dossiers sont déjà traités.",
    )
  }

  const blocs = {
    telephones: lireBloc(feuilles, 'telephones portables'),
    balises: lireBloc(feuilles, 'balises'),
    equipage: lireBloc(feuilles, "membre d'equipage"),
    contacts: lireBloc(feuilles, 'contact a terre'),
  }

  const dossiers: Dossier[] = []
  for (const l of t.lignes) {
    const numero = t.texte(l, ...COL_NUMERO).trim()
    if (!numero) continue
    dossiers.push({
      numero,
      etat: nettoyer(t.texte(l, 'État du dossier')),
      archive: t.booleen(l, 'Archivé'),
      entreDansSeamis: t.booleen(l, ...COL_SEAMIS),
      dateDepot: lireDateExport(t.texte(l, 'Date de dépôt')),
      demandeur: {
        nom: nettoyer(t.texte(l, 'Nom [Identité du demandeur]', 'Nom')),
        prenom: nettoyer(t.texte(l, 'Prénom [Identité du demandeur]', 'Prénom')),
      },
      navire: {
        nom: nettoyer(t.texte(l, 'Nom du navire')),
        marque: nettoyer(t.texte(l, 'Marque / Chantier')),
        modele: nettoyer(t.texte(l, 'Type / Modèle')),
        longueur: nettoyer(t.texte(l, 'Longueur hors-tout')),
        tirantEau: nettoyer(t.texte(l, "Tirant d'eau")),
        immatriculation: nettoyer(t.texte(l, 'Immatriculation')),
        portAttache: nettoyer(t.texte(l, "Port d'attache")),
        annee: nettoyer(t.texte(l, 'Année de construction')),
        pavillon: nettoyer(t.texte(l, 'Pavillon')),
        description: nettoyer(t.texte(l, 'Description du navire')),
        mmsi: normaliserMmsi(t.texte(l, 'MMSI du navire')),
        indicatif: nettoyer(t.texte(l, "Indicatif d'appel")).replace(/\s/g, '').toUpperCase(),
      },
      communications: {
        iridium: nettoyer(t.texte(l, 'Numéro Iridium / satellitaire', 'Numéro Iridium')),
        internetSatellite: nettoyer(t.texte(l, 'Accès internet satellitaire')),
        autres: nettoyer(t.texte(l, 'Autres équipements de communication')),
        habitudes: nettoyer(t.texte(l, 'Habitudes de correspondance avec la terre')),
      },
      programme: {
        portDepart: nettoyer(t.texte(l, 'Port de départ')),
        dateDepart: nettoyer(t.texte(l, 'Date de départ prévue')),
        portArrivee: nettoyer(t.texte(l, "Port d'arrivée")),
        dateArrivee: nettoyer(t.texte(l, "Date d'arrivée prévue")),
        trajet: nettoyer(t.texte(l, 'Détail du trajet')),
      },
      infosEquipage: nettoyer(t.texte(l, "Informations complémentaires sur l'équipage")),
      telephones: lignesDuDossier(blocs.telephones, numero, (b, r): Telephone => ({
        utilisateur: nettoyer(b.texte(r, 'Nom et prénom de la personne utilisant le téléphone')),
        numero: nettoyer(b.texte(r, 'Numéro de téléphone GSM', 'Numéro de téléphone')),
      })).filter(tel => tel.numero),
      balises: lignesDuDossier(blocs.balises, numero, (b, r, ligne): Balise => ({
        ligne,
        type: nettoyer(b.texte(r, 'Type de balise')),
        hexId: normaliserHexId(b.texte(r, 'Numéro hexadécimal', 'HEXA ID', 'HEXID')),
        mmsi: normaliserMmsi(b.texte(r, 'MMSI éventuel de la balise', 'MMSI')),
      })).filter(bal => bal.type || bal.hexId || bal.mmsi),
      equipage: lignesDuDossier(blocs.equipage, numero, (b, r): MembreEquipage => ({
        nom: nettoyer(b.texte(r, 'Nom et prénom')),
        statut: nettoyer(b.texte(r, 'Statut à bord')),
        age: nettoyer(b.texte(r, 'Âge')),
        experience: nettoyer(b.texte(r, 'Expérience nautique')),
        nationalite: nettoyer(b.texte(r, 'Nationalité')),
        telephones: nettoyer(b.texte(r, 'Numéro(s) de téléphone', 'Numéro de téléphone')),
      })).filter(m => m.nom || m.telephones),
      contactsTerre: lignesDuDossier(blocs.contacts, numero, (b, r): ContactTerre => ({
        nom: nettoyer(b.texte(r, 'Nom et prénom')),
        telephone: nettoyer(b.texte(r, 'Numéro de téléphone')),
        email: nettoyer(b.texte(r, 'Adresse électronique')),
        lien: nettoyer(b.texte(r, "Lien avec l'équipage")),
        commentaire: nettoyer(b.texte(r, 'Commentaire libre')),
      })).filter(c => c.nom || c.telephone || c.email),
    })
  }
  return dossiers
}

function lireBloc(feuilles: Feuille[], nom: string): Table | null {
  const feuille = feuilles.find(f => nomOnglet(f.nom) === nom)
  return feuille ? new Table(feuille) : null
}

function lignesDuDossier<T>(
  bloc: Table | null,
  numero: string,
  lire: (bloc: Table, ligne: Cellule[], numLigne: number) => T,
): T[] {
  if (!bloc) return []
  return bloc.lignes
    .filter(r => bloc.texte(r, 'Dossier ID', 'N° dossier').trim() === numero)
    .map(r => ({ r, n: Number(bloc.texte(r, 'Ligne')) || 0 }))
    .sort((a, b) => a.n - b.n)
    .map(({ r, n }) => lire(bloc, r, n))
}
