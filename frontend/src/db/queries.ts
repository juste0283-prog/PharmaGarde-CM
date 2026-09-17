import type { Database, SqlValue } from 'sql.js'
import type {
  AccountStatus,
  AdminPharmacy,
  AdminReport,
  AdminSchedule,
  AdminStats,
  AuditEntry,
  BackOfficeRole,
  City,
  ConfirmationRecord,
  GardeSchedule,
  NewPharmacyInput,
  Pharmacy,
  PharmacyFilters,
  PharmacyProfile,
  Position,
  QuartierPoint,
  ReliabilityStatus,
  ReportRecord,
  UserAccount,
} from '../data/pharmacies'
import { execAll, execFirst, saveDb, type Row } from './database'

const MINUTE = 60_000
const HOUR = 3_600_000

const CONFIRMED_WINDOW = 12 * HOUR
const VERIFIED_WINDOW = 72 * HOUR
const PUBLIC_REPORT_THRESHOLD = 2

export function getCities(db: Database): City[] {
  return execAll(
    db,
    `SELECT name, region, latitude, longitude
     FROM cities
     ORDER BY is_pilot DESC, name`,
  ).map((row) => ({
    name: String(row.name),
    region: String(row.region),
    lat: Number(row.latitude),
    lng: Number(row.longitude),
  }))
}

export function getQuartiers(db: Database, cityName: string): string[] {
  const safeCity = cityName.replace(/'/g, "''")
  return execAll(
    db,
    `SELECT DISTINCT p.quartier
     FROM pharmacies p
     JOIN cities c ON c.id = p.city_id
     WHERE c.name = '${safeCity}'
     ORDER BY p.quartier`,
  ).map((row) => String(row.quartier))
}

export function getQuartierPoints(db: Database, cityName: string): QuartierPoint[] {
  const safeCity = cityName.replace(/'/g, "''")
  const where = cityName ? `WHERE c.name = '${safeCity}'` : ''
  return execAll(
    db,
    `SELECT c.name AS city, p.quartier,
            AVG(p.latitude) AS lat, AVG(p.longitude) AS lng
     FROM pharmacies p
     JOIN cities c ON c.id = p.city_id
     ${where}
     GROUP BY c.name, p.quartier
     ORDER BY c.name, p.quartier`,
  ).map((row) => ({
    city: String(row.city),
    quartier: String(row.quartier),
    lat: Number(row.lat),
    lng: Number(row.lng),
  }))
}

export function getPharmacies(
  db: Database,
  cityName: string,
  position: Position | null,
): Pharmacy[] {
  const weekday = new Date().getDay()
  const safeCity = cityName.replace(/'/g, "''")
  const where = cityName ? `WHERE c.name = '${safeCity}'` : ''

  const pharmacyRows = execAll(
    db,
    `
    SELECT p.id, p.name, p.quartier, p.address, p.phone,
           p.latitude, p.longitude, p.source, p.verified, p.last_updated,
           c.name AS city, c.region, c.latitude AS city_lat, c.longitude AS city_lng,
           ds.start AS garde_start, ds.end AS garde_end
    FROM pharmacies p
    JOIN cities c ON c.id = p.city_id
    LEFT JOIN duty_schedules ds
      ON ds.pharmacy_id = p.id AND ds.weekday = ${weekday} AND ds.status = 'publie'
    ${where}
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
    `SELECT pharmacy_id, MIN(created_at) AS since, COUNT(*) AS n
     FROM reports
     WHERE status IN ('nouveau', 'en_verification')
     GROUP BY pharmacy_id`,
  )) {
    if (Number(row.n) >= PUBLIC_REPORT_THRESHOLD) {
      openReports.set(Number(row.pharmacy_id), String(row.since))
    }
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
      region: String(row.region),
      quartier: String(row.quartier),
      address: String(row.address),
      phone: String(row.phone),
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      source: String(row.source),
      distanceKm:
        position === null
          ? null
          : Math.round(
              haversineKm(position, {
                lat: Number(row.latitude),
                lng: Number(row.longitude),
              }) * 10,
            ) / 10,
      cityDistanceKm:
        Math.round(
          haversineKm(
            { lat: Number(row.city_lat), lng: Number(row.city_lng) },
            { lat: Number(row.latitude), lng: Number(row.longitude) },
          ) * 10,
        ) / 10,
      status,
      lastUpdated: lastUpdatedPhrase,
      currentGarde:
        row.garde_start && row.garde_end
          ? `Garde de nuit : de ${formatHour(String(row.garde_start))}h à ${formatHour(String(row.garde_end))}h`
          : 'Garde en cours — planning à confirmer',
    }
  })

  return pharmacies.sort((a, b) => {
    if (position !== null) {
      return (
        (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) ||
        STATUS_RANK[a.status] - STATUS_RANK[b.status]
      )
    }
    return STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.name.localeCompare(b.name)
  })
}

export function filterPharmacies(
  pharmacies: Pharmacy[],
  filters: PharmacyFilters,
): Pharmacy[] {
  return pharmacies.filter((pharmacy) => {
    if (filters.quartier && pharmacy.quartier !== filters.quartier) return false
    if (filters.statuses.length > 0 && !filters.statuses.includes(pharmacy.status)) return false
    if (filters.confirmedOnly && pharmacy.status !== 'confirmee') return false
    return true
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

export function getPharmacyProfile(db: Database, id: number): PharmacyProfile | null {
  const row = execFirst(
    db,
    `SELECT p.*, c.name AS city, c.region
     FROM pharmacies p
     JOIN cities c ON c.id = p.city_id
     WHERE p.id = ${Number(id)}`,
  )
  if (!row) return null

  const today = new Date().getDay()
  const duty = execFirst(
    db,
    `SELECT id, start, end
     FROM duty_schedules
     WHERE pharmacy_id = ${Number(id)} AND weekday = ${today} AND status = 'publie'`,
  )
  const lastConf = execFirst(
    db,
    `SELECT timestamp
     FROM confirmations
     WHERE pharmacy_id = ${Number(id)}
     ORDER BY timestamp DESC LIMIT 1`,
  )
  const openReports = execFirst(
    db,
    `SELECT COUNT(*) AS n
     FROM reports
     WHERE pharmacy_id = ${Number(id)} AND status IN ('nouveau', 'en_verification')`,
  )

  const reportSince = openReports ? String(openReports.n) : '0'
  const reportOpen = Number(reportSince) >= PUBLIC_REPORT_THRESHOLD
  const confirmation = lastConf ? String(lastConf.timestamp) : null
  const lastUpdated = String(row.last_updated)
  const verified = Number(row.verified) === 1

  let status: ReliabilityStatus
  let lastUpdatedPhrase: string

  if (reportOpen) {
    status = 'a-verifier'
    lastUpdatedPhrase = reportedPhrase(confirmation ?? lastUpdated)
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

  const gardeTodayLabel =
    duty && duty.start && duty.end
      ? `Garde de nuit : de ${formatHour(String(duty.start))}h à ${formatHour(String(duty.end))}h`
      : null

  return {
    pharmacy: {
      id: Number(row.id),
      name: String(row.name),
      city: String(row.city),
      region: String(row.region),
      quartier: String(row.quartier),
      address: String(row.address),
      phone: String(row.phone),
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      source: String(row.source),
      distanceKm: null,
      cityDistanceKm: null,
      status,
      lastUpdated: lastUpdatedPhrase,
      currentGarde: gardeTodayLabel ?? 'Aucune garde programmée aujourd’hui',
    },
    verified: verified,
    createdAt: String(row.created_at),
    gardeTodayId: duty ? Number(duty.id) : null,
    gardeTodayLabel,
    lastConfirmationAt: confirmation,
    confirmedRecently: status === 'confirmee',
    openReportsCount: reportOpen ? Number(reportSince) : 0,
  }
}

export function getDutySchedules(db: Database, pharmacyId: number): GardeSchedule[] {
  return execAll(
    db,
    `SELECT id, pharmacy_id, weekday, start, end, status, source
     FROM duty_schedules
     WHERE pharmacy_id = ?
     ORDER BY weekday`,
    [pharmacyId],
  ).map((row) => ({
    id: Number(row.id),
    pharmacyId: Number(row.pharmacy_id),
    weekday: Number(row.weekday),
    start: String(row.start),
    end: String(row.end),
    status: String(row.status),
    source: String(row.source),
  }))
}

export function getConfirmations(
  db: Database,
  pharmacyId: number,
  limit = 10,
): ConfirmationRecord[] {
  return execAll(
    db,
    `SELECT id, pharmacy_id, duty_schedule_id, actor, timestamp, result
     FROM confirmations
     WHERE pharmacy_id = ?
     ORDER BY timestamp DESC
     LIMIT ?`,
    [pharmacyId, limit],
  ).map((row) => ({
    id: Number(row.id),
    pharmacyId: Number(row.pharmacy_id),
    dutyScheduleId: row.duty_schedule_id === null ? null : Number(row.duty_schedule_id),
    actor: String(row.actor),
    timestamp: String(row.timestamp),
    result: String(row.result),
  }))
}

export function getReports(db: Database, pharmacyId: number): ReportRecord[] {
  return execAll(
    db,
    `SELECT id, pharmacy_id, author, type, description, status, created_at, response
     FROM reports
     WHERE pharmacy_id = ?
     ORDER BY created_at DESC`,
    [pharmacyId],
  ).map((row) => ({
    id: Number(row.id),
    pharmacyId: Number(row.pharmacy_id),
    author: String(row.author),
    type: String(row.type),
    description: String(row.description),
    status: String(row.status),
    createdAt: String(row.created_at),
    response: row.response === null ? null : String(row.response),
  }))
}

export function confirmCurrentGarde(
  db: Database,
  pharmacyId: number,
  actorName: string,
): { ok: boolean; reason?: string; confirmation?: ConfirmationRecord } {
  const today = new Date().getDay()
  const duty = execFirst(
    db,
    `SELECT id FROM duty_schedules
     WHERE pharmacy_id = ? AND weekday = ? AND status = 'publie'`,
    [pharmacyId, today],
  )
  if (!duty) return { ok: false, reason: 'no-duty' }

  const recent = execFirst(
    db,
    `SELECT id FROM confirmations
     WHERE pharmacy_id = ? AND duty_schedule_id = ? AND timestamp >= ?`,
    [pharmacyId, Number(duty.id), new Date(Date.now() - 30 * 60_000).toISOString()],
  )
  if (recent) return { ok: false, reason: 'already' }

  const timestamp = new Date().toISOString()
  db.run(
    `INSERT INTO confirmations (pharmacy_id, duty_schedule_id, actor, timestamp, result)
     VALUES (?, ?, ?, ?, 'ok')`,
    [pharmacyId, Number(duty.id), actorName, timestamp],
  )
  saveDb(db)
  const inserted = execFirst(
    db,
    `SELECT id, pharmacy_id, duty_schedule_id, actor, timestamp, result
     FROM confirmations
     WHERE pharmacy_id = ? AND timestamp = ?`,
    [pharmacyId, timestamp],
  )
  return {
    ok: true,
    confirmation: inserted
      ? {
          id: Number(inserted.id),
          pharmacyId: Number(inserted.pharmacy_id),
          dutyScheduleId:
            inserted.duty_schedule_id === null ? null : Number(inserted.duty_schedule_id),
          actor: String(inserted.actor),
          timestamp: String(inserted.timestamp),
          result: String(inserted.result),
        }
      : undefined,
  }
}

export function respondToReport(
  db: Database,
  reportId: number,
  decision: 'resolu' | 'rejete',
  responseText: string,
): ReportRecord | null {
  try {
    db.run('ALTER TABLE reports ADD COLUMN response TEXT')
  } catch {
    // colonne déjà présente
  }
  db.run(`UPDATE reports SET status = ?, response = ? WHERE id = ?`, [
    decision,
    responseText,
    reportId,
  ])
  saveDb(db)
  const row = execFirst(
    db,
    `SELECT id, pharmacy_id, author, type, description, status, created_at, response
     FROM reports WHERE id = ?`,
    [reportId],
  )
  if (!row) return null
  return {
    id: Number(row.id),
    pharmacyId: Number(row.pharmacy_id),
    author: String(row.author),
    type: String(row.type),
    description: String(row.description),
    status: String(row.status),
    createdAt: String(row.created_at),
    response: row.response === null ? null : String(row.response),
  }
}

function toUserAccount(row: Row): UserAccount {
  return {
    id: Number(row.id),
    name: String(row.name),
    email: String(row.email),
    role: String(row.role) as BackOfficeRole,
    city: row.city === null ? null : String(row.city),
    pharmacyId: row.pharmacy_id === null ? null : Number(row.pharmacy_id),
    pharmacyName: row.pharmacy_name === null ? null : String(row.pharmacy_name),
    status: String(row.status) as AccountStatus,
    createdAt: String(row.created_at),
  }
}

const USER_PROFILE_SELECT = `
  SELECT u.id, u.name, u.email, u.role, u.status, u.created_at,
         c.name AS city, u.pharmacy_id, p.name AS pharmacy_name
  FROM users u
  LEFT JOIN cities c ON c.id = u.city_id
  LEFT JOIN pharmacies p ON p.id = u.pharmacy_id
`

export function getUsers(db: Database): UserAccount[] {
  return execAll(
    db,
    `${USER_PROFILE_SELECT} ORDER BY u.role, c.name, u.name`,
  ).map(toUserAccount)
}

export function getUserByEmail(db: Database, email: string): UserAccount | null {
  const row = execFirst(db, `${USER_PROFILE_SELECT} WHERE LOWER(u.email) = ?`, [email.toLowerCase()])
  return row ? toUserAccount(row) : null
}

export function getUserByPharmacy(db: Database, pharmacyId: number): UserAccount | null {
  const row = execFirst(
    db,
    `${USER_PROFILE_SELECT} WHERE u.role = 'pharmacie' AND u.pharmacy_id = ?`,
    [pharmacyId],
  )
  return row ? toUserAccount(row) : null
}

export function getAdminForCity(db: Database, city: string): UserAccount | null {
  const row = execFirst(
    db,
    `${USER_PROFILE_SELECT} WHERE u.role = 'admin' AND c.name = ? AND u.status = 'actif'`,
    [city],
  )
  return row ? toUserAccount(row) : null
}

export function getSuperAdmin(db: Database): UserAccount | null {
  const row = execFirst(db, `${USER_PROFILE_SELECT} WHERE u.role = 'super_admin'`, [])
  return row ? toUserAccount(row) : null
}

export function logAudit(
  db: Database,
  actor: string,
  action: string,
  resource: string,
  metadata: string | null = null,
): void {
  db.run(
    `INSERT INTO audit_log (actor, action, resource, timestamp, metadata)
     VALUES (?, ?, ?, ?, ?)`,
    [actor, action, resource, new Date().toISOString(), metadata],
  )
  saveDb(db)
}

export function getAdminStats(db: Database, cityName: string | null): AdminStats {
  const city = cityName ?? ''
  const scope = city ? `c.name = '${city.replace(/'/g, "''")}'` : '1 = 1'
  const count = (sql: string, params: SqlValue[] = []): number => {
    const row = execFirst(db, sql, params)
    return row ? Number(row.n) : 0
  }
  return {
    cities: count(
      `SELECT COUNT(DISTINCT c.id) AS n FROM cities c WHERE ${scope}`,
    ),
    pharmacies: count(
      `SELECT COUNT(*) AS n FROM pharmacies p JOIN cities c ON c.id = p.city_id WHERE ${scope}`,
    ),
    validated: count(
      `SELECT COUNT(*) AS n FROM pharmacies p JOIN cities c ON c.id = p.city_id
       WHERE ${scope} AND p.verified = 1`,
    ),
    pendingPharmacies: count(
      `SELECT COUNT(*) AS n FROM pharmacies p JOIN cities c ON c.id = p.city_id
       WHERE ${scope} AND (p.verified = 0
         OR EXISTS (SELECT 1 FROM users u WHERE u.role = 'pharmacie' AND u.pharmacy_id = p.id AND u.status = 'en_attente'))`,
    ),
    openReports: count(
      `SELECT COUNT(*) AS n FROM reports r
       JOIN pharmacies p ON p.id = r.pharmacy_id
       JOIN cities c ON c.id = p.city_id
       WHERE ${scope} AND r.status IN ('nouveau', 'en_verification')`,
    ),
    confirmations24h: count(
      `SELECT COUNT(*) AS n FROM confirmations co
       JOIN pharmacies p ON p.id = co.pharmacy_id
       JOIN cities c ON c.id = p.city_id
       WHERE ${scope} AND co.timestamp >= ?`,
      [new Date(Date.now() - 24 * HOUR).toISOString()],
    ),
    activeSchedules: count(
      `SELECT COUNT(*) AS n FROM duty_schedules ds
       JOIN pharmacies p ON p.id = ds.pharmacy_id
       JOIN cities c ON c.id = p.city_id
       WHERE ${scope} AND ds.status = 'publie'`,
    ),
  }
}

export function getAdminPharmacies(
  db: Database,
  cityName: string | null,
): AdminPharmacy[] {
  const city = cityName ?? ''
  const scope = city ? `c.name = '${city.replace(/'/g, "''")}'` : '1 = 1'
  return execAll(
    db,
    `SELECT p.id, p.name, p.quartier, p.address, p.phone, p.source,
            p.latitude, p.longitude, p.verified, p.last_updated,
            c.name AS city, c.region,
            COALESCE(u.status, 'actif') AS account_status, u.id AS account_id
     FROM pharmacies p
     JOIN cities c ON c.id = p.city_id
     LEFT JOIN users u ON u.role = 'pharmacie' AND u.pharmacy_id = p.id
     WHERE ${scope}
     ORDER BY p.name`,
  ).map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    city: String(row.city),
    region: String(row.region),
    quartier: String(row.quartier),
    address: String(row.address),
    phone: String(row.phone),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    source: String(row.source),
    verified: Number(row.verified) === 1,
    lastUpdated: String(row.last_updated),
    accountStatus: String(row.account_status) as AccountStatus,
    accountId: row.account_id === null ? null : Number(row.account_id),
  }))
}

export function createPharmacy(
  db: Database,
  input: NewPharmacyInput,
  actor: string,
): { ok: boolean; pharmacyId?: number; error?: string } {
  const name = input.name.trim()
  const quartier = input.quartier.trim()
  const phone = input.phone.trim()
  if (!name || !quartier || !phone) {
    return { ok: false, error: 'Nom, quartier et téléphone sont obligatoires.' }
  }
  const cityRow = execFirst(db, `SELECT id FROM cities WHERE name = ?`, [input.city.trim()])
  if (!cityRow) return { ok: false, error: `Ville inconnue : ${input.city}` }
  const lat = Number(input.latitude)
  const lng = Number(input.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, error: 'Coordonnées géographiques invalides (lat entre -90 et 90, lng entre -180 et 180).' }
  }

  const now = new Date().toISOString()
  const source = input.source?.trim() || `Inscrite par ${actor}`
  db.run(
    `INSERT INTO pharmacies
       (name, city_id, quartier, address, phone, latitude, longitude,
        source, verified, last_updated, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      Number(cityRow.id),
      quartier,
      input.address.trim(),
      phone,
      lat,
      lng,
      source,
      input.verified ? 1 : 0,
      now,
      now,
    ],
  )
  const idRow = execFirst(db, `SELECT last_insert_rowid() AS id`)
  const pharmacyId = Number(idRow?.id ?? 0)

  const insertSchedule = db.prepare(
    `INSERT INTO duty_schedules (pharmacy_id, weekday, start, end, status, source, created_at)
     VALUES (?, ?, '18:00', '08:00', 'draft', ?, ?)`,
  )
  for (let weekday = 0; weekday <= 6; weekday += 1) {
    insertSchedule.run([pharmacyId, weekday, `Planning initialisé par ${actor}`, now])
  }

  db.run(
    `INSERT INTO users (name, email, role, city_id, pharmacy_id, status, created_at)
     VALUES (?, ?, 'pharmacie', ?, ?, ?, ?)`,
    [
      `${name} (compte)`,
      `pharma.${pharmacyId}@pharmagarde.cm`,
      Number(cityRow.id),
      pharmacyId,
      input.verified ? 'actif' : 'en_attente',
      now,
    ],
  )
  saveDb(db)
  logAudit(
    db,
    actor,
    'compte_creation',
    `pharmacy:${pharmacyId}`,
    `créée par ${actor} — ${quartier}, ${input.city}`,
  )
  if (input.verified) {
    logAudit(db, actor, 'validation', `pharmacy:${pharmacyId}`, 'créée vérifiée')
  }
  return { ok: true, pharmacyId }
}

export function updatePharmacyFull(
  db: Database,
  pharmacyId: number,
  patch: {
    name?: string
    quartier?: string
    address?: string
    phone?: string
    latitude?: number
    longitude?: number
  },
  actor: string,
): void {
  const fields: string[] = []
  const values: Array<string | number> = []
  if (patch.name !== undefined) {
    const name = patch.name.trim()
    if (name) {
      fields.push('name = ?')
      values.push(name)
      db.run(`UPDATE users SET name = ? WHERE role = 'pharmacie' AND pharmacy_id = ?`, [
        `${name} (compte)`,
        pharmacyId,
      ])
    }
  }
  if (patch.quartier !== undefined) {
    fields.push('quartier = ?')
    values.push(patch.quartier.trim())
  }
  if (patch.address !== undefined) {
    fields.push('address = ?')
    values.push(patch.address.trim())
  }
  if (patch.phone !== undefined) {
    fields.push('phone = ?')
    values.push(patch.phone.trim())
  }
  if (patch.latitude !== undefined && Number.isFinite(patch.latitude)) {
    fields.push('latitude = ?')
    values.push(patch.latitude)
  }
  if (patch.longitude !== undefined && Number.isFinite(patch.longitude)) {
    fields.push('longitude = ?')
    values.push(patch.longitude)
  }
  if (fields.length === 0) return
  values.push(new Date().toISOString(), pharmacyId)
  db.run(`UPDATE pharmacies SET ${fields.join(', ')}, last_updated = ? WHERE id = ?`, values)
  saveDb(db)
  logAudit(db, actor, 'profil_maj', `pharmacy:${pharmacyId}`, fields.join(', '))
}

export function setPharmacyVerified(
  db: Database,
  pharmacyId: number,
  verified: boolean,
  actor: string,
): void {
  db.run(`UPDATE pharmacies SET verified = ?, last_updated = ? WHERE id = ?`, [
    verified ? 1 : 0,
    new Date().toISOString(),
    pharmacyId,
  ])
  logAudit(
    db,
    actor,
    verified ? 'validation' : 'suspension',
    `pharmacy:${pharmacyId}`,
  )
}

export function setAccountStatus(
  db: Database,
  userId: number,
  status: AccountStatus,
  actor: string,
): void {
  db.run(`UPDATE users SET status = ? WHERE id = ?`, [status, userId])
  logAudit(db, actor, 'compte_validation', `user:${userId}`, status)
}

export function updateUserRole(
  db: Database,
  userId: number,
  role: BackOfficeRole,
  actor: string,
): void {
  db.run(`UPDATE users SET role = ?, status = 'actif' WHERE id = ?`, [role, userId])
  logAudit(db, actor, 'role_changement', `user:${userId}`, role)
}

export function createUser(
  db: Database,
  data: { name: string; email: string; role: BackOfficeRole; city: string | null },
  actor: string,
): UserAccount | null {
  let cityId: number | null = null
  if (data.city) {
    const cityRow = execFirst(db, `SELECT id FROM cities WHERE name = ?`, [data.city])
    cityId = cityRow ? Number(cityRow.id) : null
  }
  db.run(
    `INSERT INTO users (name, email, role, city_id, status, created_at)
     VALUES (?, ?, ?, ?, 'actif', ?)`,
    [data.name, data.email, data.role, cityId, new Date().toISOString()],
  )
  logAudit(db, actor, 'compte_creation', `user:${data.email}`, data.role)
  return getUserByEmail(db, data.email)
}

export function getAdminReports(
  db: Database,
  cityName: string | null,
  status?: string,
): AdminReport[] {
  const city = cityName ?? ''
  const scope = city ? `c.name = '${city.replace(/'/g, "''")}'` : '1 = 1'
  const statusClause = status ? `AND r.status = '${status.replace(/'/g, "''")}'` : ''
  return execAll(
    db,
    `SELECT r.id, r.pharmacy_id, r.author, r.type, r.description, r.status,
            r.created_at, r.response, p.name AS pharmacy_name, c.name AS city
     FROM reports r
     JOIN pharmacies p ON p.id = r.pharmacy_id
     JOIN cities c ON c.id = p.city_id
     WHERE ${scope} ${statusClause}
     ORDER BY r.created_at DESC`,
  ).map((row) => ({
    id: Number(row.id),
    pharmacyId: Number(row.pharmacy_id),
    pharmacyName: String(row.pharmacy_name),
    city: String(row.city),
    author: String(row.author),
    type: String(row.type),
    description: String(row.description),
    status: String(row.status),
    createdAt: String(row.created_at),
    response: row.response === null ? null : String(row.response),
  }))
}

export function setReportStatusAdmin(
  db: Database,
  reportId: number,
  status: string,
  responseText: string | null,
  actor: string,
): void {
  if (responseText) {
    db.run(`UPDATE reports SET status = ?, response = ? WHERE id = ?`, [
      status,
      responseText,
      reportId,
    ])
  } else {
    db.run(`UPDATE reports SET status = ? WHERE id = ?`, [status, reportId])
  }
  logAudit(db, actor, 'moderation', `report:${reportId}`, status)
}

export function getAdminSchedules(
  db: Database,
  cityName: string | null,
): AdminSchedule[] {
  const city = cityName ?? ''
  const scope = city ? `c.name = '${city.replace(/'/g, "''")}'` : '1 = 1'
  return execAll(
    db,
    `SELECT ds.id, ds.pharmacy_id, ds.weekday, ds.start, ds.end, ds.status, ds.source,
            p.name AS pharmacy_name, c.name AS city
     FROM duty_schedules ds
     JOIN pharmacies p ON p.id = ds.pharmacy_id
     JOIN cities c ON c.id = p.city_id
     WHERE ${scope}
     ORDER BY p.name, ds.weekday`,
  ).map((row) => ({
    id: Number(row.id),
    pharmacyId: Number(row.pharmacy_id),
    pharmacyName: String(row.pharmacy_name),
    city: String(row.city),
    weekday: Number(row.weekday),
    start: String(row.start),
    end: String(row.end),
    status: String(row.status),
    source: String(row.source),
  }))
}

export function setScheduleStatus(
  db: Database,
  scheduleId: number,
  status: 'publie' | 'draft',
  actor: string,
): void {
  db.run(`UPDATE duty_schedules SET status = ?, source = ? WHERE id = ?`, [
    status,
    `Planning mis à jour par ${actor}`,
    scheduleId,
  ])
  logAudit(db, actor, 'programmation', `schedule:${scheduleId}`, status)
}

export function setDutyDay(
  db: Database,
  pharmacyId: number,
  weekday: number,
  patch: { enabled: boolean; start?: string | null; end?: string | null },
  actor: string,
): void {
  const day = Number(weekday)
  const existing = execFirst(
    db,
    `SELECT id, start, end FROM duty_schedules WHERE pharmacy_id = ? AND weekday = ?`,
    [pharmacyId, day],
  )
  const start = patch.start != null && patch.start !== '' ? String(patch.start).slice(0, 5) : null
  const end = patch.end != null && patch.end !== '' ? String(patch.end).slice(0, 5) : null
  const source = `Planning des gardes modifié par ${actor}`
  if (patch.enabled) {
    if (existing) {
      db.run(`UPDATE duty_schedules SET start = ?, end = ?, status = 'publie', source = ? WHERE id = ?`, [
        start ?? String(existing.start),
        end ?? String(existing.end),
        source,
        Number(existing.id),
      ])
    } else {
      db.run(
        `INSERT INTO duty_schedules (pharmacy_id, weekday, start, end, status, source, created_at)
         VALUES (?, ?, ?, ?, 'publie', ?, ?)`,
        [pharmacyId, day, start ?? '18:00', end ?? '08:00', source, new Date().toISOString()],
      )
    }
  } else if (existing) {
    db.run(`UPDATE duty_schedules SET status = 'draft', source = ? WHERE id = ?`, [
      source,
      Number(existing.id),
    ])
  } else {
    return
  }
  saveDb(db)
  logAudit(
    db,
    actor,
    'planification_maj',
    `pharmacy:${pharmacyId}:weekday:${day}`,
    patch.enabled ? `publié ${start ?? '—'}→${end ?? '—'}` : 'garde désactivée',
  )
}

export function updatePharmacyProfile(
  db: Database,
  pharmacyId: number,
  patch: { phone?: string; address?: string; quartier?: string },
  actor: string,
): void {
  const fields: string[] = []
  const values: Array<string | number> = []
  if (patch.phone !== undefined) {
    fields.push('phone = ?')
    values.push(patch.phone)
  }
  if (patch.address !== undefined) {
    fields.push('address = ?')
    values.push(patch.address)
  }
  if (patch.quartier !== undefined) {
    fields.push('quartier = ?')
    values.push(patch.quartier)
  }
  if (fields.length === 0) return
  values.push(new Date().toISOString(), pharmacyId)
  db.run(`UPDATE pharmacies SET ${fields.join(', ')}, last_updated = ? WHERE id = ?`, values)
  saveDb(db)
  logAudit(db, actor, 'profil_maj', `pharmacy:${pharmacyId}`, fields.join(', '))
}

export function getAuditLogs(db: Database, limit = 60): AuditEntry[] {
  return execAll(
    db,
    `SELECT id, actor, action, resource, timestamp, metadata
     FROM audit_log
     ORDER BY timestamp DESC
     LIMIT ?`,
    [limit],
  ).map((row) => ({
    id: Number(row.id),
    actor: String(row.actor),
    action: String(row.action),
    resource: String(row.resource),
    timestamp: String(row.timestamp),
    metadata: row.metadata === null ? null : String(row.metadata),
  }))
}

export function createAnomalyReport(
  db: Database,
  pharmacyId: number,
  author: string,
  type: string,
  description: string,
): ReportRecord | null {
  const timestamp = new Date().toISOString()
  db.run(
    `INSERT INTO reports (pharmacy_id, author, type, description, status, created_at)
     VALUES (?, ?, ?, ?, 'nouveau', ?)`,
    [pharmacyId, author, type, description, timestamp],
  )
  saveDb(db)
  logAudit(db, author.trim() === '' ? 'Anonyme' : author, 'signalement_creation', `pharmacy:${pharmacyId}`, type)
  const row = execFirst(
    db,
    `SELECT id, pharmacy_id, author, type, description, status, created_at, response
     FROM reports WHERE created_at = ? ORDER BY id DESC LIMIT 1`,
    [timestamp],
  )
  if (!row) return null
  return {
    id: Number(row.id),
    pharmacyId: Number(row.pharmacy_id),
    author: String(row.author),
    type: String(row.type),
    description: String(row.description),
    status: String(row.status),
    createdAt: String(row.created_at),
    response: row.response === null ? null : String(row.response),
  }
}