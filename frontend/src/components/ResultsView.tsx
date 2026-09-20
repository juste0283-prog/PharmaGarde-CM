import {
  EMPTY_FILTERS,
  type City,
  type Pharmacy,
  type PharmacyFilters,
  type Position,
  type QuartierPoint,
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
  quartierPoints: QuartierPoint[]
  loading: boolean
  error: string | null
  position: Position | null
  view: ViewMode
  filters: PharmacyFilters
  routeTarget: Pharmacy | null
  onViewChange: (view: ViewMode) => void
  onCityChange: (cityName: string) => void
  onFiltersChange: (filters: PharmacyFilters) => void
  onDirections: (pharmacy: Pharmacy) => void
  onReport?: (pharmacy: Pharmacy) => void
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
  quartierPoints,
  loading,
  error,
  position,
  view,
  filters,
  routeTarget,
  onViewChange,
  onCityChange,
  onFiltersChange,
  onDirections,
  onReport,
}: ResultsViewProps) {
  const sections = city ? [city] : cities
  const hasActiveFilters =
    filters.quartier !== '' || filters.statuses.length > 0 || filters.confirmedOnly

  return (
    <section id="pharmacies" className="scroll-mt-20 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Pharmacies de garde en ce moment
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              {city ? (
                <>
                  {city.name} · {city.region}: gardes valides pour la date et l'heure courantes.
                </>
              ) : (
                'Tout le Cameroun. Chefs-lieux de région, gardes valides pour la date et l\'heure courantes.'
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-900">
              {formatNow()}
            </p>
            <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {VIEW_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={view === tab.id}
                  onClick={() => onViewChange(tab.id)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
                    view === tab.id
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/*
        je ne veux plus voir ce paragraghe visible sur maplateforme !
        <p className="mt-4 text-xs text-slate-400">
          Données issues de la base locale <code>public/db/pharmagarde.db</code> (SQLite) — tri par
          proximité puis fiabilité.
        </p>

        -*/}

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
          <div className="mt-8 flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-10 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <span className="size-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            Chargement des pharmacies…
          </div>
        )}

        {!loading && error !== null && (
          <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
            <p className="font-semibold">Impossible de charger les pharmacies.</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {!loading && error === null && pharmacies.length === 0 && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <p className="font-medium">
              Aucune pharmacie ne correspond aux critères pour {city?.name ?? 'l\'ensemble des villes'}.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => onFiltersChange(EMPTY_FILTERS)}
                className="mt-3 text-sm font-semibold text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}

        {!loading && error === null && (
          <div className="mt-6">
            {view === 'liste' ? (
              <>
                <p className="mb-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                  {pharmacies.length} pharmacie{pharmacies.length > 1 ? 's' : ''} à garde active
                  {position !== null
                    ? ' ( triées par distance )'
                    : ' ( classées par fiabilité )'}
                </p>
                <div className="space-y-10">
                  {sections.map((c) => {
                    const group = pharmacies.filter((p) => p.city === c.name)
                    const chips = quartierPoints.filter((q) => q.city === c.name)
                    return (
                      <article
                        key={c.name}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60 sm:p-6"
                      >
                        <header className="flex flex-wrap items-center gap-3">
                          <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
                            <span className="size-2.5 rounded-full bg-emerald-600" aria-hidden="true" />
                            {c.name}
                          </h3>
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-900">
                            {c.region}
                          </span>
                          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            {group.length} pharmacie{group.length > 1 ? 's' : ''}
                          </span>
                        </header>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {chips.length > 0 ? (
                            chips.map((q) => (
                              <span
                                key={`${q.city}-${q.quartier}`}
                                className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900"
                                title={`Quartier de ${q.city}`}
                              >
                                {q.quartier}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm italic text-slate-400 dark:text-slate-500">
                              Aucun quartier référencé.
                            </span>
                          )}
                        </div>
                        {group.length > 0 ? (
                          <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {group.map((pharmacy) => (
                              <PharmacyCard
                                key={pharmacy.id}
                                pharmacy={pharmacy}
                                onDirections={onDirections}
                                onReport={onReport}
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                            Aucune pharmacie de ce quartier ne correspond aux critères sélectionnés.
                          </p>
                        )}
                      </article>
                    )
                  })}
                </div>
              </>
            ) : (
              <PharmacyMap
                pharmacies={pharmacies}
                allCities={cities}
                quartierPoints={quartierPoints}
                position={position}
                routeTarget={routeTarget}
                city={city}
                onDirections={onDirections}
                onSelectCity={onCityChange}
              />
            )}
          </div>
        )}
      </div>
    </section>
  )
}