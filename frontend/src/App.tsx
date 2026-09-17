import { useEffect, useState } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import PharmaciesGarde from './components/PharmaciesGarde'
import HowItWorks from './components/HowItWorks'
import Reliability from './components/Reliability'
import ReportCta from './components/ReportCta'
import Footer from './components/Footer'
import { usePharmacyData } from './hooks/usePharmacyData'
import type { Position } from './data/pharmacies'

export default function App() {
  const [city, setCity] = useState('')
  const [position, setPosition] = useState<Position | null>(null)
  const { cities, pharmacies, loading, error } = usePharmacyData(city, position)

  const defaultCity = cities[0] ?? ''
  const activeCity = city || defaultCity

  useEffect(() => {
    if (!city && defaultCity) {
      setCity(defaultCity)
    }
  }, [city, defaultCity])

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero
          cities={cities}
          city={city || defaultCity}
          onCityChange={setCity}
          onPositionChange={setPosition}
        />
        <PharmaciesGarde
          city={activeCity}
          pharmacies={pharmacies}
          loading={loading}
          error={error}
        />
        <HowItWorks />
        <Reliability />
        <ReportCta />
      </main>
      <Footer />
    </div>
  )
}