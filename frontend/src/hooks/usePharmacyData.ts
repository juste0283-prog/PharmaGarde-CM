import { useEffect, useState } from 'react'
import { getDb } from '../db/database'
import {
  filterPharmacies,
  getCities,
  getPharmacies,
  getQuartierPoints,
} from '../db/queries'
import type {
  City,
  Pharmacy,
  PharmacyFilters,
  Position,
  QuartierPoint,
} from '../data/pharmacies'

export interface PharmacyData {
  cities: City[]
  quartiers: string[]
  pharmacies: Pharmacy[]
  quartierPoints: QuartierPoint[]
  loading: boolean
  error: string | null
}

export function usePharmacyData(
  city: string,
  position: Position | null,
  filters: PharmacyFilters,
  reloadKey = 0,
): PharmacyData {
  const [state, setState] = useState<PharmacyData>({
    cities: [],
    quartiers: [],
    pharmacies: [],
    quartierPoints: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    setState((previous) => ({ ...previous, loading: true, error: null }))

    getDb()
      .then((db) => {
        const cities = getCities(db)
        const quartierPoints = getQuartierPoints(db, city)
        const quartiers = city
          ? [...new Set(quartierPoints.map((point) => point.quartier))].sort((a, b) =>
              a.localeCompare(b),
            )
          : []
        const pharmacies = filterPharmacies(getPharmacies(db, city, position), filters)
        if (!cancelled) {
          setState({
            cities,
            quartiers,
            pharmacies,
            quartierPoints,
            loading: false,
            error: null,
          })
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
  }, [city, position, filters, reloadKey])

  return state
}