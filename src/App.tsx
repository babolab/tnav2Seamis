// Coquille minimale : le module TNAV est affiché seul, ou en iframe dans l'onglet « TNAV → Seamis » d'outils_cross.
import TnavModule from './modules/tnav/TnavModule'

export default function App() {
  return (
    <main className="min-h-screen">
      <TnavModule />
    </main>
  )
}
