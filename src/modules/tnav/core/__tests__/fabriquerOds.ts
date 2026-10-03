// Fabrique un classeur .ods en mémoire, au format des exports démarches-simplifiées
// (booléens en office:value="1"/"0" sans texte), pour les tests.

import JSZip from 'jszip'
import type { Cellule } from '../types'

export interface FeuilleTest {
  nom: string
  lignes: Cellule[][]
}

const echapper = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function cellule(v: Cellule): string {
  if (v === null) return '<table:table-cell/>'
  if (typeof v === 'boolean') {
    return `<table:table-cell office:value-type="boolean" office:value="${v ? 1 : 0}" table:style-name="row_style"></table:table-cell>`
  }
  const paragraphes = v.split('\n').map(p => `<text:p>${echapper(p)}</text:p>`).join('')
  return `<table:table-cell office:value-type="string" calcext:value-type="string">${paragraphes}</table:table-cell>`
}

export function contenuOds(feuilles: FeuilleTest[]): string {
  const tables = feuilles.map(f =>
    `<table:table table:name="${echapper(f.nom)}">` +
    f.lignes.map(l => `<table:table-row>${l.map(cellule).join('')}</table:table-row>`).join('') +
    // Lignes vides répétées en fin de feuille, comme le font les tableurs
    '<table:table-row table:number-rows-repeated="1048000"><table:table-cell table:number-columns-repeated="1024"/></table:table-row>' +
    '</table:table>',
  ).join('')
  return '<?xml version="1.0" encoding="UTF-8"?>' +
    '<office:document-content ' +
    'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" ' +
    'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" ' +
    'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" ' +
    'xmlns:calcext="urn:org:documentfoundation:names:experimental:calc:xmlns:calcext:1.0" ' +
    'office:version="1.2"><office:body><office:spreadsheet>' + tables +
    '</office:spreadsheet></office:body></office:document-content>'
}

export async function fabriquerOds(feuilles: FeuilleTest[]): Promise<Uint8Array> {
  const zip = new JSZip()
  zip.file('mimetype', 'application/vnd.oasis.opendocument.spreadsheet')
  zip.file('content.xml', contenuOds(feuilles))
  return zip.generateAsync({ type: 'uint8array' })
}
