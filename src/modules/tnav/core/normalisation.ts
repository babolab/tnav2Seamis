// Nettoyage des valeurs saisies par les usagers et normalisation des identifiants.

/** Valeurs que les usagers saisissent pour dire « rien » ; elles sont traitées comme vides. */
const VALEURS_VIDES = new Set([
  '/', '?', '-', '.', 'non communique', 'ras', 'neant', 'aucun', 'aucune', 'n/a', 'na', 'nc', 'sans',
])

/** Minuscules, sans accents, espaces normalisés : sert aux comparaisons de libellés. */
export function cleComparaison(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[  ]/g, ' ')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function estVide(valeur: string | null | undefined): boolean {
  if (valeur == null) return true
  const v = cleComparaison(valeur)
  if (v === '') return true
  if (VALEURS_VIDES.has(v)) return true
  if (/^0+$/.test(v.replace(/\s/g, ''))) return true // « 0000000000 » vu dans les exports
  if (/^[\s/?.\-_]+$/.test(v)) return true
  return false
}

/** Texte nettoyé (espaces superflus retirés), ou '' si la valeur est considérée comme vide. */
export function nettoyer(valeur: string | null | undefined): string {
  if (estVide(valeur)) return ''
  return valeur!.replace(/[  ]/g, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim()
}

/** Clé HEXID : majuscules, sans espace ni séparateur. */
export function normaliserHexId(valeur: string | null | undefined): string {
  if (estVide(valeur)) return ''
  return valeur!.replace(/[\s.\-_]/g, '').toUpperCase()
}

/** Clé MMSI : sans espace ni séparateur. */
export function normaliserMmsi(valeur: string | null | undefined): string {
  if (estVide(valeur)) return ''
  return valeur!.replace(/[\s.\-_]/g, '')
}

export function hexIdValide(hexId: string): boolean {
  return /^[0-9A-F]{15}$/.test(hexId)
}

export function mmsiValide(mmsi: string): boolean {
  return /^\d{9}$/.test(mmsi)
}

/** « 2026-10-03 13:33:55 +0200 » (format de l'export) -> Date. null si illisible. */
export function lireDateExport(valeur: string | null | undefined): Date | null {
  if (!valeur) return null
  const m = valeur.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?\s*(Z|[+-]\d{2}:?\d{2})?$/)
  if (!m) return null
  const [, a, mo, j, h, mi, s = '00', fuseau = 'Z'] = m
  const iso = `${a}-${mo}-${j}T${h}:${mi}:${s}${fuseau === 'Z' ? 'Z' : fuseau.replace(/^([+-]\d{2}):?(\d{2})$/, '$1:$2')}`
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d
}

const deuxChiffres = (n: number) => String(n).padStart(2, '0')

/** Date -> « JJ/MM/AAAA HH:MM UTC ». */
export function formaterDateHeureUtc(d: Date): string {
  return `${deuxChiffres(d.getUTCDate())}/${deuxChiffres(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ` +
    `${deuxChiffres(d.getUTCHours())}:${deuxChiffres(d.getUTCMinutes())} UTC`
}

/** « 2026-09-29 » -> « 29/09/2026 ». Toute autre forme est rendue telle quelle. */
export function formaterDateJour(valeur: string): string {
  const m = valeur.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : valeur.trim()
}

/** « 9.12 » -> « 9,12 ». */
export function formaterNombre(valeur: string): string {
  return /^\d+(\.\d+)?$/.test(valeur) ? valeur.replace('.', ',') : valeur
}

/** Tronque un texte libre à une seule ligne d'au plus `max` caractères. */
export function tronquer(texte: string, max: number): string {
  const uneLigne = texte.replace(/\s*\n\s*/g, ' ').trim()
  return uneLigne.length <= max ? uneLigne : uneLigne.slice(0, max - 1).trimEnd() + '…'
}
