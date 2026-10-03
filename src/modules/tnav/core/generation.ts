// Génération des entrées balises Seamis (clé + texte) à partir des dossiers.

import { controlerBalise, controlerDossier } from './controles'
import { formaterDateHeureUtc, formaterDateJour, formaterNombre, tronquer } from './normalisation'
import type { Anomalie, Balise, Dossier, EntreeBalise, ResultatTraitement, TypeCle } from './types'

/** Nombre maximal de lignes entre les délimiteurs d'un bloc. */
export const MAX_LIGNES = 10
/** Longueur maximale d'un texte libre (trajet, description) dans une ligne. */
export const MAX_TEXTE_LIBRE = 100

export const MENTION_PDF =
  'Détails complets : consulter le PDF de la démarche déposée (fiche navire Seamis) ou le demander au CROSS Jobourg.'

/** Statuts à bord désignant le responsable du navire. */
const STATUT_CHEF = /chef|skipper|capitaine|patron|responsable/i

const joindre = (morceaux: (string | false | undefined | null)[], separateur = ' - ') =>
  morceaux.filter(Boolean).join(separateur)

/** Ligne « libellé : contenu », ou null si le contenu est vide. */
const ligne = (libelle: string, contenu: string) => (contenu ? `${libelle} : ${contenu}` : null)

export function decrireBalise(b: Balise): string {
  return joindre([b.type || 'Balise', b.hexId && `HEXID ${b.hexId}`, b.mmsi && `MMSI ${b.mmsi}`], ' ')
    .replace(/ (HEXID \S+) (MMSI)/, ' $1 / $2')
}

function personneABord(d: Dossier): string {
  const chef = d.equipage.find(m => STATUT_CHEF.test(m.statut))
  const gsm = d.telephones
    .map(t => joindre([`GSM ${t.numero}`, t.utilisateur && !/^moi\b/i.test(t.utilisateur) && `(${t.utilisateur})`], ' '))
    .join(', ')
  const demandeur = joindre([d.demandeur.prenom, d.demandeur.nom], ' ')
  const qui = chef
    ? joindre([`${chef.nom} (${chef.statut.toLowerCase()})`, chef.telephones && `tél ${chef.telephones}`])
    : demandeur && `${demandeur} (demandeur)`
  const equipage = joindre([
    d.equipage.length > 0 && `${d.equipage.length} équipier(s) déclaré(s)`,
    d.infosEquipage && tronquer(d.infosEquipage, 60),
  ], ', ')
  return joindre([qui, gsm, equipage])
}

/**
 * Lignes du bloc, classées par priorité décroissante (les dernières sont supprimées en premier si le
 * bloc dépasse MAX_LIGNES), chacune avec sa position d'affichage.
 */
function lignesBloc(d: Dossier, balise: Balise): { ordre: number; texte: string }[] {
  const n = d.navire
  const autres = d.balises.filter(b => b !== balise)
  const c = d.contactsTerre[0]
  const p = d.programme
  const com = d.communications
  const candidates: [number, string | null][] = [
    [1, ligne('Navire', joindre([
      n.nom,
      joindre([n.marque, n.modele], ' '),
      n.longueur && `${formaterNombre(n.longueur)} m`,
      n.description && `coque ${tronquer(n.description, 60)}`,
      n.immatriculation && `immat. ${n.immatriculation}`,
      n.pavillon && `pavillon ${n.pavillon}`,
      n.portAttache && `port ${n.portAttache}`,
    ]))],
    [3, ligne('À bord', personneABord(d))],
    [7, c ? ligne('Contact à terre', joindre([
      joindre([c.nom, c.lien && `(${c.lien})`], ' '),
      c.telephone,
      c.email,
      d.contactsTerre.length > 1 && `(+${d.contactsTerre.length - 1} autre(s), voir PDF)`,
    ])) : null],
    [8, ligne('Cette balise', decrireBalise(balise))],
    [9, autres.length ? ligne('Autres balises', autres.map(decrireBalise).join(' ; ')) : null],
    [10, MENTION_PDF],
    [5, (p.portDepart || p.dateDepart || p.portArrivee || p.dateArrivee) ? joindre([
      ligne('Départ', joindre([p.portDepart, p.dateDepart && `le ${formaterDateJour(p.dateDepart)}`], ' ')),
      ligne('Arrivée', joindre([p.portArrivee, p.dateArrivee && `le ${formaterDateJour(p.dateArrivee)}`], ' ')),
    ]) : null],
    [6, ligne('Trajet', p.trajet && tronquer(p.trajet, MAX_TEXTE_LIBRE))],
    [2, joindre([n.mmsi && `MMSI navire ${n.mmsi}`, n.indicatif && `indicatif ${n.indicatif}`]) || null],
    [4, ligne('Autres moyens', joindre([
      com.iridium && `Iridium/sat. ${com.iridium}`,
      com.internetSatellite && `Internet sat. ${com.internetSatellite}`,
      com.autres && tronquer(com.autres, 40),
      com.habitudes && `vacations : ${tronquer(com.habitudes, 50)}`,
    ]))],
  ]
  return candidates
    .filter((l): l is [number, string] => !!l[1])
    .slice(0, MAX_LIGNES)
    .sort((a, b) => a[0] - b[0])
    .map(([ordre, texte]) => ({ ordre, texte }))
}

/** Bloc de texte complet (délimiteurs compris) pour une balise d'un dossier. */
export function texteBloc(d: Dossier, balise: Balise): string {
  const ouverture = `===== TNAV ${d.numero}${d.dateDepot ? ` - déposée le ${formaterDateHeureUtc(d.dateDepot)}` : ''} =====`
  const fermeture = `===== fin TNAV ${d.numero} =====`
  return [ouverture, ...lignesBloc(d, balise).map(l => l.texte), fermeture].join('\n')
}

/** Dossiers à traiter : case « Entré dans Seamis? » non cochée et dossier non archivé. */
export function traiter(dossiers: Dossier[]): ResultatTraitement {
  const exclus: ResultatTraitement['dossiersExclus'] = []
  const aTraiter: Dossier[] = []
  for (const d of dossiers) {
    if (d.entreDansSeamis) exclus.push({ numero: d.numero, nomNavire: d.navire.nom, raison: 'entré dans Seamis' })
    else if (d.archive) exclus.push({ numero: d.numero, nomNavire: d.navire.nom, raison: 'archivé' })
    else aTraiter.push(d)
  }
  // Du plus récent au plus ancien : c'est l'ordre des blocs dans un texte qui réunit plusieurs dossiers.
  aTraiter.sort((a, b) => (b.dateDepot?.getTime() ?? 0) - (a.dateDepot?.getTime() ?? 0) || b.numero.localeCompare(a.numero))

  const anomalies: Anomalie[] = []
  const parCle = new Map<string, { typeCle: TypeCle; blocs: { d: Dossier; b: Balise }[]; anomalies: Anomalie[] }>()

  for (const d of aTraiter) {
    anomalies.push(...controlerDossier(d))
    const clesDuDossier = new Set<string>()
    for (const b of d.balises) {
      const anomaliesBalise = controlerBalise(d.numero, b)
      if (!b.hexId && !b.mmsi) {
        anomalies.push(...anomaliesBalise)
        continue
      }
      const cles: [TypeCle, string][] = []
      if (b.hexId) cles.push(['HEXID', b.hexId])
      if (b.mmsi) cles.push(['MMSI', b.mmsi])
      for (const [typeCle, cle] of cles) {
        const id = `${typeCle}:${cle}`
        if (clesDuDossier.has(id)) {
          anomalies.push({ dossier: d.numero, gravite: 'info', message: `${typeCle} ${cle} déclaré plusieurs fois dans le dossier : une seule entrée.` })
          continue
        }
        clesDuDossier.add(id)
        const entree = parCle.get(id) ?? { typeCle, blocs: [], anomalies: [] }
        entree.blocs.push({ d, b })
        entree.anomalies.push(...anomaliesBalise.filter(a => a.message.includes(typeCle)))
        parCle.set(id, entree)
      }
    }
  }

  const entrees: EntreeBalise[] = []
  for (const [id, { typeCle, blocs, anomalies: anomaliesCle }] of parCle) {
    const cle = id.slice(typeCle.length + 1)
    const [plusRecent] = blocs
    const anomaliesEntree = [...anomaliesCle]
    if (blocs.length > 1) {
      anomaliesEntree.push({
        dossier: plusRecent.d.numero,
        gravite: 'info',
        message: `${typeCle} ${cle} présent dans ${blocs.length} dossiers à traiter (${blocs.map(x => x.d.numero).join(', ')}) : textes réunis, le plus récent en tête.`,
      })
    }
    entrees.push({
      cle,
      typeCle,
      typeBalise: plusRecent.b.type,
      dossiers: blocs.map(x => x.d.numero),
      nomNavire: plusRecent.d.navire.nom,
      texte: blocs.map(x => texteBloc(x.d, x.b)).join('\n'),
      anomalies: anomaliesEntree,
    })
  }
  // Regroupées par dossier (plus récent d'abord), dans l'ordre de déclaration des balises.
  // L'ordre d'insertion dans parCle suit déjà cet ordre ; le tri stable le préserve.
  const rang = new Map(aTraiter.map((d, i) => [d.numero, i]))
  entrees.sort((a, b) => rang.get(a.dossiers[0])! - rang.get(b.dossiers[0])!)

  return {
    totalDossiers: dossiers.length,
    dossiersATraiter: aTraiter,
    dossiersExclus: exclus,
    entrees,
    anomalies,
  }
}
