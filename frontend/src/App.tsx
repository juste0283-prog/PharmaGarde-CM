import { useCallback, useState } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import HowItWorks from './components/HowItWorks'
import BackOffice from './components/BackOffice'
import Reliability from './components/Reliability'
import ReportCta from './components/ReportCta'
import Footer from './components/Footer'
import ReportModal from './components/ReportModal'
import ResultsView, { type ViewMode } from './components/ResultsView'
import { usePharmacyData } from './hooks/usePharmacyData'
import {
  EMPTY_FILTERS,
  type Pharmacy,
  type PharmacyFilters,
  type Position,
  type ReportRecord,
} from './data/pharmacies'

export default function App() {
  const [city, setCity] = useState('')
  const [position, setPosition] = useState<Position | null>(null)
  const [view, setView] = useState<ViewMode>('liste')
  const [filters, setFilters] = useState<PharmacyFilters>(EMPTY_FILTERS)
  const [routeTargetId, setRouteTargetId] = useState<number | null>(null)
  const [screen, setScreen] = useState<'accueil' | 'espace'>('accueil')
  const [reportTarget, setReportTarget] = useState<Pharmacy | null>(null)
  const [reportNotice, setReportNotice] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const { cities, quartiers, pharmacies, quartierPoints, loading, error } =
    usePharmacyData(city, position, filters, reloadKey)

  const openSpace = useCallback(() => setScreen('espace'), [])
  const closeSpace = useCallback(() => setScreen('accueil'), [])

  const cityObject = city ? cities.find((c) => c.name === city) : undefined

  const handleCityChange = useCallback((nextCity: string) => {
    setCity(nextCity)
    setRouteTargetId(null)
    setFilters((previous) => ({ ...previous, quartier: '' }))
  }, [])

  const handleFiltersChange = useCallback((next: PharmacyFilters) => {
    setFilters(next)
    setRouteTargetId(null)
  }, [])

  const handleDirections = useCallback((pharmacy: Pharmacy) => {
    setRouteTargetId(pharmacy.id)
    setView('carte')
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('#pharmacies')
        ?.scrollIntoView({ behavior: 'smooth' })
    })
  }, [])

  const handleReportSubmitted = useCallback((report: ReportRecord) => {
    setReportTarget(null)
    setReloadKey((previous) => previous + 1)
    setReportNotice(
      `Signalement n°${report.id} enregistré : il sera remonté à la pharmacie et à l’administration pour vérification.`,
    )
    window.setTimeout(() => setReportNotice(null), 8000)
  }, [])

  const routeTarget =
    pharmacies.find((p) => p.id === routeTargetId) ?? null

  if (screen === 'espace') {
    return <BackOffice onExit={closeSpace} />
  }

  return (
    <div className="min-h-screen">
      {reportNotice && (
        <div className="fixed left-1/2 top-4 z-50 w-max max-w-[92vw] -translate-x-1/2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg">
          {reportNotice}
        </div>
      )}
      <Header onOpenSpace={openSpace} />
      <main>
        <Hero
          cities={cities}
          city={city}
          onCityChange={handleCityChange}
          onPositionChange={setPosition}
        />
        <ResultsView
          cities={cities}
          city={cityObject}
          quartiers={quartiers}
          pharmacies={pharmacies}
          quartierPoints={quartierPoints}
          loading={loading}
          error={error}
          position={position}
          view={view}
          filters={filters}
          routeTarget={routeTarget}
          onViewChange={setView}
          onCityChange={handleCityChange}
          onFiltersChange={handleFiltersChange}
          onDirections={handleDirections}
          onReport={setReportTarget}
        />
        <HowItWorks />
        <Reliability />
        <ReportCta />
      </main>
      <Footer onOpenSpace={openSpace} />
      {reportTarget && (
        <ReportModal
          pharmacy={reportTarget}
          onClose={() => setReportTarget(null)}
          onSubmitted={handleReportSubmitted}
        />
      )}
    </div>
  )
}