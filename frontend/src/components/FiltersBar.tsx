import {
  EMPTY_FILTERS,
  STATUS_META,
  type City,
  type PharmacyFilters,
  type ReliabilityStatus,
} from '../data/pharmacies'

const STATUS_ORDER: ReliabilityStatus[] = [
  'confirmee',
  'verifiee',
  'ancienne',
  'a-verifier',
]

interface FiltersBarProps {
  cities: City[]
  city: string
  quartiers: string[]
  filters: PharmacyFilters
  resultCount: number
  onCityChange: (city: string) => void
  onChange: (filters: PharmacyFilters) => void
}

function toggleStatus(
  filters: PharmacyFilters,
  status: ReliabilityStatus,
): PharmacyFilters {
  const has = filters.statuses.includes(status)
  return {
    ...filters,
    statuses: has
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status],
  }
}

export default function FiltersBar({
  cities,
  city,
  quartiers,
  filters,
  resultCount,
  onCityChange,
  onChange,
}: FiltersBarProps) {
  const hasActiveFilters =
    filters.quartier !== '' ||
    filters.statuses.length > 0 ||
    filters.confirmedOnly

  const selectClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-emerald-500/20'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-44 flex-1">
          <label htmlFor="filtre-ville" className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
            Ville
          </label>
          <select
            id="filtre-ville"
            className={selectClass}
            value={city}
            onChange={(event) => onCityChange(event.target.value)}
          >
            <option value="">Toutes les villes — Cameroun</option>
            {cities.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}, {c.region}
              </option>
            ))}
          </select>
        </div>

        {city !== '' && (
          <div className="min-w-44 flex-1">
            <label htmlFor="filtre-quartier" className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Quartier
            </label>
            <select
              id="filtre-quartier"
              className={selectClass}
              value={filters.quartier}
              onChange={(event) =>
                onChange({ ...filters, quartier: event.target.value })
              }
            >
              <option value="">Tous les quartiers</option>
              {quartiers.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Statut de fiabilité</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_ORDER.map((status) => {
            const meta = STATUS_META[status]
            const active = filters.statuses.includes(status)
            return (
              <button
                key={status}
                type="button"
                aria-pressed={active}
                onClick={() => onChange(toggleStatus(filters, status))}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-all ${
                  active ? `${meta.badge} ring-2 ring-offset-1 dark:ring-offset-slate-900` : 'bg-white text-slate-500 ring-slate-300 hover:ring-slate-400 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600'
                }`}
              >
                <span className={`size-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
                {meta.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={filters.confirmedOnly}
            onChange={(event) =>
              onChange({ ...filters, confirmedOnly: event.target.checked })
            }
            className="size-4 rounded accent-emerald-600"
          />
          Confirmations récentes uniquement
        </label>

        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {resultCount} résultat{resultCount > 1 ? 's' : ''}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => onChange(EMPTY_FILTERS)}
              className="text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>
    </div>
  )
}