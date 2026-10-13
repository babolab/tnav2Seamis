import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { lirePiecesJointes, numeroDossierDuChemin } from '../index'

describe('pièces jointes', () => {
  it('lit le n° de dossier dans le sous-dossier, à défaut dans le nom du fichier', () => {
    expect(numeroDossierDuChemin('export/dossier -10000001-2026-09-28-NOM-Prénom/photo.png')).toBe('10000001')
    expect(numeroDossierDuChemin('export/dossier-10000002-2026-09-28-NOM/x.pdf')).toBe('10000002')
    expect(numeroDossierDuChemin('export/tnav-10000003 - date2026-09-28.pdf')).toBe('10000003')
    expect(numeroDossierDuChemin('export/lisez-moi.txt')).toBeNull()
  })

  it('regroupe les fichiers par dossier, PDF de la démarche en tête', async () => {
    const zip = new JSZip()
    const d1 = 'export/dossier -10000001-2026-09-28-NOM-Prénom/'
    zip.file(`${d1}photos-du-navire-10000001- date 2026-09-28-01.png`, 'png')
    zip.file(`${d1}tnav-10000001 - date2026-09-28.pdf`, 'pdf')
    zip.file('export/dossier -10000002-2026-09-28-AUTRE-Nom/tnav-10000002 - date2026-09-28.pdf', 'pdf')
    zip.file('export/lisez-moi.txt', 'x')
    const { parDossier, nonRattachees } = await lirePiecesJointes(await zip.generateAsync({ type: 'uint8array' }))

    expect([...parDossier.keys()].sort()).toEqual(['10000001', '10000002'])
    const pieces = parDossier.get('10000001')!
    expect(pieces.map(p => p.nom)).toEqual([
      'tnav-10000001 - date2026-09-28.pdf',
      'photos-du-navire-10000001- date 2026-09-28-01.png',
    ])
    expect(pieces[0].type).toBe('application/pdf')
    expect(pieces[1].type).toBe('image/png')
    expect(nonRattachees).toEqual(['export/lisez-moi.txt'])
  })

  it("refuse un fichier qui n'est pas une archive", async () => {
    await expect(lirePiecesJointes(new Uint8Array([1, 2, 3]))).rejects.toThrow(/zip/)
  })
})
