import { useEffect, useRef, useState } from 'react'
import { AlertCircle, AlertTriangle, Check, CheckCircle, Copy, Info, Ship, Upload } from 'lucide-react'
import { cn } from '../../lib/utils'
import { traiterExportOds } from './core'
import type { Anomalie, EntreeBalise, ResultatTraitement } from './core'

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

export default function TnavModule() {
  const [nomFichier, setNomFichier] = useState('')
  const [resultat, setResultat] = useState<ResultatTraitement | null>(null)
  const [saisies, setSaisies] = useState<Set<string>>(new Set())
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
      setSaisies(new Set())
    } catch (e) {
      setResultat(null)
      setErreur(e instanceof Error ? e.message : String(e))
    } finally {
      setChargement(false)
    }
  }

  const basculerSaisie = (id: string) =>
    setSaisies(prev => {
      const suivant = new Set(prev)
      if (suivant.has(id)) suivant.delete(id)
      else suivant.add(id)
      return suivant
    })

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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { libelle: "Dossiers dans l'export", valeur: r.totalDossiers, couleur: 'text-blue-300' },
              { libelle: 'Déjà dans Seamis', valeur: r.dossiersExclus.filter(d => d.raison === 'entré dans Seamis').length, couleur: 'text-slate-300' },
              { libelle: 'Dossiers à traiter', valeur: r.dossiersATraiter.length, couleur: 'text-green-400' },
              { libelle: 'Entrées balises', valeur: r.entrees.length, couleur: 'text-green-400' },
              { libelle: 'Saisies cochées', valeur: `${saisies.size} / ${r.entrees.length}`, couleur: 'text-slate-300' },
              { libelle: 'Erreurs', valeur: nbErreurs, couleur: nbErreurs ? 'text-red-400' : 'text-slate-300' },
            ].map(s => (
              <div key={s.libelle} className="bg-slate-800 rounded-xl p-3 text-center">
                <div className={cn('text-2xl font-bold', s.couleur)}>{s.valeur}</div>
                <div className="text-xs text-slate-400 mt-1">{s.libelle}</div>
              </div>
            ))}
          </div>

          {/* Mode opératoire */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-sm text-slate-300 space-y-1">
            <p className="font-semibold text-slate-200">Mode opératoire</p>
            <ol className="list-decimal list-inside space-y-0.5 text-slate-400">
              <li>Pour chaque entrée : copier la clé, puis le texte, dans la base balises de Seamis. Si la balise existe déjà, coller le texte <strong>en tête</strong> du texte existant.</li>
              <li>Verser le PDF de chaque dossier à traiter (ZIP de démarches-simplifiées) dans les pièces jointes du navire Seamis.</li>
              <li>Cocher « Entré dans Seamis » dans démarches-simplifiées pour chaque dossier à traiter (liste plus bas).</li>
            </ol>
          </div>

          {/* Entrées balises */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-200">Entrées balises à saisir ({r.entrees.length})</h2>
            {r.entrees.length === 0 && (
              <p className="text-sm text-slate-400">Aucune balise à saisir dans les dossiers à traiter.</p>
            )}
            {r.entrees.map(e => {
              const id = `${e.typeCle}:${e.cle}`
              return <CarteEntree key={id} entree={e} saisie={saisies.has(id)} basculer={() => basculerSaisie(id)} onCopie={surCopie} />
            })}
          </section>

          {/* Dossiers à traiter */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-200">Dossiers à traiter ({r.dossiersATraiter.length})</h2>
              {r.dossiersATraiter.length > 0 && (
                <BoutonCopier texte={r.dossiersATraiter.map(d => d.numero).join('\n')} libelle="Copier les n° de dossier" onCopie={surCopie} />
              )}
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 text-slate-400 text-xs">
                  <tr>
                    <th className="text-left px-3 py-2">N° dossier</th>
                    <th className="text-left px-3 py-2">Navire</th>
                    <th className="text-left px-3 py-2">Dépôt</th>
                    <th className="text-left px-3 py-2">État</th>
                    <th className="text-center px-3 py-2">Balises</th>
                    <th className="text-left px-3 py-2">Anomalies</th>
                  </tr>
                </thead>
                <tbody>
                  {r.dossiersATraiter.map(d => (
                    <tr key={d.numero} className="border-t border-slate-700 align-top">
                      <td className="px-3 py-2 font-mono">{d.numero}</td>
                      <td className="px-3 py-2"><Ship size={13} className="inline mr-1 text-slate-500" />{d.navire.nom || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-400">{formatDepot(d.dateDepot)}</td>
                      <td className="px-3 py-2 text-slate-400">{d.etat || '—'}</td>
                      <td className="px-3 py-2 text-center">{d.balises.length}</td>
                      <td className="px-3 py-2"><ListeAnomalies anomalies={anomaliesParDossier(d.numero)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
