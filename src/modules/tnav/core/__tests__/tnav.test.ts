import { describe, expect, it } from 'vitest'
import { lireContenuOds, MAX_LIGNES, MENTION_PDF, rechercheSeamis, traiterExportOds } from '../index'
import { contenuOds, fabriquerOds } from './fabriquerOds'
import { FEUILLES_TEST } from './jeuDeTest'

/** Découpe un texte réunissant plusieurs dossiers en blocs, devant chaque délimiteur d'ouverture. */
const SEPARATEUR_BLOCS = /\n(?=={5} TNAV )/

const resultatTest = async () => traiterExportOds(await fabriquerOds(FEUILLES_TEST))

describe('lecture ods', () => {
  it('lit les booléens écrits par démarches-simplifiées (office:value) et au format standard', () => {
    const xml = contenuOds([{ nom: 'Dossiers', lignes: [['a', true, false, null]] }])
      .replace('</table:table-row>', '<table:table-cell office:value-type="boolean" office:boolean-value="true"/></table:table-row>')
    const [feuille] = lireContenuOds(xml)
    expect(feuille.lignes).toEqual([['a', true, false, null, true]])
  })

  it('ignore les lignes et colonnes vides répétées en masse', () => {
    const [feuille] = lireContenuOds(contenuOds([{ nom: 'X', lignes: [['1', '2']] }]))
    expect(feuille.lignes).toEqual([['1', '2']])
  })

  it('restitue les espaces multiples et les paragraphes', () => {
    const xml = contenuOds([{ nom: 'X', lignes: [['x']] }])
      .replace('<text:p>x</text:p>', '<text:p>a<text:s text:c="2"/>b</text:p><text:p>c</text:p>')
    expect(lireContenuOds(xml)[0].lignes[0][0]).toBe('a  b\nc')
  })

  it("refuse un fichier qui n'est pas un ods", async () => {
    await expect(traiterExportOds(new TextEncoder().encode('pas un zip'))).rejects.toThrow(/ods/)
  })
})

describe('sélection des dossiers', () => {
  it('exclut les dossiers cochés « Entré dans Seamis? » et les archivés', async () => {
    const r = await resultatTest()
    expect(r.totalDossiers).toBe(6)
    expect(r.dossiersExclus).toEqual([
      { numero: '10000001', nomNavire: 'NAVIRE A', raison: 'entré dans Seamis' },
      { numero: '10000004', nomNavire: 'NAVIRE C', raison: 'archivé' },
    ])
  })

  it('classe les dossiers à traiter du plus récent au plus ancien', async () => {
    const r = await resultatTest()
    expect(r.dossiersATraiter.map(d => d.numero)).toEqual(['10000002', '10000006', '10000005', '10000003'])
  })
})

describe('entrées balises', () => {
  it('génère une entrée par identifiant, sans espace, HEXID en majuscules', async () => {
    const r = await resultatTest()
    expect(r.entrees.map(e => `${e.typeCle} ${e.cle}`)).toEqual([
      'HEXID 9C7A3E1B2D4F601',
      'MMSI 227000001',
      'HEXID ESSAIY75D69A4DE',
      'MMSI 227000099',
      'MMSI 970000001',
    ])
  })

  it('produit le texte attendu, avec délimiteurs et date de dépôt en UTC', async () => {
    const r = await resultatTest()
    const epirb = r.entrees.find(e => e.cle === '9C7A3E1B2D4F601')!
    expect(epirb.texte).toBe([
      '===== TNAV 10000002 - déposée le 03/10/2026 11:33 UTC =====',
      'Navire : NAVIRE A - Chantier Modèle 30 - 9,12 m - immat. XX00000 - pavillon Français',
      'MMSI navire 227000001 - indicatif FAX0000',
      'À bord : Prénom NOM (demandeur) - GSM 0600000000 - 1 équipier(s) déclaré(s)',
      'Départ : Cherbourg le 29/09/2026 - Arrivée : Cherbourg le 30/09/2026',
      'Trajet : Tour de la rade',
      'Contact à terre : Contact A (Travail) - 0200000000',
      'Cette balise : EPIRB HEXID 9C7A3E1B2D4F601 / MMSI 227000001',
      'Autres balises : PLB HEXID ESSAIY75D69A4DE ; MOB AIS MMSI 227000099',
      MENTION_PDF,
      '===== fin TNAV 10000002 =====',
    ].join('\n'))
  })

  it("donne le même texte aux deux clés d'une balise HEXID + MMSI", async () => {
    const r = await resultatTest()
    const [hex, mmsi] = r.entrees
    expect(hex.texte).toBe(mmsi.texte)
  })

  it('réunit les dossiers qui partagent une clé, le plus récent en tête', async () => {
    const r = await resultatTest()
    const sart = r.entrees.find(e => e.cle === '970000001')!
    expect(sart.dossiers).toEqual(['10000006', '10000005'])
    const blocs = sart.texte.split(SEPARATEUR_BLOCS)
    expect(blocs).toHaveLength(2)
    expect(blocs[0]).toMatch(/^===== TNAV 10000006 /)
    expect(blocs[1]).toMatch(/^===== TNAV 10000005 /)
    expect(sart.anomalies.some(a => a.gravite === 'info' && /2 dossiers/.test(a.message))).toBe(true)
  })

  it('cite le chef de bord, tronque le trajet et signale les contacts supplémentaires', async () => {
    const r = await resultatTest()
    const bloc = r.entrees.find(e => e.cle === '970000001')!.texte.split(SEPARATEUR_BLOCS)[1]
    expect(bloc).toContain('À bord : Marie SKIPPER (chef de bord) - tél 0611111111 - GSM 0600000005 (Paul MARTIN)')
    expect(bloc).toContain('Contact à terre : Contact D1 (Frère) - 0200000051 - (+2 autre(s), voir PDF)')
    const trajet = bloc.split('\n').find(l => l.startsWith('Trajet : '))!
    expect(trajet.length).toBeLessThanOrEqual('Trajet : '.length + 100)
    expect(trajet.endsWith('…')).toBe(true)
  })

  it(`ne dépasse jamais ${MAX_LIGNES} lignes entre les délimiteurs`, async () => {
    const r = await resultatTest()
    for (const e of r.entrees) {
      for (const bloc of e.texte.split(SEPARATEUR_BLOCS)) {
        expect(bloc.split('\n').length).toBeLessThanOrEqual(MAX_LIGNES + 2)
      }
    }
  })
})

describe('recherche Seamis', () => {
  it('compose la chaîne de recherche du navire, identifiants normalisés', async () => {
    const r = await resultatTest()
    const d2 = r.dossiersATraiter.find(d => d.numero === '10000002')!
    expect(rechercheSeamis(d2).texte).toBe('mmsi:227000001, cs:FAX0000, immat:XX00000, nom:NAVIRE A')
  })

  it('omet les critères vides', async () => {
    const r = await resultatTest()
    const d3 = r.dossiersATraiter.find(d => d.numero === '10000003')!
    expect(rechercheSeamis(d3).texte).toBe('mmsi:235000000, nom:NAVIRE B')
  })

  it('retire les virgules du nom, qui séparent les critères', async () => {
    const r = await resultatTest()
    const d = structuredClone(r.dossiersATraiter[0])
    d.navire = { ...d.navire, mmsi: '', indicatif: '', immatriculation: 'ch 123 456', nom: 'Le Nom, du navire' }
    expect(rechercheSeamis(d).texte).toBe('immat:CH123456, nom:LE NOM DU NAVIRE')
  })
})

describe('anomalies', () => {
  it('signale les identifiants invalides et les préfixes AIS inattendus sur les entrées', async () => {
    const r = await resultatTest()
    const plb = r.entrees.find(e => e.cle === 'ESSAIY75D69A4DE')!
    expect(plb.anomalies.map(a => a.message).join()).toMatch(/HEXID .* invalide/)
    const mob = r.entrees.find(e => e.cle === '227000099')!
    expect(mob.anomalies.map(a => a.message).join()).toMatch(/972/)
    const epirb = r.entrees.find(e => e.cle === '9C7A3E1B2D4F601')!
    expect(epirb.anomalies).toEqual([])
  })

  it('signale les dossiers sans balise, le pavillon incohérent et la balise sans identifiant', async () => {
    const r = await resultatTest()
    const messages = (numero: string) => r.anomalies.filter(a => a.dossier === numero).map(a => a.message).join('\n')
    expect(messages('10000003')).toMatch(/Aucune balise/)
    expect(messages('10000003')).toMatch(/Pavillon « FRANCAIS » incohérent .*britannique/)
    expect(r.anomalies).toContainEqual(expect.objectContaining({ dossier: '10000005', gravite: 'erreur' }))
    expect(messages('10000006')).toMatch(/Aucun contact à terre/)
  })

  it('traite « / », « ? », « Non communiqué » et « 0000000000 » comme vides', async () => {
    const r = await resultatTest()
    const d3 = r.dossiersATraiter.find(d => d.numero === '10000003')!
    expect(d3.communications.iridium).toBe('')
    expect(d3.communications.internetSatellite).toBe('')
    expect(d3.telephones).toEqual([{ utilisateur: '', numero: '0600000003' }])
  })
})
