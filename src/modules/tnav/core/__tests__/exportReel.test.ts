// Test sur un vrai export, présent seulement sur le poste de développement :
// le dossier « exemples d'exports » n'est pas versionné (données personnelles).
// Les assertions ne portent que sur des comptes, jamais sur des données nominatives.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { traiterExportOds } from '../index'

const DOSSIER = join(__dirname, '../../../../../exemples d\'exports')
const FICHIER = 'dossiers_declaration-traversee_2026-10-03_14-08.ods'
const present = existsSync(join(DOSSIER, FICHIER))

describe.skipIf(!present)('export réel du 3 octobre 2026 (14:08)', () => {
  it('lit les 7 dossiers, exclut le dossier coché et génère 4 entrées pour les 3 balises', async () => {
    const r = await traiterExportOds(readFileSync(join(DOSSIER, FICHIER)))
    expect(r.totalDossiers).toBe(7)
    expect(r.dossiersExclus).toHaveLength(1)
    expect(r.dossiersExclus[0].raison).toBe('entré dans Seamis')
    expect(r.dossiersATraiter).toHaveLength(6)
    // EPIRB (HEXID + MMSI), PLB (HEXID), MOB AIS (MMSI)
    expect(r.entrees.map(e => e.typeCle).sort()).toEqual(['HEXID', 'HEXID', 'MMSI', 'MMSI'])
    expect(r.entrees.every(e => !/\s/.test(e.cle))).toBe(true)
  })

  it('lit tous les exports ods présents sans erreur', async () => {
    for (const f of readdirSync(DOSSIER).filter(n => n.endsWith('.ods'))) {
      await expect(traiterExportOds(readFileSync(join(DOSSIER, f)))).resolves.toBeDefined()
    }
  })
})
