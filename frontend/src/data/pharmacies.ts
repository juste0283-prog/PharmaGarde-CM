export type ReliabilityStatus =
  | 'verifiee'
  | 'confirmee'
  | 'ancienne'
  | 'a-verifier'

export interface Position {
  lat: number
  lng: number
}

export interface Pharmacy {
  id: number
  name: string
  city: string
  quartier: string
  address: string
  phone: string
  distanceKm: number | null
  status: ReliabilityStatus
  lastUpdated: string
  currentGarde: string
}

export const STATUS_META: Record<
  ReliabilityStatus,
  { label: string; badge: string; dot: string; description: string }
> = {
  verifiee: {
    label: 'Vérifiée',
    badge: 'bg-sky-100 text-sky-800 ring-sky-200',
    dot: 'bg-sky-500',
    description:
      'Donnée contrôlée par l\u2019administration ou une source reconnue : fiabilité élevée.',
  },
  confirmee: {
    label: 'Confirmée récemment',
    badge: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    dot: 'bg-emerald-500',
    description:
      'La pharmacie a confirmé sa garde en cours avec un horodatage récent.',
  },
  ancienne: {
    label: 'Ancienne',
    badge: 'bg-amber-100 text-amber-800 ring-amber-200',
    dot: 'bg-amber-500',
    description:
      'Aucune mise à jour récente : la garde reste affichée mais la fiabilité est dégradée.',
  },
  'a-verifier': {
    label: 'À vérifier',
    badge: 'bg-rose-100 text-rose-800 ring-rose-200',
    dot: 'bg-rose-500',
    description:
      'Des signalements remettent en cause cette garde : vérification en cours.',
  },
}