// Coquille provisoire : le module TNAV est développé ici avant son intégration dans outils_cross,
// où seul le dossier src/modules/tnav sera repris (avec une entrée dans la barre latérale).
import TnavModule from './modules/tnav/TnavModule'

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="bg-slate-900 border-b border-slate-700 px-6 py-3 flex items-center gap-3">
        <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">CROSS Jobourg</p>
        <p className="text-xs text-slate-500">Outils opérationnels — préversion hors production</p>
      </header>
      <main>
        <TnavModule />
      </main>
    </div>
  )
}
