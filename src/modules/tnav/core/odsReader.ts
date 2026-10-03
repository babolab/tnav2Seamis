// Lecture d'un classeur OpenDocument (.ods) : décompression avec JSZip, puis analyse de content.xml.
//
// Particularité des exports démarches-simplifiées : les booléens sont écrits
//   <table:table-cell office:value-type="boolean" office:value="1"/>
// sans texte, et sans l'attribut standard office:boolean-value. On lit donc l'attribut,
// jamais le texte, pour les cellules booléennes.

import JSZip from 'jszip'
import type { Cellule, Feuille } from './types'

const NS_TABLE = 'urn:oasis:names:tc:opendocument:xmlns:table:1.0'
const NS_TEXT = 'urn:oasis:names:tc:opendocument:xmlns:text:1.0'
const NS_OFFICE = 'urn:oasis:names:tc:opendocument:xmlns:office:1.0'

/** Au-delà, une répétition de cellules ou de lignes vides est considérée comme du remplissage. */
const REPETITION_MAX = 1000

export type AnalyseurXml = (xml: string) => Document

const analyseurParDefaut: AnalyseurXml = xml => new DOMParser().parseFromString(xml, 'application/xml')

export async function lireOds(
  donnees: ArrayBuffer | Uint8Array,
  analyser: AnalyseurXml = analyseurParDefaut,
): Promise<Feuille[]> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(donnees)
  } catch {
    throw new Error("Le fichier n'est pas un classeur .ods valide (archive illisible).")
  }
  const contenu = zip.file('content.xml')
  if (!contenu) throw new Error("Le fichier n'est pas un classeur .ods (content.xml absent).")
  return lireContenuOds(await contenu.async('string'), analyser)
}

export function lireContenuOds(xml: string, analyser: AnalyseurXml = analyseurParDefaut): Feuille[] {
  const doc = analyser(xml)
  if (doc.getElementsByTagName('parsererror').length) {
    throw new Error('Le contenu du classeur .ods est illisible (XML invalide).')
  }
  const feuilles: Feuille[] = []
  const tables = doc.getElementsByTagNameNS(NS_TABLE, 'table')
  for (const table of Array.from(tables)) {
    feuilles.push({
      nom: table.getAttributeNS(NS_TABLE, 'name') ?? '',
      lignes: lireLignes(table),
    })
  }
  return feuilles
}

function lireLignes(table: Element): Cellule[][] {
  const lignes: Cellule[][] = []
  for (const ligne of Array.from(table.getElementsByTagNameNS(NS_TABLE, 'table-row'))) {
    const cellules = lireCellules(ligne)
    const vide = cellules.length === 0
    const repetition = Number(ligne.getAttributeNS(NS_TABLE, 'number-rows-repeated') ?? '1')
    if (vide) continue // les lignes vides (souvent répétées en masse) ne portent aucune donnée
    for (let i = 0; i < Math.min(repetition, REPETITION_MAX); i++) lignes.push([...cellules])
  }
  return lignes
}

function lireCellules(ligne: Element): Cellule[] {
  const cellules: Cellule[] = []
  for (const enfant of Array.from(ligne.children)) {
    if (enfant.namespaceURI !== NS_TABLE) continue
    if (enfant.localName !== 'table-cell' && enfant.localName !== 'covered-table-cell') continue
    const valeur = valeurCellule(enfant)
    const repetition = Number(enfant.getAttributeNS(NS_TABLE, 'number-columns-repeated') ?? '1')
    const n = valeur === null ? Math.min(repetition, REPETITION_MAX) : repetition
    for (let i = 0; i < n; i++) cellules.push(valeur)
  }
  while (cellules.length && cellules[cellules.length - 1] === null) cellules.pop()
  return cellules
}

function valeurCellule(cellule: Element): Cellule {
  const type = cellule.getAttributeNS(NS_OFFICE, 'value-type')
  if (type === 'boolean') {
    const v = cellule.getAttributeNS(NS_OFFICE, 'boolean-value') ?? cellule.getAttributeNS(NS_OFFICE, 'value')
    if (v === null) return null
    return v === '1' || v.toLowerCase() === 'true'
  }
  // Pour les nombres et les dates, la valeur brute évite les formats d'affichage localisés.
  if (type === 'float' || type === 'percentage' || type === 'currency') {
    const v = cellule.getAttributeNS(NS_OFFICE, 'value')
    if (v !== null) return v
  }
  if (type === 'date') {
    const v = cellule.getAttributeNS(NS_OFFICE, 'date-value')
    if (v !== null) return v
  }
  const paragraphes = Array.from(cellule.getElementsByTagNameNS(NS_TEXT, 'p'))
  if (!paragraphes.length) return null
  const texte = paragraphes.map(texteParagraphe).join('\n')
  return texte === '' ? null : texte
}

/** Texte d'un paragraphe ODF, en restituant les espaces multiples, tabulations et sauts de ligne. */
function texteParagraphe(noeud: Node): string {
  let texte = ''
  for (const enfant of Array.from(noeud.childNodes)) {
    if (enfant.nodeType === 3 /* TEXT_NODE */) {
      texte += enfant.nodeValue ?? ''
    } else if (enfant.nodeType === 1 /* ELEMENT_NODE */) {
      const el = enfant as Element
      if (el.namespaceURI === NS_TEXT && el.localName === 's') {
        texte += ' '.repeat(Number(el.getAttributeNS(NS_TEXT, 'c') ?? '1'))
      } else if (el.namespaceURI === NS_TEXT && el.localName === 'tab') {
        texte += '\t'
      } else if (el.namespaceURI === NS_TEXT && el.localName === 'line-break') {
        texte += '\n'
      } else {
        texte += texteParagraphe(el)
      }
    }
  }
  return texte
}
