import type { Database } from 'sql.js'
import type { Pharmacy, Position, ReliabilityStatus } from '../data/pharmacies'
import { execAll, type Row } from './database'

const MINUTE = 60_000
const HOUR = 3_600_000

const CONFIRMED_WINDOW = 12 * HOUR
const VERIFIED_WINDOW = 72 * HOUR

export function getCities(db: Database): string[] {
  return execAll(db, 'SELECT name FROM cities ORDER BY is_pilot DESC, name').map(
    (row) => String(row.name),
  )
}

export function getPharmaciesForCity(
  db: Database,
  cityName: string,
  position: Position | null,
): Pharmacy[] {
  const weekday = new Date().getDay()
  const safeCity = cityName.replace(/'/g, "''")

  const pharmacyRows = execAll(
    db,
    `
    SELECT p.id, p.name, p.quartier, p.address, p.phone,
           p.latitude, p.longitude, p.source, p.verified, p.last_updated,
           c.name AS city,
           ds.start AS garde_start, ds.end AS garde_end
    FROM pharmacies p
    JOIN cities c ON c.id = p.city_id
    LEFT JOIN duty_schedules ds
      ON ds.pharmacy_id = p.id AND ds.weekday = ${weekday}
    WHERE c.name = '${safeCity}'
    ORDER BY p.name
  `,
  )

  const lastConfirmations = new Map<number, string>()
  for (const row of execAll(
    db,
    'SELECT pharmacy_id, MAX(timestamp) AS ts FROM confirmations GROUP BY pharmacy_id',
  )) {
    lastConfirmations.set(Number(row.pharmacy_id), String(row.ts))
  }

  const openReports = new Map<number, string>()
  for (const row of execAll(
    db,
    `SELECT pharmacy_id, MIN(created_at) AS since
     FROM reports
     WHERE status IN ('nouveau', 'en_verification')
     GROUP BY pharmacy_id`,
  )) {
    openReports.set(Number(row.pharmacy_id), String(row.since))
  }

  const pharmacies = pharmacyRows.map((row: Row): Pharmacy => {
    const id = Number(row.id)
    const confirmation = lastConfirmations.get(id)
    const report = openReports.get(id)
    const verified = Number(row.verified) === 1
    const lastUpdated = String(row.last_updated)

    let status: ReliabilityStatus
    let lastUpdatedPhrase: string

    if (report !== undefined) {
      status = 'a-verifier'
      lastUpdatedPhrase = reportedPhrase(report)
    } else if (confirmation && isFresh(confirmation, CONFIRMED_WINDOW)) {
      status = 'confirmee'
      lastUpdatedPhrase = confirmedPhrase(confirmation)
    } else if (verified && isFresh(lastUpdated, VERIFIED_WINDOW)) {
      status = 'verifiee'
      lastUpdatedPhrase = verifiedPhrase(lastUpdated)
    } else {
      status = 'ancienne'
      lastUpdatedPhrase = stalePhrase(lastUpdated)
    }

    return {
      id,
      name: String(row.name),
      city: String(row.city),
      quartier: String(row.quartier),
      address: String(row.address),
      phone: String(row.phone),
      distanceKm:
        position === null
          ? null
          : Math.round(haversineKm(position, {
              lat: Number(row.latitude),
              lng: Number(row.longitude),
            }) * 10) / 10,
      status,
      lastUpdated: lastUpdatedPhrase,
      currentGarde:
        row.garde_start && row.garde_end
          ? `Garde de nuit — ${formatHour(String(row.garde_start))} à ${formatHour(String(row.garde_end))}`
          : 'Garde en cours — planning à confirmer',
    }
  })

  return pharmacies.sort((a, b) => {
    if (position !== null) return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)
    return STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.name.localeCompare(b.name)
  })
}

const STATUS_RANK: Record<ReliabilityStatus, number> = {
  confirmee: 0,
  verifiee: 1,
  ancienne: 2,
  'a-verifier': 3,
}

function isFresh(iso: string, windowMs: number): boolean {
  const elapsed = Date.now() - new Date(iso).getTime()
  return elapsed >= 0 && elapsed < windowMs
}

function minutesSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / MINUTE))
}

function shortDate(iso: string): string {
  const date = new Date(iso)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

function shortTime(iso: string): string {
  const date = new Date(iso)
  return `${String(date.getHours()).padStart(2, '0')}h${String(date.getMinutes()).padStart(2, '0')}`
}

function confirmedPhrase(iso: string): string {
  const minutes = minutesSince(iso)
  if (minutes < 1) return "Confirmée à l'instant"
  if (minutes < 60) return `Confirmée il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Confirmée il y a ${hours} h`
  return `Confirmée le ${shortDate(iso)}`
}

function verifiedPhrase(iso: string): string {
  const now = new Date()
  const date = new Date(iso)
  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)
  if (dayDiff <= 0) return `Vérifiée aujourd'hui à ${shortTime(iso)}`
  if (dayDiff === 1) return `Vérifiée hier à ${shortTime(iso)}`
  if (dayDiff < 7) return `Vérifiée il y a ${dayDiff} j`
  return `Vérifiée le ${shortDate(iso)}/${date.getFullYear()}`
}

function reportedPhrase(iso: string): string {
  const minutes = minutesSince(iso)
  if (minutes < 60) return `Signalée à vérifier depuis ${minutes} min`
  return `Signalée à vérifier depuis ${Math.floor(minutes / 60)} h`
}

function stalePhrase(iso: string): string {
  const days = Math.floor(minutesSince(iso) / 1440)
  return `Dernière mise à jour : ${days} j`
}

function formatHour(hhmm: string): string {
  return String(parseInt(hhmm, 10))
}

function haversineKm(a: Position, b: Position): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180
  const radiusKm = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * radiusKm * Math.asin(Math.sqrt(h))
}