import { STATUS_META, type Pharmacy } from '../data/pharmacies'

export function StatusBadge({ pharmacy }: { pharmacy: Pharmacy }) {
  const meta = STATUS_META[pharmacy.status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${meta.badge}`}
    >
      <span className={`size-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      {meta.label}
    </span>
  )
}

export default function PharmacyCard({
  pharmacy,
  onDirections,
  onReport,
}: {
  pharmacy: Pharmacy
  onDirections: (pharmacy: Pharmacy) => void
  onReport?: (pharmacy: Pharmacy) => void
}) {
  const distance = pharmacy.distanceKm ?? pharmacy.cityDistanceKm
  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-bold text-slate-900">{pharmacy.name}</h3>
        <StatusBadge pharmacy={pharmacy} />
      </div>

      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
        <MapPinIcon />
        {pharmacy.city} · {pharmacy.region}
      </p>
      <p className="mt-0.5 pl-5 text-sm text-slate-600">Quartier : {pharmacy.quartier}</p>
      <p className="mt-0.5 pl-5 text-sm text-slate-600">{pharmacy.address}</p>

      <dl className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
        <div className="flex items-center gap-2">
          <ClockIcon />
          <dt className="font-semibold text-slate-700">Garde en cours :</dt>
          <dd className="text-slate-600">{pharmacy.currentGarde}</dd>
        </div>
        <div className="flex items-center gap-2">
          <ShieldIcon />
          <dt className="font-semibold text-slate-700">Fiabilité :</dt>
          <dd className="text-slate-600" title={STATUS_META[pharmacy.status].description}>
            {pharmacy.lastUpdated}
          </dd>
        </div>
        {distance !== null && (
          <div className="flex items-center gap-2">
            <RulerIcon />
            <dt className="font-semibold text-slate-700">
              {pharmacy.distanceKm !== null ? 'Distance de vous :' : 'Distance (centre-ville) :'}
            </dt>
            <dd className="text-slate-600">
              à {distance.toLocaleString('fr-FR')} km
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-4 flex flex-1 flex-col pt-2">
        <div className="flex gap-3">
          <a
            href={`tel:${pharmacy.phone.replace(/\s/g, '')}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <PhoneIcon /> Appeler
          </a>
          <button
            type="button"
            onClick={() => onDirections(pharmacy)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-500 hover:text-emerald-700"
          >
            <RouteIcon /> Itinéraire
          </button>
        </div>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${pharmacy.latitude},${pharmacy.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 text-center text-xs font-medium text-slate-400 transition-colors hover:text-emerald-700"
        >
          Ouvrir dans Google Maps ↗
        </a>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-slate-400">
        Source : {pharmacy.source}
      </p>
      <button
        type="button"
        onClick={() => onReport?.(pharmacy)}
        className="mt-2 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-rose-600"
      >
        <FlagIcon /> Signaler une anomalie
      </button>
    </article>
  )
}

function MapPinIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0 text-emerald-600"
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0 text-emerald-600"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0 text-emerald-600"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function RulerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0 text-emerald-600"
      aria-hidden="true"
    >
      <path d="M21.3 8.7 8.7 21.4a2 2 0 0 1-2.8 0L2.6 18a2 2 0 0 1 0-2.8L15.2 2.6a2 2 0 0 1 2.8 0l3.3 3.3a2 2 0 0 1 0 2.8Z" />
      <path d="m7.5 10.5 2 2" />
      <path d="m10.5 7.5 2 2" />
      <path d="m13.5 4.5 2 2" />
    </svg>
  )
}

function PhoneIcon() {
  return (
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
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z" />
    </svg>
  )
}

function RouteIcon() {
  return (
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
      <circle cx="6" cy="19" r="3" />
      <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
      <circle cx="18" cy="5" r="3" />
    </svg>
  )
}

function FlagIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
      aria-hidden="true"
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1Z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </svg>
  )
}