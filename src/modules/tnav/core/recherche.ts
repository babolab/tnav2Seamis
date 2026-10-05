// Champ de recherche Seamis pour retrouver l'entrée navire d'un dossier (et y verser le PDF).
//
// Format attendu par Seamis : « mmsi:227123456, cs:FAG1234, immat:123456, nom:LE NOM DU NAVIRE »

import type { Dossier } from './types'

export type PrefixeRecherche = 'mmsi' | 'cs' | 'immat' | 'nom'

export interface CritereRecherche {
  prefixe: PrefixeRecherche
  valeur: string
}

export interface RechercheSeamis {
  /** Critères non vides, dans l'ordre de la chaîne de recherche. */
  criteres: CritereRecherche[]
  /** Chaîne complète à coller dans Seamis, '' si aucun critère. */
  texte: string
}

/** Identifiant : sans espace ni séparateur, en majuscules. */
const identifiant = (v: string) => v.replace(/[\s.\-_]/g, '').toUpperCase()

/** Immatriculation sans les lettres du quartier maritime : « CH 123456 » -> « 123456 ». */
const immatriculation = (v: string) => {
  const id = identifiant(v)
  return id.replace(/^[A-Z]{1,3}(?=\d)/, '')
}

/** Nom : en majuscules, sans virgule (séparateur des critères), espaces simples. */
const nom = (v: string) => v.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase()

export const critereTexte = (c: CritereRecherche) => `${c.prefixe}:${c.valeur}`

export function rechercheSeamis(d: Dossier): RechercheSeamis {
  const n = d.navire
  const candidats: CritereRecherche[] = [
    { prefixe: 'mmsi', valeur: n.mmsi },
    { prefixe: 'cs', valeur: identifiant(n.indicatif) },
    { prefixe: 'immat', valeur: immatriculation(n.immatriculation) },
    { prefixe: 'nom', valeur: nom(n.nom) },
  ]
  const criteres = candidats.filter(c => c.valeur)
  return { criteres, texte: criteres.map(critereTexte).join(', ') }
}
