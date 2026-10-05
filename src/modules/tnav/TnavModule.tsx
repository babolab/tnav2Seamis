import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, AlertTriangle, Check, CheckCircle, Copy, FileText, Info, Search, Ship, Upload } from 'lucide-react'
import { cn } from '../../lib/utils'
import { rechercheSeamis, traiterExportOds } from './core'
import type { Anomalie, Dossier, EntreeBalise, ResultatTraitement } from './core'

async function copierPressePapiers(texte: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(texte)
    return
  }
  // Repli pour les navigateurs sans API presse-papiers (contexte non sécurisé)
  const zone = document.createElement('textarea')
  zone.value = texte
  zone.style.position = 'fixed'
  zone.style.opacity = '0'
  document.body.appendChild(zone)
  zone.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(zone)
  if (!ok) throw new Error('copie impossible')
}

const formatDepot = (d: Date | null) =>
  d ? d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—'

const STYLE_GRAVITE: Record<Anomalie['gravite'], { classe: string; Icone: typeof AlertCircle }> = {
  erreur: { classe: 'text-red-300 bg-red-950/60', Icone: AlertCircle },
  avertissement: { classe: 'text-amber-300 bg-amber-950/50', Icone: AlertTriangle },
  info: { classe: 'text-sky-300 bg-sky-950/50', Icone: Info },
}

function ListeAnomalies({ anomalies, avecDossier = false }: { anomalies: Anomalie[]; avecDossier?: boolean }) {
  if (!anomalies.length) return null
  return (
    <ul className="space-y-1">
      {anomalies.map((a, i) => {
        const { classe, Icone } = STYLE_GRAVITE[a.gravite]
        return (
          <li key={i} className={cn('flex items-start gap-2 text-xs px-2 py-1 rounded', classe)}>
            <Icone size={14} className="shrink-0 mt-0.5" />
            <span>{avecDossier && <span className="font-mono mr-1">{a.dossier}</span>}{a.message}</span>
          </li>
        )
      })}
    </ul>
  )
}

function BoutonCopier({ texte, libelle, onCopie }: { texte: string; libelle: string; onCopie: (ok: boolean) => void }) {
  const [copie, setCopie] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const copier = async () => {
    try {
      await copierPressePapiers(texte)
      setCopie(true)
      onCopie(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopie(false), 1500)
    } catch {
      onCopie(false)
    }
  }
  return (
    <button onClick={copier}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium transition-colors whitespace-nowrap">
      {copie ? <Check size={13} className="text-green-400" /> : <Copy size={13} />} {libelle}
    </button>
  )
}

function CarteEntree({ entree, saisie, basculer, onCopie }: {
  entree: EntreeBalise
  saisie: boolean
  basculer: () => void
  onCopie: (ok: boolean) => void
}) {
  return (
    <div className={cn('bg-slate-800 rounded-xl p-4 space-y-3 border border-slate-700 transition-opacity', saisie && 'opacity-50')}>
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn('px-2 py-0.5 rounded text-xs font-bold',
          entree.typeCle === 'HEXID' ? 'bg-blue-900 text-blue-200' : 'bg-violet-900 text-violet-200')}>
          {entree.typeCle}
        </span>
        <span className="font-mono text-lg text-slate-100 select-all">{entree.cle}</span>
        <BoutonCopier texte={entree.cle} libelle="Copier la clé" onCopie={onCopie} />
        <span className="text-sm text-slate-400">
          {entree.typeBalise || 'Balise'} · {entree.nomNavire || 'navire sans nom'} · dossier{entree.dossiers.length > 1 ? 's' : ''} {entree.dossiers.join(', ')}
        </span>
        <label className="ml-auto flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
          <input type="checkbox" checked={saisie} onChange={basculer} className="accent-green-500" />
          Saisie dans Seamis
        </label>
      </div>
      <ListeAnomalies anomalies={entree.anomalies} />
      <div className="relative">
        <pre className="bg-slate-950 rounded-lg p-3 text-xs text-slate-200 whitespace-pre-wrap break-words font-mono leading-relaxed">{entree.texte}</pre>
        <div className="absolute top-2 right-2">
          <BoutonCopier texte={entree.texte} libelle="Copier le texte" onCopie={onCopie} />
        </div>
      </div>
    </div>
  )
}

function CaseAction({ coche, basculer, libelle }: { coche: boolean; basculer: () => void; libelle: ReactNode }) {
  return (
    <label className={cn('flex items-center gap-2 text-xs cursor-pointer select-none', coche ? 'text-green-300' : 'text-slate-300')}>
      <input type="checkbox" checked={coche} onChange={basculer} className="accent-green-500" />
      {libelle}
    </label>
  )
}

function CarteDossier({ dossier: d, anomalies, pdfVerse, basculerPdf, dsCoche, basculerDs, onCopie }: {
  dossier: Dossier
  anomalies: Anomalie[]
  pdfVerse: boolean
  basculerPdf: () => void
  dsCoche: boolean
  basculerDs: () => void
  onCopie: (ok: boolean) => void
}) {
  const recherche = rechercheSeamis(d)
  const termine = pdfVerse && dsCoche
  return (
    <div className={cn('bg-slate-800 rounded-xl p-4 space-y-3 border border-slate-700 transition-opacity', termine && 'opacity-50')}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-lg text-slate-100 select-all">{d.numero}</span>
        <span className="text-sm text-slate-200"><Ship size={14} className="inline mr-1 text-slate-500" />{d.navire.nom || 'navire sans nom'}</span>
        <span className="text-xs text-slate-400">
          déposé {formatDepot(d.dateDepot)} · {d.etat || 'état inconnu'} · {d.balises.length} balise{d.balises.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Recherche du navire dans Seamis */}
      <div className="bg-slate-950 rounded-lg p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-300"><Search size={13} /> Recherche Seamis</span>
          {recherche.texte ? (
            <>
              <code className="font-mono text-sm text-slate-100 select-all break-all">{recherche.texte}</code>
              <BoutonCopier texte={recherche.texte} libelle="Copier la recherche" onCopie={onCopie} />
            </>
          ) : (
            <span className="text-xs text-amber-300">Aucun identifiant du navire : le retrouver à partir du PDF.</span>
          )}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <FileText size={13} /> PDF : fichier du dossier <span className="font-mono text-slate-300">{d.numero}</span> dans le ZIP de l'export, à verser dans les pièces jointes du navire.
        </p>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <CaseAction coche={pdfVerse} basculer={basculerPdf} libelle="PDF versé au navire dans Seamis" />
        <CaseAction coche={dsCoche} basculer={basculerDs} libelle="« Entré dans Seamis? » coché dans démarches-simplifiées" />
      </div>

      <ListeAnomalies anomalies={anomalies} />
    </div>
  )
}

function Action({ numero, fait, total, children }: { numero: number; fait: number; total: number; children: ReactNode }) {
  const termine = total > 0 && fait >= total
  return (
    <li className="flex items-start gap-3">
      <span className={cn('shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5',
        termine ? 'bg-green-700 text-green-100' : 'bg-slate-700 text-slate-300')}>
        {termine ? <Check size={12} /> : numero}
      </span>
      <span className="flex-1 text-slate-400">{children}</span>
      <span className={cn('shrink-0 text-xs font-mono mt-0.5', termine ? 'text-green-400' : 'text-slate-300')}>{fait} / {total}</span>
    </li>
  )
}

/** Ensemble d'identifiants cochés, avec bascule. */
function useCoches() {
  const [coches, setCoches] = useState<Set<string>>(new Set())
  const basculer = (id: string) =>
    setCoches(prev => {
      const suivant = new Set(prev)
      if (suivant.has(id)) suivant.delete(id)
      else suivant.add(id)
      return suivant
    })
  const vider = () => setCoches(new Set())
  return { coches, basculer, vider }
}

export default function TnavModule() {
  const [nomFichier, setNomFichier] = useState('')
  const [resultat, setResultat] = useState<ResultatTraitement | null>(null)
  const saisies = useCoches()
  const pdfVerses = useCoches()
  const casesDs = useCoches()
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  const afficherToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }
  const surCopie = (ok: boolean) =>
    ok ? afficherToast('Copié dans le presse-papiers.') : afficherToast('Copie impossible : sélectionnez le texte à la main.', false)

  const charger = async (fichiers: FileList | File[]) => {
    const fichier = Array.from(fichiers).find(f => f.name.toLowerCase().endsWith('.ods'))
    if (!fichier) {
      setErreur("Déposez l'export démarches-simplifiées au format .ods (le CSV ne contient pas les balises).")
      return
    }
    setErreur('')
    setChargement(true)
    try {
      setResultat(await traiterExportOds(await fichier.arrayBuffer()))
      setNomFichier(fichier.name)
      saisies.vider()
      pdfVerses.vider()
      casesDs.vider()
    } catch (e) {
      setResultat(null)
      setErreur(e instanceof Error ? e.message : String(e))
    } finally {
      setChargement(false)
    }
  }

  const r = resultat
  const nbErreurs = r ? [...r.anomalies, ...r.entrees.flatMap(e => e.anomalies)].filter(a => a.gravite === 'erreur').length : 0
  const anomaliesParDossier = (numero: string) => r?.anomalies.filter(a => a.dossier === numero) ?? []

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">

      {/* En-tête */}
      <div>
        <h1 className="text-xl font-bold text-blue-300">TNAV → Seamis</h1>
        <p className="text-sm text-slate-400 mt-1">
          Génère les entrées de la base balises Seamis (clé HEXID ou MMSI + texte) depuis l'export des déclarations
          de traversée de démarches-simplifiées. Le fichier est traité dans le navigateur : aucune donnée n'est transmise.
        </p>
      </div>

      {/* Zone de chargement */}
      <div
        className="border-2 border-dashed border-slate-600 rounded-xl p-6 text-center hover:border-blue-500 transition-colors cursor-pointer"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); charger(e.dataTransfer.files) }}
      >
        <Upload size={28} className="mx-auto text-slate-500 mb-2" />
        <p className="text-sm text-slate-300">Glisser-déposer l'export démarches-simplifiées au format <strong>.ods</strong></p>
        <p className="text-xs text-slate-500 mt-0.5">
          dossiers_declaration-traversee_AAAA-MM-JJ_HH-MM.ods — demander un nouvel export pour avoir des données à jour
        </p>
        {nomFichier && <p className="text-xs text-blue-300 mt-2">📄 {nomFichier}</p>}
        <input ref={inputRef} type="file" accept=".ods" className="hidden"
          onChange={e => { if (e.target.files?.length) { charger(e.target.files); e.target.value = '' } }} />
      </div>

      {chargement && <p className="text-sm text-blue-400">Lecture de l'export…</p>}
      {erreur && <p className="text-sm text-red-400 bg-red-950 px-3 py-2 rounded">{erreur}</p>}

      {r && (
        <>
          {/* Statistiques */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { libelle: "Dossiers dans l'export", valeur: r.totalDossiers, couleur: 'text-blue-300' },
              { libelle: 'Déjà dans Seamis', valeur: r.dossiersExclus.filter(d => d.raison === 'entré dans Seamis').length, couleur: 'text-slate-300' },
              { libelle: 'Dossiers à traiter', valeur: r.dossiersATraiter.length, couleur: 'text-green-400' },
              { libelle: 'Entrées balises', valeur: r.entrees.length, couleur: 'text-green-400' },
              { libelle: 'Erreurs', valeur: nbErreurs, couleur: nbErreurs ? 'text-red-400' : 'text-slate-300' },
            ].map(s => (
              <div key={s.libelle} className="bg-slate-800 rounded-xl p-3 text-center">
                <div className={cn('text-2xl font-bold', s.couleur)}>{s.valeur}</div>
                <div className="text-xs text-slate-400 mt-1">{s.libelle}</div>
              </div>
            ))}
          </div>

          {/* Actions à faire */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-sm text-slate-300 space-y-2">
            <p className="font-semibold text-slate-200">Actions à faire</p>
            <ol className="space-y-1.5">
              <Action numero={1} fait={saisies.coches.size} total={r.entrees.length}>
                <strong className="text-slate-300">Entrées balises</strong> : pour chaque entrée, copier la clé puis le texte
                dans la base balises de Seamis. Si la balise existe déjà, coller le texte <strong>en tête</strong> du texte existant.
              </Action>
              <Action numero={2} fait={pdfVerses.coches.size} total={r.dossiersATraiter.length}>
                <strong className="text-slate-300">PDF</strong> : pour chaque dossier, copier la recherche Seamis pour retrouver
                le navire, puis verser le PDF du dossier (ZIP de démarches-simplifiées) dans ses pièces jointes.
              </Action>
              <Action numero={3} fait={casesDs.coches.size} total={r.dossiersATraiter.length}>
                <strong className="text-slate-300">démarches-simplifiées</strong> : cocher « Entré dans Seamis? » pour chaque dossier à traiter.
              </Action>
            </ol>
          </div>

          {/* Entrées balises */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-200">1. Entrées balises à saisir ({r.entrees.length})</h2>
            {r.entrees.length === 0 && (
              <p className="text-sm text-slate-400">Aucune balise à saisir dans les dossiers à traiter.</p>
            )}
            {r.entrees.map(e => {
              const id = `${e.typeCle}:${e.cle}`
              return <CarteEntree key={id} entree={e} saisie={saisies.coches.has(id)} basculer={() => saisies.basculer(id)} onCopie={surCopie} />
            })}
          </section>

          {/* Dossiers à traiter */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-200">2. et 3. Dossiers à traiter ({r.dossiersATraiter.length})</h2>
              {r.dossiersATraiter.length > 0 && (
                <BoutonCopier texte={r.dossiersATraiter.map(d => d.numero).join('\n')} libelle="Copier les n° de dossier" onCopie={surCopie} />
              )}
            </div>
            {r.dossiersATraiter.length === 0 && (
              <p className="text-sm text-slate-400">Aucun dossier à traiter.</p>
            )}
            {r.dossiersATraiter.map(d => (
              <CarteDossier key={d.numero} dossier={d} anomalies={anomaliesParDossier(d.numero)}
                pdfVerse={pdfVerses.coches.has(d.numero)} basculerPdf={() => pdfVerses.basculer(d.numero)}
                dsCoche={casesDs.coches.has(d.numero)} basculerDs={() => casesDs.basculer(d.numero)}
                onCopie={surCopie} />
            ))}
          </section>

          {/* Dossiers exclus */}
          {r.dossiersExclus.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-400">Dossiers ignorés ({r.dossiersExclus.length})</h2>
              <p className="text-xs text-slate-500">
                {r.dossiersExclus.map(d => `${d.numero} (${d.nomNavire || 'sans nom'}, ${d.raison})`).join(' · ')}
              </p>
            </section>
          )}
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className={cn('fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium',
          toast.ok ? 'bg-green-800 text-green-100' : 'bg-red-800 text-red-100')}>
          {toast.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}
