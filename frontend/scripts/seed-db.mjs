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
const todayWeekday = new Date().getDay()

const VERIFIED_SOURCE = 'Planning municipal de garde — vérifié par l\u2019administration'
const MUNICIPAL_SOURCE = 'Planning municipal de garde'
const ADMIN_SOURCE = 'Saisie administration'

// Chefs-lieux des 10 régions du Cameroun
const cities = [
  { name: 'Yaoundé', slug: 'yaounde', region: 'Centre', lat: 3.848, lng: 11.5021, pilot: 1 },
  { name: 'Douala', slug: 'douala', region: 'Littoral', lat: 4.0511, lng: 9.7679, pilot: 1 },
  { name: 'Bafoussam', slug: 'bafoussam', region: 'Ouest', lat: 5.4781, lng: 10.4173, pilot: 0 },
  { name: 'Bamenda', slug: 'bamenda', region: 'Nord-Ouest', lat: 5.9597, lng: 10.146, pilot: 0 },
  { name: 'Bertoua', slug: 'bertoua', region: 'Est', lat: 4.5773, lng: 13.6846, pilot: 0 },
  { name: 'Buéa', slug: 'buea', region: 'Sud-Ouest', lat: 4.153, lng: 9.2893, pilot: 0 },
  { name: 'Ebolowa', slug: 'ebolowa', region: 'Sud', lat: 2.9, lng: 11.15, pilot: 0 },
  { name: 'Garoua', slug: 'garoua', region: 'Nord', lat: 9.301, lng: 13.392, pilot: 0 },
  { name: 'Maroua', slug: 'maroua', region: 'Extrême-Nord', lat: 10.5912, lng: 14.3156, pilot: 0 },
  { name: 'Ngaoundéré', slug: 'ngaoundere', region: 'Adamaoua', lat: 7.327, lng: 13.584, pilot: 0 },
]

// Pharmacies détaillées des villes pilotes
const pharmacies = [
  {
    city: 'Yaoundé', name: 'Pharmacie du Centre', quartier: 'Centre-ville',
    address: 'Avenue Mgr Vogt, en face du marché central', phone: '+237 690 00 00 01',
    lat: 3.8667, lng: 11.5167, source: VERIFIED_SOURCE, lastUpdated: hoursAgo(2),
    confirmedMinutesAgo: 18,
  },
  {
    city: 'Yaoundé', name: 'Pharmacie de la Paix', quartier: 'Bastos',
    address: 'Rue Drouot, près du rond-point Bastos', phone: '+237 690 00 00 02',
    lat: 3.8877, lng: 11.5184, source: MUNICIPAL_SOURCE, lastUpdated: hoursAgo(6),
  },
  {
    city: 'Yaoundé', name: 'Pharmacie Espérance', quartier: 'Biyem-Assi',
    address: 'Carrefour Biyem-Assi, face à la station-service', phone: '+237 690 00 00 03',
    lat: 3.83, lng: 11.455, source: MUNICIPAL_SOURCE, lastUpdated: daysAgo(4),
  },
  {
    city: 'Douala', name: 'Pharmacie Saint-Michel', quartier: 'Akwa',
    address: 'Boulevard de la Liberté, près du carrefour Akwa', phone: '+237 690 00 00 04',
    lat: 4.0505, lng: 9.699, source: VERIFIED_SOURCE, lastUpdated: hoursAgo(1),
    confirmedMinutesAgo: 5,
  },
  {
    city: 'Douala', name: 'Pharmacie du Jourdain', quartier: 'Bonapriso',
    address: 'Rue Pierre Sémengué, quartier hydraulique', phone: '+237 690 00 00 05',
    lat: 4.035, lng: 9.692, source: MUNICIPAL_SOURCE, lastUpdated: hoursAgo(3),
    reportedMinutesAgo: 40,
  },
  {
    city: 'Douala', name: 'Pharmacie La Renaissance', quartier: 'Bali',
    address: 'Avenue de la République, face à la station Total', phone: '+237 690 00 00 06',
    lat: 4.06, lng: 9.682, source: MUNICIPAL_SOURCE, lastUpdated: hoursAgo(20),
  },
]

// Données des autres chefs-lieux : 3 pharmacies par ville
const outros = [
  {
    city: 'Bafoussam', quartiers: ['Centre-ville', 'Banengo', 'Tchimendem'],
    noms: ['Pharmacie de la Gare', 'Pharmacie Cathédrale', 'Pharmacie du Stade'],
  },
  {
    city: 'Bamenda', quartiers: ['Commercial Avenue', 'Nkwen', 'Mankon'],
    noms: ['Pharmacie de la Montagne', 'Pharmacie Commercial Avenue', 'Pharmacie Nkwen'],
  },
  {
    city: 'Bertoua', quartiers: ['Centre-ville', 'Manga', 'Moamigui'],
    noms: ["Pharmacie de l'Est", 'Pharmacie Manga', 'Pharmacie du Marché'],
  },
  {
    city: 'Buéa', quartiers: ['Molyko', 'Bokwango', 'Buea Town'],
    noms: ['Pharmacie Molyko', 'Pharmacie du Col', 'Pharmacie Bokwango'],
  },
  {
    city: 'Ebolowa', quartiers: ['Centre-ville', 'Meyomessi', 'Bikop'],
    noms: ['Pharmacie du Sud', 'Pharmacie Meyomessi', 'Pharmacie de la Poste'],
  },
  {
    city: 'Garoua', quartiers: ['Centre-ville', 'Boki', 'Doualare'],
    noms: ['Pharmacie du Grand Marché', 'Pharmacie de la Bénoué', 'Pharmacie Doualare'],
  },
  {
    city: 'Maroua', quartiers: ['Yelwa', 'Pitoaré', 'Dougoui'],
    noms: ['Pharmacie Yelwa', 'Pharmacie du Marché Central', 'Pharmacie Pitoaré'],
  },
  {
    city: 'Ngaoundéré', quartiers: ['Baladji', 'Dang', 'Malang'],
    noms: ['Pharmacie du Plateau', 'Pharmacie Malang', 'Pharmacie de la Gare'],
  },
]

const streets = [
  'Avenue principale',
  'Rue du Marché',
  "Boulevard de l'Indépendance",
  'Rue de la Poste',
]
const offsets = [
  [0.005, 0.012],
  [-0.008, -0.016],
  [0.012, -0.005],
]

let phoneSeed = 10
for (const [cityIndex, block] of outros.entries()) {
  const city = cities.find((c) => c.name === block.city)
  for (let i = 0; i < 3; i++) {
    const entry = {
      city: block.city,
      name: block.noms[i],
      quartier: block.quartiers[i],
      address: `${streets[(cityIndex + i) % streets.length]}, quartier ${block.quartiers[i]}`,
      phone: `+237 692 00 00 ${String(phoneSeed).padStart(2, '0')}`,
      lat: city.lat + offsets[i][0],
      lng: city.lng + offsets[i][1],
      source: cityIndex % 4 === 0 ? VERIFIED_SOURCE : MUNICIPAL_SOURCE,
      lastUpdated: hoursAgo(1 + ((cityIndex + i) * 7) % 40),
    }
    phoneSeed += 1
    // Variété de statuts : confirmée / vérifiée / (signalée, ancienne ou vérifiée)
    if (i === 0) {
      entry.confirmedMinutesAgo = 10 + cityIndex * 6 + i * 3
    } else if (i === 2) {
      if (cityIndex % 3 === 0) {
        entry.reportedMinutesAgo = 30 + cityIndex * 8
      } else if (cityIndex % 3 === 1) {
        entry.lastUpdated = daysAgo(3 + cityIndex % 5)
      } else {
        entry.lastUpdated = hoursAgo(20 + cityIndex)
      }
    }
    pharmacies.push(entry)
  }
}

const SQL = await initSqlJs()
const db = new SQL.Database()

db.run(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE cities (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    region TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
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

const cityIds = new Map()
const insertCity = db.prepare(
  'INSERT INTO cities (name, slug, region, latitude, longitude, is_pilot) VALUES (?, ?, ?, ?, ?, ?)',
)
for (const city of cities) {
  insertCity.run([city.name, city.slug, city.region, city.lat, city.lng, city.pilot])
  const row = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0]
  cityIds.set(city.name, row)
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
    cityIds.get(p.city),
    p.quartier,
    p.address,
    p.phone,
    p.lat,
    p.lng,
    p.source,
    p.lastUpdated,
    daysAgo(60),
  ])
  const row = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0]
  pharmacyIds.set(`${p.city}::${p.name}`, row)
}
insertPharmacy.free()

let scheduleId = 0
const scheduleByPharmacy = new Map()
const insertSchedule = db.prepare(`
  INSERT INTO duty_schedules
    (pharmacy_id, weekday, start, end, status, source, created_at)
  VALUES (?, ?, ?, ?, 'publie', ?, ?)
`)
for (const p of pharmacies) {
  const pid = pharmacyIds.get(`${p.city}::${p.name}`)
  const startHours = pharmacies.indexOf(p) % 3 === 1 ? 19 : 18
  const endHours = startHours === 19 ? 7 : 8
  const source = startHours === 19 ? ADMIN_SOURCE : MUNICIPAL_SOURCE
  const start = `${String(startHours).padStart(2, '0')}:00`
  const end = `${String(endHours).padStart(2, '0')}:00`
  for (const weekday of [0, 1, 2, 3, 4, 5, 6]) {
    scheduleId += 1
    insertSchedule.run([pid, weekday, start, end, source, hoursAgo(24)])
    scheduleByPharmacy.set(`${p.city}::${p.name}:${weekday}`, scheduleId)
  }
}
insertSchedule.free()

const insertConfirmation = db.prepare(`
  INSERT INTO confirmations
    (pharmacy_id, duty_schedule_id, actor, timestamp, result)
  VALUES (?, ?, ?, ?, 'ok')
`)
for (const p of pharmacies) {
  if (p.confirmedMinutesAgo === undefined) continue
  insertConfirmation.run([
    pharmacyIds.get(`${p.city}::${p.name}`),
    scheduleByPharmacy.get(`${p.city}::${p.name}:${todayWeekday}`),
    `${p.name} (titulaire)`,
    minutesAgo(p.confirmedMinutesAgo),
  ])
}
insertConfirmation.free()

const insertReport = db.prepare(`
  INSERT INTO reports
    (pharmacy_id, author, type, description, status, created_at)
  VALUES (?, 'Anonyme', 'fermeture', ?, 'en_verification', ?)
`)
for (const p of pharmacies) {
  if (p.reportedMinutesAgo === undefined) continue
  insertReport.run([
    pharmacyIds.get(`${p.city}::${p.name}`),
    `Pharmacie fermée malgré la garde affichée (signalement).`,
    minutesAgo(p.reportedMinutesAgo),
  ])
}
insertReport.free()

mkdirSync(dbDir, { recursive: true })
writeFileSync(dbPath, Buffer.from(db.export()))
console.log(
  `pharmagarde.db générée : ${dbPath} (${cities.length} villes, ${pharmacies.length} pharmacies)`,
)

const wasmSrc = join(projectDir, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
copyFileSync(wasmSrc, join(dbDir, 'sql-wasm.wasm'))
console.log(`sql-wasm.wasm copié : ${join(dbDir, 'sql-wasm.wasm')}`)

db.close()