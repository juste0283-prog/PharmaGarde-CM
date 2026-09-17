import { useRef, useState } from 'react'
import type { City, Position } from '../data/pharmacies'

interface HeroProps {
  cities: City[]
  city: string
  onCityChange: (city: string) => void
  onPositionChange: (position: Position) => void
}

type GeoState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'success'; label: string }
  | { status: 'error'; message: string }

export default function Hero({ cities, city, onCityChange, onPositionChange }: HeroProps) {
  const [geo, setGeo] = useState<GeoState>({ status: 'idle' })
  const geoId = useRef(0)

  const locate = () => {
    if (!navigator.geolocation) {
      setGeo({ status: 'error', message: "La géolocalisation n'est pas disponible sur cet appareil." })
      return
    }
    setGeo({ status: 'locating' })
    const id = ++geoId.current
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (id !== geoId.current) return
        const { latitude, longitude } = position.coords
        onPositionChange({ lat: latitude, lng: longitude })
        setGeo({
          status: 'success',
          label: `Position détectée : ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        })
      },
      () => {
        if (id !== geoId.current) return
        setGeo({ status: 'error', message: 'Impossible de vous localiser. Choisissez une ville ci-dessous.' })
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  return (
    <section id="accueil" className="relative overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25) 0, transparent 24%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.2) 0, transparent 26%)',
        }}
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium ring-1 ring-white/20">
          <span className="size-2 rounded-full bg-emerald-300" aria-hidden="true" />
          {cities.length || 10} villes couvertes (chefs-lieux de région du Cameroun)
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Trouvez une pharmacie de garde près de chez vous
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-emerald-50/90">
          Recherche, vérification et confirmation de garde au Cameroun : une
          information actualisée, vérifiée et accessible pour ne plus tomber sur
          une pharmacie fermée.
        </p>

        <div className="mx-auto mt-10 max-w-3xl rounded-2xl bg-white p-2 shadow-2xl sm:p-3">
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault()
              document.querySelector<HTMLElement>('#pharmacies')?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            <div className="flex flex-1 flex-col gap-1.5 sm:flex-row sm:items-center">
              <label htmlFor="ville" className="sr-only">
                Ville
              </label>
              <div className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-left text-slate-800 sm:border-r sm:border-slate-200">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-5 shrink-0 text-emerald-600"
                  aria-hidden="true"
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <select
                  id="ville"
                  value={city}
                  onChange={(e) => onCityChange(e.target.value)}
                  className="w-full bg-transparent text-sm font-medium outline-none"
                >
                  {cities.length === 0 ? (
                    <option value="" disabled>
                      Chargement…
                    </option>
                  ) : (
                    cities.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              Rechercher
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
                aria-hidden="true"
              >
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
          </form>

          <div className="flex items-center gap-3 px-2 py-2 sm:px-3">
            <div className="h-px flex-1 bg-slate-200" aria-hidden="true" />
            <button
              type="button"
              onClick={locate}
              disabled={geo.status === 'locating'}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3" />
                <path d="M12 19v3" />
                <path d="M2 12h3" />
                <path d="M19 12h3" />
              </svg>
              {geo.status === 'locating' ? 'Localisation…' : "Utiliser ma position"}
            </button>
            <div className="h-px flex-1 bg-slate-200" aria-hidden="true" />
          </div>

          {geo.status === 'success' && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
              {geo.label}
            </p>
          )}
          {geo.status === 'error' && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">{geo.message}</p>
          )}
        </div>

        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-emerald-50/90">
          <li className="flex items-center gap-2">
            <CheckIcon /> Données vérifiées
          </li>
          <li className="flex items-center gap-2">
            <CheckIcon /> Statut horodaté
          </li>
          <li className="flex items-center gap-2">
            <CheckIcon /> Appel &amp; itinéraire
          </li>
        </ul>
      </div>
    </section>
  )
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 text-emerald-300"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}