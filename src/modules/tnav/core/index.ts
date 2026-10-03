// Point d'entrée du cœur de traitement TNAV -> Seamis (TypeScript pur, sans React).
//
//   const resultat = await traiterExportOds(await fichier.arrayBuffer())

import { lireDossiers } from './exportDS'
import { traiter } from './generation'
import { lireOds, type AnalyseurXml } from './odsReader'
import type { ResultatTraitement } from './types'

export async function traiterExportOds(
  donnees: ArrayBuffer | Uint8Array,
  analyser?: AnalyseurXml,
): Promise<ResultatTraitement> {
  return traiter(lireDossiers(await lireOds(donnees, analyser)))
}

export { lireOds, lireContenuOds } from './odsReader'
export { lireDossiers } from './exportDS'
export { traiter, texteBloc, MAX_LIGNES, MENTION_PDF } from './generation'
export * from './types'
