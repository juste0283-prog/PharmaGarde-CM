import type { Pharmacy } from '../data/pharmacies'
import PharmacyCard from './PharmacyCard'

interface PharmaciesGardeProps {
  city: string
  pharmacies: Pharmacy[]
  loading: boolean
  error: string | null
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

export default function PharmaciesGarde({ city, pharmacies, loading, error }: PharmaciesGardeProps) {
  return (
    <section id="pharmacies" className="scroll-mt-20 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Pharmacies de garde en ce moment
            </h2>
            <p className="mt-2 text-slate-600">
              Gardes valides pour la date et l'heure courantes.
            </p>
          </div>
          <p className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
            {formatNow()}
          </p>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Données issues de la base locale <code>public/db/pharmagarde.db</code> (SQLite).
        </p>

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
            Aucune pharmacie de garde trouvée pour {city}.
          </div>
        )}

        {!loading && error === null && pharmacies.length > 0 && (
          <>
            <p className="mt-4 text-sm font-medium text-slate-500">
              {pharmacies.length} pharmacie{pharmacies.length > 1 ? 's' : ''} à garde active — {city}
            </p>
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pharmacies.map((pharmacy) => (
                <PharmacyCard key={pharmacy.id} pharmacy={pharmacy} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}