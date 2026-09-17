import { useEffect, useState } from 'react'
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
  type PharmacyFilters,
  type Position,
} from './data/pharmacies'

export default function App() {
  const [city, setCity] = useState('')
  const [position, setPosition] = useState<Position | null>(null)
  const [view, setView] = useState<ViewMode>('liste')
  const [filters, setFilters] = useState<PharmacyFilters>(EMPTY_FILTERS)
  const { cities, quartiers, pharmacies, loading, error } = usePharmacyData(
    city,
    position,
    filters,
  )

  const defaultCity = cities[0]?.name ?? ''
  const activeCity = city || defaultCity
  const cityObject = cities.find((c) => c.name === activeCity)

  useEffect(() => {
    if (!city && defaultCity) {
      setCity(defaultCity)
    }
  }, [city, defaultCity])

  const handleCityChange = (nextCity: string) => {
    setCity(nextCity)
    setFilters((previous) => ({ ...previous, quartier: '' }))
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero
          cities={cities}
          city={city || defaultCity}
          onCityChange={handleCityChange}
          onPositionChange={setPosition}
        />
        <ResultsView
          cities={cities}
          city={cityObject}
          quartiers={quartiers}
          pharmacies={pharmacies}
          loading={loading}
          error={error}
          position={position}
          view={view}
          filters={filters}
          onViewChange={setView}
          onCityChange={handleCityChange}
          onFiltersChange={setFilters}
        />
        <HowItWorks />
        <Reliability />
        <ReportCta />
      </main>
      <Footer />
    </div>
  )
}