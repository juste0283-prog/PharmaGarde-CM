import initSqlJs from 'sql.js'
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const projectDir = join(scriptDir, '..')
const dbDir = join(projectDir, 'public', 'db')
const dbPath = join(dbDir, 'pharmagarde.db')

const now = Date.now()
const minutesAgo = (m) => new Date(now - m * 60_000).toISOString()
const hoursAgo = (h) => new Date(now - h * 3_600_000).toISOString()
const daysAgo = (d) => new Date(now - d * 86_400_000).toISOString()

const cities = [
  { name: 'Yaoundé', slug: 'yaounde' },
  { name: 'Douala', slug: 'douala' },
]

const pharmacies = [
  {
    city: 'Yaoundé',
    name: 'Pharmacie du Centre',
    quartier: 'Centre-ville',
    address: 'Avenue Mgr Vogt, en face du marché central',
    phone: '+237 690 00 00 01',
    lat: 3.8667,
    lng: 11.5167,
    source: 'Planning municipal de garde — vérifié par l\u2019administration',
    lastUpdated: hoursAgo(2),
  },
  {
    city: 'Yaoundé',
    name: 'Pharmacie de la Paix',
    quartier: 'Bastos',
    address: 'Rue Drouot, près du rond-point Bastos',
    phone: '+237 690 00 00 02',
    lat: 3.8877,
    lng: 11.5184,
    source: 'Planning municipal de garde',
    lastUpdated: hoursAgo(6),
  },
  {
    city: 'Yaoundé',
    name: 'Pharmacie Espérance',
    quartier: 'Biyem-Assi',
    address: 'Carrefour Biyem-Assi, face à la station-service',
    phone: '+237 690 00 00 03',
    lat: 3.83,
    lng: 11.455,
    source: 'Planning municipal de garde',
    lastUpdated: daysAgo(4),
  },
  {
    city: 'Douala',
    name: 'Pharmacie Saint-Michel',
    quartier: 'Akwa',
    address: 'Boulevard de la Liberté, près du carrefour Akwa',
    phone: '+237 690 00 00 04',
    lat: 4.0505,
    lng: 9.699,
    source: 'Planning municipal de garde — vérifié par l\u2019administration',
    lastUpdated: hoursAgo(1),
  },
  {
    city: 'Douala',
    name: 'Pharmacie du Jourdain',
    quartier: 'Bonapriso',
    address: 'Rue Pierre Sémengué, quartier hydraulique',
    phone: '+237 690 00 00 05',
    lat: 4.035,
    lng: 9.692,
    source: 'Planning municipal de garde',
    lastUpdated: hoursAgo(3),
  },
  {
    city: 'Douala',
    name: 'Pharmacie La Renaissance',
    quartier: 'Bali',
    address: 'Avenue de la République, face à la station Total',
    phone: '+237 690 00 00 06',
    lat: 4.06,
    lng: 9.682,
    source: 'Planning municipal de garde',
    lastUpdated: hoursAgo(20),
  },
]

// startHour/endHour : garde de nuit (21h -> 2h du matin si endHour <= startHour)
const schedules = [
  { name: 'Pharmacie du Centre', startHour: 18, endHour: 8, source: 'Import planning municipal' },
  { name: 'Pharmacie de la Paix', startHour: 19, endHour: 7, source: 'Saisie administration' },
  { name: 'Pharmacie Espérance', startHour: 18, endHour: 8, source: 'Import planning municipal' },
  { name: 'Pharmacie Saint-Michel', startHour: 18, endHour: 8, source: 'Saisie administration' },
  { name: 'Pharmacie du Jourdain', startHour: 19, endHour: 7, source: 'Import planning municipal' },
  { name: 'Pharmacie La Renaissance', startHour: 18, endHour: 8, source: 'Import planning municipal' },
]

// confirmations horodatées relatives à maintenant (minutes)
const confirmations = [
  { name: 'Pharmacie du Centre', minutesAgo: 18, dutyWeekday: 0 },
  { name: 'Pharmacie Saint-Michel', minutesAgo: 5, dutyWeekday: 0 },
]

const report = {
  name: 'Pharmacie du Jourdain',
  type: 'fermeture',
  description: 'Pharmacie fermée malgré la garde affichée à 20h.',
  status: 'en_verification',
  minutesAgo: 40,
}

const SQL = await initSqlJs()
const db = new SQL.Database()

db.run(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE cities (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    is_pilot INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE pharmacies (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    city_id INTEGER NOT NULL REFERENCES cities(id),
    quartier TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    source TEXT NOT NULL,
    verified INTEGER NOT NULL DEFAULT 0,
    last_updated TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE duty_schedules (
    id INTEGER PRIMARY KEY,
    pharmacy_id INTEGER NOT NULL REFERENCES pharmacies(id),
    weekday INTEGER NOT NULL,
    start TEXT NOT NULL,
    end TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'publie',
    source TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE confirmations (
    id INTEGER PRIMARY KEY,
    pharmacy_id INTEGER NOT NULL REFERENCES pharmacies(id),
    duty_schedule_id INTEGER REFERENCES duty_schedules(id),
    actor TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    result TEXT NOT NULL
  );

  CREATE TABLE reports (
    id INTEGER PRIMARY KEY,
    pharmacy_id INTEGER NOT NULL REFERENCES pharmacies(id),
    author TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX idx_pharmacies_city ON pharmacies(city_id);
  CREATE INDEX idx_duty_pharmacy_weekday ON duty_schedules(pharmacy_id, weekday);
  CREATE INDEX idx_confirmations_pharmacy ON confirmations(pharmacy_id);
  CREATE INDEX idx_reports_pharmacy_status ON reports(pharmacy_id, status);
`)

const cityNames = new Map()
const insertCity = db.prepare(
  'INSERT INTO cities (name, slug, is_pilot) VALUES (?, ?, 1)',
)
for (const city of cities) {
  insertCity.run([city.name, city.slug])
  const row = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0]
  cityNames.set(city.name, row)
}
insertCity.free()

const pharmacyIds = new Map()
const insertPharmacy = db.prepare(`
  INSERT INTO pharmacies
    (name, city_id, quartier, address, phone, latitude, longitude,
     source, verified, last_updated, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
`)
for (const p of pharmacies) {
  insertPharmacy.run([
    p.name,
    cityNames.get(p.city),
    p.quartier,
    p.address,
    p.phone,
    p.lat,
    p.lng,
    p.source,
    p.lastUpdated,
    minutesAgo(60 * 24),
  ])
  const row = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0]
  pharmacyIds.set(p.name, row)
}
insertPharmacy.free()

const insertSchedule = db.prepare(`
  INSERT INTO duty_schedules
    (pharmacy_id, weekday, start, end, status, source, created_at)
  VALUES (?, ?, ?, ?, 'publie', ?, ?)
`)
let scheduleId = 0
const scheduleByPharmacy = new Map()
for (const s of schedules) {
  const pid = pharmacyIds.get(s.name)
  const start = `${String(s.startHour).padStart(2, '0')}:00`
  const end = `${String(s.endHour).padStart(2, '0')}:00`
  for (const weekday of [0, 1, 2, 3, 4, 5, 6]) {
    scheduleId += 1
    insertSchedule.run([pid, weekday, start, end, s.source, hoursAgo(24)])
    scheduleByPharmacy.set(`${s.name}:${weekday}`, scheduleId)
  }
}
insertSchedule.free()

const insertConfirmation = db.prepare(`
  INSERT INTO confirmations
    (pharmacy_id, duty_schedule_id, actor, timestamp, result)
  VALUES (?, ?, ?, ?, 'ok')
`)
for (const c of confirmations) {
  insertConfirmation.run([
    pharmacyIds.get(c.name),
    scheduleByPharmacy.get(`${c.name}:${c.dutyWeekday}`),
    `${c.name} (titulaire)`,
    minutesAgo(c.minutesAgo),
  ])
}
insertConfirmation.free()

const insertReport = db.prepare(`
  INSERT INTO reports
    (pharmacy_id, author, type, description, status, created_at)
  VALUES (?, 'Anonyme', ?, ?, ?, ?)
`)
insertReport.run([
  pharmacyIds.get(report.name),
  report.type,
  report.description,
  report.status,
  minutesAgo(report.minutesAgo),
])
insertReport.free()

mkdirSync(dbDir, { recursive: true })
writeFileSync(dbPath, Buffer.from(db.export()))
console.log(`pharmagarde.db générée : ${dbPath}`)

const wasmSrc = join(projectDir, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
copyFileSync(wasmSrc, join(dbDir, 'sql-wasm.wasm'))
console.log(`sql-wasm.wasm copié : ${join(dbDir, 'sql-wasm.wasm')}`)

db.close()