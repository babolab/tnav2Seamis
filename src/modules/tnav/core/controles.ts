// Contrôles de cohérence : les anomalies sont signalées, jamais bloquantes (sauf balise sans identifiant,
// qui ne peut pas donner d'entrée Seamis).

import { cleComparaison, hexIdValide, mmsiValide } from './normalisation'
import type { Anomalie, Balise, Dossier } from './types'

/** MID (3 premiers chiffres du MMSI d'un navire) par pavillon, pour les pavillons courants en Manche. */
const MID_PAR_PAVILLON: { motifs: RegExp; mids: string[]; nom: string }[] = [
  {
    nom: 'français',
    motifs: /franc/,
    mids: ['226', '227', '228', '329', '347', '361', '501', '540', '546', '578', '607', '618', '635', '660', '745'],
  },
  { nom: 'britannique', motifs: /britann|royaume|anglais|angleterre|^uk$|^gb$|united kingdom|jersey|guernesey|guernsey/, mids: ['232', '233', '234', '235'] },
  { nom: 'belge', motifs: /belg/, mids: ['205'] },
  { nom: 'néerlandais', motifs: /neerland|pays-bas|pays bas|hollan|dutch/, mids: ['244', '245', '246'] },
  { nom: 'allemand', motifs: /allema|german/, mids: ['211', '218'] },
  { nom: 'espagnol', motifs: /espagn|spain|spanish/, mids: ['224', '225'] },
  { nom: 'irlandais', motifs: /irland|ireland|irish/, mids: ['250'] },
  { nom: 'suisse', motifs: /suisse|swiss|switzerland/, mids: ['269'] },
]

/** Préfixe attendu du MMSI des balises AIS (UIT-R M.585). */
const PREFIXE_AIS: { motif: RegExp; prefixe: string; nom: string }[] = [
  { motif: /mob/, prefixe: '972', nom: 'MOB AIS' },
  { motif: /sart/, prefixe: '970', nom: 'SART AIS' },
  { motif: /epirb.*ais|ais.*epirb/, prefixe: '974', nom: 'EPIRB AIS' },
]

const anomalie = (dossier: string, gravite: Anomalie['gravite'], message: string): Anomalie => ({ dossier, gravite, message })

export function controlerDossier(d: Dossier): Anomalie[] {
  const a: Anomalie[] = []
  if (!d.balises.length) {
    a.push(anomalie(d.numero, 'avertissement', 'Aucune balise déclarée : aucune entrée balise Seamis, seul le PDF est à verser au navire.'))
  }
  if (!d.contactsTerre.length) {
    a.push(anomalie(d.numero, 'avertissement', 'Aucun contact à terre déclaré.'))
  }
  if (!d.dateDepot) {
    a.push(anomalie(d.numero, 'info', 'Date de dépôt absente ou illisible.'))
  }
  const mmsi = d.navire.mmsi
  if (mmsi && !mmsiValide(mmsi)) {
    a.push(anomalie(d.numero, 'avertissement', `MMSI du navire « ${mmsi} » invalide (9 chiffres attendus).`))
  } else if (mmsi) {
    const incoherence = incoherencePavillon(d.navire.pavillon, mmsi)
    if (incoherence) a.push(anomalie(d.numero, 'avertissement', incoherence))
  }
  return a
}

/** Message si le MID du MMSI ne correspond pas au pavillon déclaré, sinon null. */
export function incoherencePavillon(pavillon: string, mmsi: string): string | null {
  if (!pavillon || !/^[2-7]\d{8}$/.test(mmsi)) return null
  const mid = mmsi.slice(0, 3)
  const p = cleComparaison(pavillon)
  const declare = MID_PAR_PAVILLON.find(e => e.motifs.test(p))
  const selonMid = MID_PAR_PAVILLON.find(e => e.mids.includes(mid))
  if (declare && !declare.mids.includes(mid)) {
    const origine = selonMid ? ` (MID ${mid} : pavillon ${selonMid.nom})` : ` (MID ${mid})`
    return `Pavillon « ${pavillon} » incohérent avec le MMSI du navire ${mmsi}${origine}.`
  }
  if (!declare && selonMid) {
    return `Pavillon « ${pavillon} » alors que le MMSI du navire ${mmsi} indique un pavillon ${selonMid.nom}.`
  }
  return null
}

export function controlerBalise(numero: string, b: Balise): Anomalie[] {
  const a: Anomalie[] = []
  const nom = b.type || `balise n° ${b.ligne}`
  if (!b.hexId && !b.mmsi) {
    a.push(anomalie(numero, 'erreur', `${nom} sans HEXID ni MMSI : aucune entrée Seamis possible.`))
    return a
  }
  if (b.hexId && !hexIdValide(b.hexId)) {
    a.push(anomalie(numero, 'avertissement', `${nom} : HEXID « ${b.hexId} » invalide (15 caractères hexadécimaux 0-9 A-F attendus).`))
  }
  if (b.mmsi && !mmsiValide(b.mmsi)) {
    a.push(anomalie(numero, 'avertissement', `${nom} : MMSI « ${b.mmsi} » invalide (9 chiffres attendus).`))
  }
  const ais = PREFIXE_AIS.find(p => p.motif.test(cleComparaison(b.type)))
  if (ais && b.mmsi && mmsiValide(b.mmsi) && !b.mmsi.startsWith(ais.prefixe)) {
    a.push(anomalie(numero, 'avertissement', `${nom} : un ${ais.nom} a normalement un MMSI en ${ais.prefixe}xxxxxx (saisi : ${b.mmsi}).`))
  }
  return a
}
