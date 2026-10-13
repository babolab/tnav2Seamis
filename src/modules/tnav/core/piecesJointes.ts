// Lecture du ZIP des pièces jointes de démarches-simplifiées et rattachement aux dossiers.
//
// Structure de l'archive (export du 13/10/2026) :
//   export/dossier -34195533-2026-09-28-NOM-Prénom/tnav-34195533 - date2026-09-28.pdf
//   export/dossier -34195533-2026-09-28-NOM-Prénom/photos-du-navire-34195533- date 2026-09-28-01.png
// Le n° de dossier est lu dans le nom du sous-dossier, à défaut dans le nom du fichier.

import JSZip from 'jszip'

export interface PieceJointe {
  /** Nom du fichier, sans le chemin. */
  nom: string
  /** Chemin complet dans l'archive. */
  chemin: string
  taille: number
  type: string
  donnees: Uint8Array
}

/** Pièces jointes par n° de dossier, PDF de la démarche en tête. */
export type PiecesJointesParDossier = Map<string, PieceJointe[]>

const NUMERO_SOUS_DOSSIER = /^dossier\s*-?\s*(\d{5,})\b/i
const NUMERO_FICHIER = /-(\d{5,})\b/

const TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  odt: 'application/vnd.oasis.opendocument.text',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export function typeFichier(nom: string): string {
  const extension = nom.split('.').pop()?.toLowerCase() ?? ''
  return TYPES[extension] ?? 'application/octet-stream'
}

/** N° de dossier d'un chemin de l'archive, ou null s'il est introuvable. */
export function numeroDossierDuChemin(chemin: string): string | null {
  const segments = chemin.split('/').filter(Boolean)
  for (const s of segments.slice(0, -1)) {
    const m = s.match(NUMERO_SOUS_DOSSIER)
    if (m) return m[1]
  }
  return segments.at(-1)?.match(NUMERO_FICHIER)?.[1] ?? null
}

/** Le PDF récapitulatif de la démarche (tnav-<n°>…pdf) passe devant les autres pièces. */
const estPdfDemarche = (p: PieceJointe) => /^tnav-\d+.*\.pdf$/i.test(p.nom)

export async function lirePiecesJointes(donnees: ArrayBuffer | Uint8Array): Promise<{
  parDossier: PiecesJointesParDossier
  /** Fichiers dont le n° de dossier n'a pas été trouvé. */
  nonRattachees: string[]
}> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(donnees)
  } catch {
    throw new Error("Le fichier n'est pas une archive .zip valide.")
  }
  const parDossier: PiecesJointesParDossier = new Map()
  const nonRattachees: string[] = []
  for (const fichier of Object.values(zip.files)) {
    if (fichier.dir) continue
    const numero = numeroDossierDuChemin(fichier.name)
    if (!numero) {
      nonRattachees.push(fichier.name)
      continue
    }
    const contenu = await fichier.async('uint8array')
    const nom = fichier.name.split('/').pop()!
    const pieces = parDossier.get(numero) ?? []
    pieces.push({ nom, chemin: fichier.name, taille: contenu.length, type: typeFichier(nom), donnees: contenu })
    parDossier.set(numero, pieces)
  }
  for (const pieces of parDossier.values()) {
    pieces.sort((a, b) => Number(estPdfDemarche(b)) - Number(estPdfDemarche(a)) || a.nom.localeCompare(b.nom))
  }
  return { parDossier, nonRattachees }
}
