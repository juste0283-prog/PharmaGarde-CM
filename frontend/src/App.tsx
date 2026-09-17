import { useCallback, useState } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import HowItWorks from './components/HowItWorks'
import Reliability from './components/Reliability'
import ReportCta from './components/ReportCta'
import Footer from './components/Footer'
import ResultsView, { type ViewMode } from './components/ResultsView'
import { usePharmacyData } from './hooks/usePharmacyData'
import {
  EMPTY_FILTERS,
  type Pharmacy,
  type PharmacyFilters,
  type Position,
} from './data/pharmacies'

export default function App() {
  const [city, setCity] = useState('')
  const [position, setPosition] = useState<Position | null>(null)
  const [view, setView] = useState<ViewMode>('liste')
  const [filters, setFilters] = useState<PharmacyFilters>(EMPTY_FILTERS)
  const [routeTargetId, setRouteTargetId] = useState<number | null>(null)
  const { cities, quartiers, pharmacies, quartierPoints, loading, error } =
    usePharmacyData(city, position, filters)

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

  const routeTarget =
    pharmacies.find((p) => p.id === routeTargetId) ?? null

  return (
    <div className="min-h-screen">
      <Header />
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
        />
        <HowItWorks />
        <Reliability />
        <ReportCta />
      </main>
      <Footer />
    </div>
  )
}