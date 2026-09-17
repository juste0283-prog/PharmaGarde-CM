import { useEffect, useState } from 'react'
import { getDb } from '../db/database'
import { getCities, getPharmaciesForCity } from '../db/queries'
import type { Pharmacy, Position } from '../data/pharmacies'

export interface PharmacyData {
  cities: string[]
  pharmacies: Pharmacy[]
  loading: boolean
  error: string | null
}

export function usePharmacyData(
  city: string,
  position: Position | null,
): PharmacyData {
  const [state, setState] = useState<PharmacyData>({
    cities: [],
    pharmacies: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    setState((previous) => ({ ...previous, loading: true, error: null }))

    getDb()
      .then((db) => {
        const cities = getCities(db)
        const activeCity = city || cities[0]
        const pharmacies = activeCity
          ? getPharmaciesForCity(db, activeCity, position)
          : []
        if (!cancelled) {
          setState({ cities, pharmacies, loading: false, error: null })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState((previous) => ({
            ...previous,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : 'Erreur lors du chargement des données.',
          }))
        }
      })

    return () => {
      cancelled = true
    }
  }, [city, position])

  return state
}