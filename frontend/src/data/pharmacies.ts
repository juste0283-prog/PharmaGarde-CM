export type ReliabilityStatus =
  | 'verifiee'
  | 'confirmee'
  | 'ancienne'
  | 'a-verifier'

export interface Position {
  lat: number
  lng: number
}

export interface City {
  name: string
  region: string
  lat: number
  lng: number
}

export interface QuartierPoint {
  city: string
  quartier: string
  lat: number
  lng: number
}

export interface Pharmacy {
  id: number
  name: string
  city: string
  region: string
  quartier: string
  address: string
  phone: string
  latitude: number
  longitude: number
  source: string
  distanceKm: number | null
  cityDistanceKm: number | null
  status: ReliabilityStatus
  lastUpdated: string
  currentGarde: string
}

export interface PharmacyFilters {
  quartier: string
  statuses: ReliabilityStatus[]
  confirmedOnly: boolean
}

export const EMPTY_FILTERS: PharmacyFilters = {
  quartier: '',
  statuses: [],
  confirmedOnly: false,
}

export interface GardeSchedule {
  id: number
  pharmacyId: number
  weekday: number
  start: string
  end: string
  status: string
  source: string
}

export interface ConfirmationRecord {
  id: number
  pharmacyId: number
  dutyScheduleId: number | null
  actor: string
  timestamp: string
  result: string
}

export interface ReportRecord {
  id: number
  pharmacyId: number
  author: string
  type: string
  description: string
  status: string
  createdAt: string
  response: string | null
}

export interface PharmacyProfile {
  pharmacy: Pharmacy
  verified: boolean
  createdAt: string
  gardeTodayId: number | null
  gardeTodayLabel: string | null
  lastConfirmationAt: string | null
  confirmedRecently: boolean
  openReportsCount: number
}

export const WEEKDAYS = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
]

export const REPORT_STATUS_LABELS: Record<string, string> = {
  nouveau: 'Nouveau',
  en_verification: 'En vérification',
  confirme: 'Confirmé',
  rejete: 'Rejeté',
  resolu: 'Résolu',
}

export const REPORT_TYPE_LABELS: Record<string, string> = {
  fermeture: 'Fermeture inattendue',
  mauvaise_heure: 'Horaire erroné',
  indisponible: 'Produit indisponible',
  autre: 'Autre',
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
      'Plusieurs signalements convergents remettent en cause cette garde : vérification en cours.',
  },
}

export type BackOfficeRole = 'pharmacie' | 'admin' | 'super_admin'

export const ROLE_LABELS: Record<BackOfficeRole, string> = {
  pharmacie: 'Pharmacie',
  admin: 'Administrateur',
  super_admin: 'Super administrateur',
}

export const ROLE_PERIMETERS: Record<BackOfficeRole, string> = {
  pharmacie: 'Son propre profil et planning',
  admin: 'Ville(s) ou zone(s) assignée(s)',
  super_admin: 'Plateforme entière',
}

export type AccountStatus = 'actif' | 'en_attente' | 'suspendu'

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  actif: 'Actif',
  en_attente: 'En attente de validation',
  suspendu: 'Suspendu',
}

export interface UserAccount {
  id: number
  name: string
  username: string
  email: string
  role: BackOfficeRole
  city: string | null
  pharmacyId: number | null
  pharmacyName: string | null
  status: AccountStatus
  createdAt: string
}

export interface BackOfficeSession {
  role: BackOfficeRole
  label: string
  userId: number
  city: string | null
  pharmacyId: number | null
}

export interface AdminPharmacy {
  id: number
  name: string
  city: string
  region: string
  quartier: string
  address: string
  phone: string
  latitude: number
  longitude: number
  source: string
  verified: boolean
  lastUpdated: string
  accountStatus: AccountStatus
  accountId: number | null
}

export interface NewPharmacyInput {
  name: string
  city: string
  quartier: string
  address: string
  phone: string
  latitude: number
  longitude: number
  verified: boolean
  source?: string
  email?: string
  password?: string
}

export interface AdminReport {
  id: number
  pharmacyId: number
  pharmacyName: string
  city: string
  author: string
  type: string
  description: string
  status: string
  createdAt: string
  response: string | null
}

export interface AdminSchedule {
  id: number
  pharmacyId: number
  pharmacyName: string
  city: string
  weekday: number
  start: string
  end: string
  status: string
  source: string
}

export interface AuditEntry {
  id: number
  actor: string
  action: string
  resource: string
  timestamp: string
  metadata: string | null
}

export interface AdminStats {
  cities: number
  pharmacies: number
  validated: number
  pendingPharmacies: number
  openReports: number
  confirmations24h: number
  activeSchedules: number
}

export const ACTION_LABELS: Record<string, string> = {
  validation: 'Validation de pharmacie',
  suspension: 'Suspension de pharmacie',
  compte_validation: 'Validation de compte',
  compte_suspension: 'Suspension de compte',
  moderation: 'Modération de signalement',
  programmation: 'Programmation de garde',
  profil_maj: 'Mise à jour de profil',
  planification_maj: 'Mise à jour du planning',
  role_changement: 'Changement de rôle',
  compte_creation: 'Création de compte',
  validation_batch: 'Validation initiale',
  signalement_creation: 'Signalement utilisateur',
  login: 'Connexion',
  logout: 'Déconnexion',
}