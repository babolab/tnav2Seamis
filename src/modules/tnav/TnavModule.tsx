import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  AlertCircle, AlertTriangle, Check, CheckCircle, Copy, Download, ExternalLink, FileImage, FileText, Info,
  Paperclip, Search, Ship, Upload,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { lirePiecesJointes, rechercheSeamis, traiterExportOds } from './core'
import type { Anomalie, Dossier, EntreeBalise, PieceJointe, PiecesJointesParDossier, ResultatTraitement } from './core'

/** Référentiel Seamis (réseau interne du CROSS). */
const URL_REFERENTIEL_BALISES = 'http://10.50.204.34/referentiel-client/#/beacons'
const URL_REFERENTIEL_NAVIRES = 'http://10.50.204.34/referentiel-client/#/ships'

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

const formatTaille = (octets: number) =>
  octets < 1024 * 1024 ? `${Math.max(1, Math.round(octets / 1024))} ko` : `${(octets / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`

const STYLE_GRAVITE: Record<Anomalie['gravite'], { classe: string; Icone: typeof AlertCircle }> = {
  erreur: { classe: 'text-red-300 bg-red-950/60', Icone: AlertCircle },
  avertissement: { classe: 'text-amber-300 bg-amber-950/50', Icone: AlertTriangle },
  info: { classe: 'text-sky-300 bg-sky-950/50', Icone: Info },
}

/** Couleurs propres à chaque section, pour les distinguer d'un coup d'œil. */
const SECTIONS = {
  balises: { titre: 'text-sky-300 border-sky-500', fond: 'bg-sky-950/50 border-sky-800', carte: 'border-sky-800/70', pastille: 'bg-sky-800 text-sky-100' },
  navires: { titre: 'text-amber-300 border-amber-500', fond: 'bg-amber-950/40 border-amber-800', carte: 'border-amber-800/70', pastille: 'bg-amber-700 text-amber-50' },
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

/** Pastille numérotée d'une étape (1, 2, 3) devant un bouton. */
function Etape({ numero, classe }: { numero: number; classe: string }) {
  return (
    <span className={cn('shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold', classe)}>
      {numero}
    </span>
  )
}

const CLASSE_BOUTON = 'flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium transition-colors whitespace-nowrap'

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
    <button onClick={copier} className={CLASSE_BOUTON}>
      {copie ? <Check size={13} className="text-green-400" /> : <Copy size={13} />} {libelle}
    </button>
  )
}

function LienReferentiel({ url, libelle }: { url: string; libelle: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={CLASSE_BOUTON}>
      <ExternalLink size={13} /> {libelle}
    </a>
  )
}

/** Suite d'étapes numérotées sur une seule ligne. */
function Etapes({ pastille, children }: { pastille: string; children: ReactNode[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {children.map((enfant, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Etape numero={i + 1} classe={pastille} />
          {enfant}
        </div>
      ))}
    </div>
  )
}

function CarteEntree({ entree, saisie, basculer, onCopie }: {
  entree: EntreeBalise
  saisie: boolean
  basculer: () => void
  onCopie: (ok: boolean) => void
}) {
  return (
    <div className={cn('bg-slate-800 rounded-xl p-4 space-y-3 border transition-opacity', SECTIONS.balises.carte, saisie && 'opacity-50')}>
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn('px-2 py-0.5 rounded text-xs font-bold',
          entree.typeCle === 'HEXID' ? 'bg-blue-900 text-blue-200' : 'bg-violet-900 text-violet-200')}>
          {entree.typeCle}
        </span>
        <span className="font-mono text-lg text-slate-100 select-all">{entree.cle}</span>
        <span className="text-sm text-slate-400">
          {entree.typeBalise || 'Balise'} · {entree.nomNavire || 'navire sans nom'} · dossier{entree.dossiers.length > 1 ? 's' : ''} {entree.dossiers.join(', ')}
        </span>
        <label className="ml-auto flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
          <input type="checkbox" checked={saisie} onChange={basculer} className="accent-green-500" />
          Saisie dans Seamis
        </label>
      </div>
      <Etapes pastille={SECTIONS.balises.pastille}>
        <BoutonCopier texte={entree.cle} libelle="Copier la clé" onCopie={onCopie} />
        <LienReferentiel url={URL_REFERENTIEL_BALISES} libelle="Ouvrir le référentiel balises" />
        <BoutonCopier texte={entree.texte} libelle="Copier le texte" onCopie={onCopie} />
      </Etapes>
      <ListeAnomalies anomalies={entree.anomalies} />
      <pre className="bg-slate-950 rounded-lg p-3 text-xs text-slate-200 whitespace-pre-wrap break-words font-mono leading-relaxed">{entree.texte}</pre>
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

/** Liens de téléchargement des pièces jointes d'un dossier (URL blob libérées au démontage). */
function PiecesJointes({ pieces }: { pieces: PieceJointe[] }) {
  const liens = useMemo(
    () => pieces.map(p => ({ piece: p, url: URL.createObjectURL(new Blob([p.donnees as BlobPart], { type: p.type })) })),
    [pieces],
  )
  useEffect(() => () => liens.forEach(l => URL.revokeObjectURL(l.url)), [liens])
  const refs = useRef<(HTMLAnchorElement | null)[]>([])

  const toutTelecharger = () => refs.current.forEach(a => a?.click())

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Paperclip size={13} /> Pièces jointes ({pieces.length})
        </span>
        {pieces.length > 1 && (
          <button onClick={toutTelecharger} className={CLASSE_BOUTON}><Download size={13} /> Tout télécharger</button>
        )}
      </div>
      <ul className="space-y-1">
        {liens.map(({ piece, url }, i) => (
          <li key={piece.chemin}>
            <a ref={el => { refs.current[i] = el }} href={url} download={piece.nom}
              // Chrome / Edge : glisser le lien vers un dossier enregistre directement le fichier
              onDragStart={e => e.dataTransfer.setData('DownloadURL', `${piece.type}:${piece.nom}:${url}`)}
              className="inline-flex items-center gap-2 text-xs text-slate-200 hover:text-amber-200 hover:underline">
              {piece.type.startsWith('image/') ? <FileImage size={13} className="text-slate-500" /> : <FileText size={13} className="text-slate-500" />}
              {piece.nom}
              <span className="text-slate-500">{formatTaille(piece.taille)}</span>
              <Download size={12} className="text-slate-500" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CarteNavire({ dossier: d, anomalies, pieces, zipCharge, pdfVerse, basculerPdf, dsCoche, basculerDs, onCopie }: {
  dossier: Dossier
  anomalies: Anomalie[]
  pieces: PieceJointe[] | undefined
  zipCharge: boolean
  pdfVerse: boolean
  basculerPdf: () => void
  dsCoche: boolean
  basculerDs: () => void
  onCopie: (ok: boolean) => void
}) {
  const recherche = rechercheSeamis(d)
  const termine = pdfVerse && dsCoche
  return (
    <div className={cn('bg-slate-800 rounded-xl p-4 space-y-3 border transition-opacity', SECTIONS.navires.carte, termine && 'opacity-50')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xl font-bold text-slate-100">
            <Ship size={18} className="text-amber-400" />{d.navire.nom || 'Navire sans nom'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            déposé {formatDepot(d.dateDepot)} · {d.etat || 'état inconnu'} · {d.balises.length} balise{d.balises.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">N° de démarche</p>
          <p className="font-mono text-lg text-slate-100 select-all">{d.numero}</p>
        </div>
      </div>

      {/* Recherche du navire dans Seamis */}
      <div className="bg-slate-950 rounded-lg p-3 space-y-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-300"><Search size={13} /> Recherche du navire dans Seamis</p>
        {recherche.texte ? (
          <>
            <code className="block font-mono text-sm text-slate-100 select-all break-all">{recherche.texte}</code>
            <Etapes pastille={SECTIONS.navires.pastille}>
              <BoutonCopier texte={recherche.texte} libelle="Copier la recherche" onCopie={onCopie} />
              <LienReferentiel url={URL_REFERENTIEL_NAVIRES} libelle="Ouvrir le référentiel navires" />
              <span className="text-xs text-slate-300">Verser les pièces jointes ci-dessous au navire</span>
            </Etapes>
          </>
        ) : (
          <p className="text-xs text-amber-300">Aucun identifiant du navire : le retrouver à partir du PDF.</p>
        )}
      </div>

      {/* Pièces jointes du dossier, issues du ZIP */}
      <div className="bg-slate-950 rounded-lg p-3">
        {pieces?.length ? (
          <PiecesJointes pieces={pieces} />
        ) : zipCharge ? (
          <p className="flex items-center gap-1.5 text-xs text-amber-300">
            <AlertTriangle size={13} /> Aucune pièce jointe pour ce dossier dans le ZIP : vérifier que le ZIP vient du même export.
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <Paperclip size={13} /> Déposez le ZIP de l'export pour afficher le PDF et les pièces jointes du dossier <span className="font-mono text-slate-300">{d.numero}</span>.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <CaseAction coche={pdfVerse} basculer={basculerPdf} libelle="PDF et pièces jointes versés au navire dans Seamis" />
        <CaseAction coche={dsCoche} basculer={basculerDs} libelle="« Entré dans Seamis? » coché dans démarches-simplifiées" />
      </div>

      <ListeAnomalies anomalies={anomalies} />
    </div>
  )
}

/** Action à faire : rouge tant qu'il en reste, verte une fois terminée. */
function Action({ numero, fait, total, children }: { numero: string; fait: number; total: number; children: ReactNode }) {
  const termine = fait >= total
  return (
    <li className="flex items-start gap-3">
      <span className={cn('shrink-0 min-w-5 h-5 px-1 rounded-full flex items-center justify-center text-xs font-bold mt-0.5',
        termine ? 'bg-green-700 text-green-100' : 'bg-red-800 text-red-100')}>
        {termine ? <Check size={12} /> : numero}
      </span>
      <span className="flex-1 text-slate-400">{children}</span>
      <span className={cn('shrink-0 text-xs font-mono font-bold mt-0.5', termine ? 'text-green-400' : 'text-red-400')}>{fait} / {total}</span>
    </li>
  )
}

/** État d'un des deux fichiers attendus : chargé (vert, avec son nom) ou à déposer (rouge). */
function EtatFichier({ libelle, nom }: { libelle: string; nom: string }) {
  return (
    <span className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full',
      nom ? 'bg-green-950 text-green-300' : 'bg-red-950 text-red-300')}>
      {nom ? <Check size={12} /> : <AlertCircle size={12} />}
      {libelle} : {nom || 'à déposer'}
    </span>
  )
}

function TitreSection({ classe, children }: { classe: string; children: ReactNode }) {
  return <div className={cn('border-l-4 pl-3', classe)}>{children}</div>
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
  const [nomZip, setNomZip] = useState('')
  const [resultat, setResultat] = useState<ResultatTraitement | null>(null)
  const [piecesJointes, setPiecesJointes] = useState<PiecesJointesParDossier | null>(null)
  const saisies = useCoches()
  const pdfVerses = useCoches()
  const casesDs = useCoches()
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  // Whole-page drop target, so the zip can be dropped after the ods even when scrolled down.
  // Only drags carrying files are handled: dragging an attachment link out of the page is left alone.
  const [survol, setSurvol] = useState(false)
  const chargerRef = useRef<(fichiers: FileList) => void>(() => {})
  useEffect(() => {
    let profondeur = 0
    const avecFichiers = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files')
    const entree = (e: DragEvent) => { if (avecFichiers(e)) { profondeur++; setSurvol(true) } }
    const sortie = (e: DragEvent) => { if (avecFichiers(e) && --profondeur <= 0) { profondeur = 0; setSurvol(false) } }
    const survole = (e: DragEvent) => { if (avecFichiers(e)) e.preventDefault() }
    const depose = (e: DragEvent) => {
      if (!avecFichiers(e)) return
      e.preventDefault()
      profondeur = 0
      setSurvol(false)
      if (e.dataTransfer?.files.length) chargerRef.current(e.dataTransfer.files)
    }
    window.addEventListener('dragenter', entree)
    window.addEventListener('dragleave', sortie)
    window.addEventListener('dragover', survole)
    window.addEventListener('drop', depose)
    return () => {
      window.removeEventListener('dragenter', entree)
      window.removeEventListener('dragleave', sortie)
      window.removeEventListener('dragover', survole)
      window.removeEventListener('drop', depose)
    }
  }, [])

  const afficherToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }
  const surCopie = (ok: boolean) =>
    ok ? afficherToast('Copié dans le presse-papiers.') : afficherToast('Copie impossible : sélectionnez le texte à la main.', false)

  // L'ods et le zip peuvent être déposés ensemble ou l'un après l'autre.
  const charger = async (fichiers: FileList | File[]) => {
    const liste = Array.from(fichiers)
    const ods = liste.find(f => f.name.toLowerCase().endsWith('.ods'))
    const zip = liste.find(f => f.name.toLowerCase().endsWith('.zip'))
    if (!ods && !zip) {
      setErreur("Déposez l'export démarches-simplifiées au format .ods (le CSV ne contient pas les balises) et le .zip des pièces jointes.")
      return
    }
    setErreur('')
    setChargement(true)
    const erreurs: string[] = []
    if (ods) {
      try {
        setResultat(await traiterExportOds(await ods.arrayBuffer()))
        setNomFichier(ods.name)
        saisies.vider()
        pdfVerses.vider()
        casesDs.vider()
      } catch (e) {
        setResultat(null)
        erreurs.push(e instanceof Error ? e.message : String(e))
      }
    }
    if (zip) {
      try {
        const { parDossier, nonRattachees } = await lirePiecesJointes(await zip.arrayBuffer())
        setPiecesJointes(parDossier)
        setNomZip(zip.name)
        if (nonRattachees.length) erreurs.push(`${nonRattachees.length} fichier(s) du ZIP sans n° de dossier reconnu : ${nonRattachees.join(', ')}`)
      } catch (e) {
        setPiecesJointes(null)
        erreurs.push(e instanceof Error ? e.message : String(e))
      }
    }
    setErreur(erreurs.join(' '))
    setChargement(false)
  }

  chargerRef.current = charger

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
          de traversée de démarches-simplifiées. Les fichiers sont traités dans le navigateur : aucune donnée n'est transmise.
        </p>
      </div>

      {/* Zone de chargement (le dépôt fonctionne aussi partout dans la page) */}
      <div
        className="border-2 border-dashed border-slate-600 rounded-xl p-6 text-center hover:border-blue-500 transition-colors cursor-pointer"
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={28} className="mx-auto text-slate-500 mb-2" />
        <p className="text-sm text-slate-300">
          Glisser-déposer l'export démarches-simplifiées au format <strong>.ods</strong> et le <strong>.zip</strong> des pièces jointes,
          ensemble ou l'un après l'autre, n'importe où dans la page
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          dossiers_declaration-traversee_AAAA-MM-JJ_HH-MM.ods et .zip — demander un nouvel export pour avoir des données à jour
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-3 text-xs">
          <EtatFichier libelle=".ods (balises et dossiers)" nom={nomFichier} />
          <EtatFichier libelle=".zip (pièces jointes)" nom={nomZip} />
        </div>
        <input ref={inputRef} type="file" accept=".ods,.zip" multiple className="hidden"
          onChange={e => { if (e.target.files?.length) { charger(e.target.files); e.target.value = '' } }} />
      </div>

      {chargement && <p className="text-sm text-blue-400">Lecture des fichiers…</p>}
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
              <Action numero="1" fait={saisies.coches.size} total={r.entrees.length}>
                <strong className="text-sky-300">Balises</strong> : pour chaque entrée, copier la clé, ouvrir le référentiel
                balises puis coller le texte. Si la balise existe déjà, coller le texte <strong>en tête</strong> du texte existant.
              </Action>
              <Action numero="2a" fait={pdfVerses.coches.size} total={r.dossiersATraiter.length}>
                <strong className="text-amber-300">Navires</strong> : pour chaque dossier, copier la recherche, ouvrir le référentiel
                navires puis verser le PDF et les pièces jointes du dossier dans ceux du navire.
              </Action>
              <Action numero="2b" fait={casesDs.coches.size} total={r.dossiersATraiter.length}>
                <strong className="text-amber-300">démarches-simplifiées</strong> : cocher « Entré dans Seamis? » pour chaque dossier à traiter.
              </Action>
            </ol>
          </div>

          {/* 1. Balises */}
          <section className={cn('space-y-3 rounded-2xl border-2 p-4', SECTIONS.balises.fond)}>
            <TitreSection classe={SECTIONS.balises.titre}>
              <h2 className="text-2xl font-bold">1. Balises Seamis ({r.entrees.length})</h2>
            </TitreSection>
            {r.entrees.length === 0 && (
              <p className="text-sm text-slate-400">Aucune balise à saisir dans les dossiers à traiter.</p>
            )}
            {r.entrees.map(e => {
              const id = `${e.typeCle}:${e.cle}`
              return <CarteEntree key={id} entree={e} saisie={saisies.coches.has(id)} basculer={() => saisies.basculer(id)} onCopie={surCopie} />
            })}
          </section>

          {/* 2. Navires */}
          <section className={cn('space-y-3 rounded-2xl border-2 p-4', SECTIONS.navires.fond)}>
            <div className="flex flex-wrap items-center gap-3">
              <TitreSection classe={SECTIONS.navires.titre}>
                <h2 className="text-2xl font-bold">2. Navires Seamis ({r.dossiersATraiter.length})</h2>
              </TitreSection>
              {r.dossiersATraiter.length > 0 && (
                <BoutonCopier texte={r.dossiersATraiter.map(d => d.numero).join('\n')} libelle="Copier les n° de démarche" onCopie={surCopie} />
              )}
            </div>
            {r.dossiersATraiter.length === 0 && (
              <p className="text-sm text-slate-400">Aucun dossier à traiter.</p>
            )}
            {r.dossiersATraiter.map(d => (
              <CarteNavire key={d.numero} dossier={d} anomalies={anomaliesParDossier(d.numero)}
                pieces={piecesJointes?.get(d.numero)} zipCharge={!!piecesJointes}
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

      {/* Voile pendant le glisser-déposer de fichiers */}
      {survol && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-slate-950/70 border-4 border-dashed border-blue-500">
          <p className="flex items-center gap-2 text-lg font-semibold text-blue-200">
            <Upload size={22} /> Déposer le .ods et/ou le .zip
          </p>
        </div>
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
