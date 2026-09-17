import {
  EMPTY_FILTERS,
  type City,
  type Pharmacy,
  type PharmacyFilters,
  type Position,
} from '../data/pharmacies'
import FiltersBar from './FiltersBar'
import PharmacyCard from './PharmacyCard'
import PharmacyMap from './PharmacyMap'

export type ViewMode = 'liste' | 'carte'

interface ResultsViewProps {
  cities: City[]
  city: City | undefined
  quartiers: string[]
  pharmacies: Pharmacy[]
  loading: boolean
  error: string | null
  position: Position | null
  view: ViewMode
  filters: PharmacyFilters
  onViewChange: (view: ViewMode) => void
  onCityChange: (city: string) => void
  onFiltersChange: (filters: PharmacyFilters) => void
}

function formatNow() {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())
}

const VIEW_TABS: { id: ViewMode; label: string }[] = [
  { id: 'liste', label: 'Liste' },
  { id: 'carte', label: 'Carte' },
]

export default function ResultsView({
  cities,
  city,
  quartiers,
  pharmacies,
  loading,
  error,
  position,
  view,
  filters,
  onViewChange,
  onCityChange,
  onFiltersChange,
}: ResultsViewProps) {
  return (
    <section id="pharmacies" className="scroll-mt-20 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Pharmacies de garde en ce moment
            </h2>
            <p className="mt-2 text-slate-600">
              {city ? (
                <>
                  {city.name} · {city.region}, gardes valides pour la date et l'heure courantes.
                </>
              ) : (
                "Gardes valides pour la date et l'heure courantes."
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
              {formatNow()}
            </p>
            <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {VIEW_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={view === tab.id}
                  onClick={() => onViewChange(tab.id)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
                    view === tab.id
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-400">
       
        </p>

        {!loading && error === null && (
          <div className="mt-5">
            <FiltersBar
              cities={cities}
              city={city?.name ?? ''}
              quartiers={quartiers}
              filters={filters}
              resultCount={pharmacies.length}
              onCityChange={onCityChange}
              onChange={onFiltersChange}
            />
          </div>
        )}

        {loading && (
          <div className="mt-8 flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-10 text-slate-600">
            <span className="size-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            Chargement des pharmacies…
          </div>
        )}

        {!loading && error !== null && (
          <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
            <p className="font-semibold">Impossible de charger les pharmacies.</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {!loading && error === null && pharmacies.length === 0 && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
            <p className="font-medium">
              Aucune pharmacie ne correspond aux critères pour {city?.name ?? 'cette ville'}.
            </p>
            <button
              type="button"
              onClick={() => onFiltersChange(EMPTY_FILTERS)}
              className="mt-3 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}

        {!loading && error === null && pharmacies.length > 0 && (
          <div className="mt-6">
            {view === 'liste' ? (
              <>
                <p className="mb-4 text-sm font-medium text-slate-500">
                  {pharmacies.length} pharmacie{pharmacies.length > 1 ? 's' : ''} à garde active :
                  {position !== null ? ' triées par distance' : ' classées par fiabilité'}
                </p>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {pharmacies.map((pharmacy) => (
                    <PharmacyCard key={pharmacy.id} pharmacy={pharmacy} />
                  ))}
                </div>
              </>
            ) : (
              city && (
                <PharmacyMap
                  pharmacies={pharmacies}
                  position={position}
                  city={city}
                />
              )
            )}
          </div>
        )}
      </div>
    </section>
  )
}