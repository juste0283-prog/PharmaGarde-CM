import initSqlJs from 'sql.js'
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
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

const ADMIN_SOURCE =
  'Planning national des gardes — vérifié par l\u2019administration'
const MUNICIPAL_SOURCE = 'Planning municipal de garde'

const DEMO_PASSWORD = 'PharmaGarde2026'
const SUPER_ADMIN_USERNAME = 'pharmasuperadmin'
const SUPER_ADMIN_PASSWORD = 'pharmaadmin@2026'
const hashPassword = (value) => createHash('sha256').update(value).digest('hex')

const slugify = (value) =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'compte'

const cities = [
  { name: 'Yaoundé', slug: 'yaounde', region: 'Centre', lat: 3.8667, lng: 11.5167, pilot: true },
  { name: 'Douala', slug: 'douala', region: 'Littoral', lat: 4.0505, lng: 9.6991, pilot: true },
  { name: 'Bafoussam', slug: 'bafoussam', region: 'Ouest', lat: 5.4772, lng: 10.4203 },
  { name: 'Bamenda', slug: 'bamenda', region: 'Nord-Ouest', lat: 5.9597, lng: 10.146 },
  { name: 'Bertoua', slug: 'bertoua', region: 'Est', lat: 4.5773, lng: 13.6846 },
  { name: 'Buéa', slug: 'buea', region: 'Sud-Ouest', lat: 4.1533, lng: 9.2843 },
  { name: 'Ebolowa', slug: 'ebolowa', region: 'Sud', lat: 2.9001, lng: 11.1504 },
  { name: 'Garoua', slug: 'garoua', region: 'Nord', lat: 9.3012, lng: 13.398 },
  { name: 'Maroua', slug: 'maroua', region: 'Extrême-Nord', lat: 10.5915, lng: 14.3157 },
  { name: 'Ngaoundéré', slug: 'ngaoundere', region: 'Adamaoua', lat: 7.3211, lng: 13.5846 },
]

// Quartiers réels de chaque ville, issus des données géographiques et
// administratives (découpages communaux des communautés urbaines).
const quartiersByCity = {
  Yaoundé: [
    'Centre Commercial', 'Elig-Essono', 'Etoa-Meki 1', 'Nlongkak', 'Elig-Edzoa',
    'Bastos', 'Manguier', 'Tongolo', 'Mballa 1', 'Nkolondom', 'Etoudi', 'Messassi',
    'Okolo', 'Olembe', 'Nyom', 'Etoa-Meki 2', 'Mballa 2', 'Mballa 3', 'Emana',
    'Nkoleton', 'Cité Verte', 'Madagascar', 'Mokolo', 'Grand Messa', 'Ekoudou',
    'Tsinga', 'Nkom-Kana', 'Oliga', 'Messa Carrière', 'Ecole de Police', 'Febe',
    'Ntoungou', 'Obili', 'Ngoa-Ekele 1', 'Nlong Mvolye', 'Ahala 1', 'Efoulan',
    'Obobogo', 'Nsam', 'Melen 2 - Centre Administratif', 'Etoa', 'Nkolmesseng 1',
    'Afanoya 1', 'Afanoya 2', 'Afanoya 3', 'Afanoya 4', 'Nkolfon',
    'Mekoumbou 1', 'Mekoumbou 2', 'Ntouessong', 'Ahala 2', 'Nsimeyong 1',
    'Nsimeyong 2', 'Nsimeyong 3', 'Olezoa', 'Dakar', 'Ngoa-Ekele 2', 'Mvan-Nord',
    'Ndamvout', 'Messame-Ndongo', 'Odza', 'Ekoumdoum', 'Awae', 'Nkomo', 'Ekounou',
    'Biteng', 'Kondengui 1', 'Kondengui 2', 'Kondengui 3', 'Mimboman 1',
    'Mimboman 3', 'Etam-Bafia', 'Mvog-Mbi', 'Nkol-Ndongo 1', 'Nkol-Ndongo 2',
    'Mebandan', 'Mvan-Sud', 'Ekie', 'Emombo', 'Ntui-Essong', 'Nkolo', 'Abom',
    'Mvog-Ada', 'Essos', 'Nkol-Messeng', 'Nkol-Ebogo', 'Quartier Fouda',
    'Ngousso 1', 'Ngousso 2', 'Ngousso-Ntem', 'Eleveur', 'Mfandena 1',
    'Mfandena 2', 'Ngoulmekong', 'Melen', 'Melen 8', 'Melen 8B et C',
    'Etoug-Ebe 1', 'Etoug-Ebe 2', 'Mvog-Betsi', 'Biyem-Assi', 'Mendong 1',
    'Mendong 2', 'Simbock', 'Simbock Ecole de guerre', 'Elig-Effa', 'Nkolbikok',
    'Etetak', 'Oyom-Abang', 'Nkolbisson', 'Nkolafeme', 'Minkoameyos', 'Nkolso',
  ],
  Douala: [
    'Akwa', 'Akwa Nord', 'Bali', 'Bessengué', 'Bonabékombo', 'Bonabéri',
    'Bonadibong', 'Bonadouma', 'Bonadoumbé', 'Bonajang', 'Bonajinjè',
    'Bonakeke Akwa', 'Bonakouamouang', 'Bonalékè', 'Bonalembè', 'Bonamikengué',
    'Bonamoudourou', 'Bonamouti', 'Bonamouti-Akwa 2', 'Bonamouti-Deido', 'Bonanjo',
    'Bonantonè', 'Bonapriso', 'Bonassama', 'Bonatéki', 'Bonaténè', 'Bonelang',
    'Bonamoussadi', 'Bonamoussadi Cité', 'Babylone', 'Bangué', 'Bakwat',
    'Bassa Logbaba', 'Bépanda', 'Bépanda Omnisport', 'Bépanda Petit Wouri',
    'Bépanda-Bonamoussongo', 'Boko', 'Cap Cameroun', 'Cité des Palmiers',
    'Cité SIC Bassa', 'Deïdo', 'Dibamba-Bonaloka', 'Dibom', 'Grand Moulin',
    'Hydrocarbures', 'Japoma', 'Joss', 'Kassalafam', 'Kotto', 'Koumassi',
    'Logbaba', 'Logbessou', 'Logpom', 'Madagascar II', 'Maképé',
    'Maképé-Missoké', 'Mambanda', 'Mbanya Pays-Bas', 'Mbengue City',
    'Ndogbati I', 'Ndogbong', 'Ndogpassi', 'Ndogpassi III', 'Ndogsimbi',
    'Ndokoti', 'Ndobo', 'New Bell', 'New Deido', 'New Town', 'New Town Aéroport',
    'New-Bell Bandjoun', 'New-Bell Congo', 'New-Bell Haoussa', 'Ngodi',
    'Ngodi Bakoko', 'Ngwélé', 'Nkongmondo', 'Nkololoun', 'Nylon-Bassa', 'Nyalla',
    'PK 12 Carrefour Massoubou', 'Sobikago', 'Tergal', 'Youpwé', 'Zone Tergal',
  ],
  Bafoussam: [
    'Bamendzi', 'Banengo', 'Djeleng', 'Demsiem', 'Évêché', 'Famla', 'Gouache',
    'Haoussa', 'Lemgwo', 'Hélak', 'Houmkahaa', 'Kamkop', 'Kena', 'Keuleu',
    'Kouogouo', 'Metto', 'Mewehee', 'Ndianso', 'Ndianbou', 'Ndiandam', 'Nylon',
    'Sachiè', 'Tamdja', 'Toket', 'Toungang', 'Touhenyee', 'Touhekououp', 'Tyo',
    'Yanmbah', 'Quartier Administratif', 'Tchimendem', 'Djemoun',
  ],
  Bamenda: [
    'Old Town', 'Nkwen', 'Mbatu', 'Mankon', 'Ntarikon', 'Ntamulung',
    'Ntambeng I', 'Ntambeng II', 'Nitob I', 'Nitob II', 'Nitob III', 'Nitob IV',
    'Azire', 'Atu-Azire', 'Alakuma', 'Atuakom', 'Chindeh', 'Lower Ngomgham',
    'Upper Ngomgham', 'Mbingfibiel', 'Musang', 'Ntatru', 'Nkvura', 'Mulang',
    'Muwatsu', 'New Town', 'Ayaba', 'Abangoh Central', 'Abangoh Ntahsa',
    'Abangoh Ngang', 'Achichum', 'Alahnting', 'Aningdoh', "Nta'Afi", 'Ntanche',
    'Nsongwa', 'Matazem', 'Up Station', 'Bayelle', 'Sisia I', 'Sisia II',
    'Mbesoh', 'Ndzah',
  ],
  Bertoua: [
    'Mokolo I', 'Mokolo II', 'Mokolo III', 'Mokolo IV', 'Sembe', 'Koume Goffi',
    'Birpondo', 'Gbakombo', 'Radio', 'Nkolbikon I', 'Nkolbikon II', 'Ndouan',
    'Bodomo', 'Madagascar', 'Bamvele', 'Koume-Bonis', 'Nyanganza',
    'Koume Tigaza', 'Bonis', 'Ndongofi', 'Nganke', 'Gaïmona', 'Kàigama',
    'Chantier', 'Mandjou',
  ],
  Buéa: [
    'Molyko', 'Small Soppo', 'Great Soppo', 'Buea Town', 'Bokoko', 'Bokwaongo',
    "Clerk's Quarter", 'Federal Quarters', 'Government Residential Area',
    'Mokunda', 'Old-Government Station', 'Bonduma', 'Strangers East',
    'Strangers West I (Babuti)', 'Strangers West II (Bonaberi)', 'Wokoko',
    'Wokeka', 'Wolikawo', 'Wotolo', 'Small Soppo-Woteke', 'Small Soppo-Wovila',
    'Bolifamba', 'Muéa', 'Bomaka', 'Bokwai', 'Ekande', 'Liongo', 'Lower Bokova',
    'Lower Muea', 'Upper Muea', 'Lysoka', 'Maumu', 'Muangai', 'Mussaka', 'Sasse',
    'Dibanda', 'Bojongo', 'Bonakanda', 'Bulu', 'Bova I', 'Mevio', 'Wokaka',
  ],
  Ebolowa: [
    'Essinguili', 'Ekombité', 'Ekitebon', 'Bilon', "Nkô'ovos II", 'Saint-Cloud',
    'Mekalat Yemveng', 'Mekalat Yevol', 'Elat', 'Enongal', 'Adoum', 'Mbanga',
    'Angalé',
  ],
  Garoua: [
    'Roumdé Adjia', 'Djamboutou', 'Foulbéré', 'Camp Chinois', 'Marouaré',
    'Nassarao', 'Haoussaré', 'Koléré', 'Plateau', 'Poumpoumre', 'Bibemiré',
    'Nigeriaré', 'Souari Manou', 'Souari Dépôt', 'Sodecoton', 'Yelwa', 'Lowel',
    'Lomodou', 'Ouro Mal Ahmadou', 'Djoumassi', 'Congoré', 'Conkolré',
    'Garoua Windé', 'Boggaré', 'Sabongari', 'Doualare', 'Ouro-Labbo', 'Djadjé',
    'Leinde Daneyel', 'Wouro Kanadi', 'Boki', 'Takasko', 'Douroure',
    'Ouro Souley',
  ],
  Maroua: [
    'Domayo', 'Hardéo', 'Kongola', 'Kongola Djiddéo', 'Djarengol', 'Kodek',
    'Kodek Djarengol', 'Pallar', 'Zokok', 'Diguirwo', 'Djoulgouf', 'Maoundiwo',
    'Hardé', 'Dougoui', 'Doursoungo', 'Doualare', 'Founangue', 'Baoliwol',
    'Koutbawo', 'Zileng', 'Ouro Tchédé', 'Kakatare', 'Barmare', 'Lopere',
    'Pitoaré', 'Ponré', 'Louguewo', 'Patchiguinari', 'Congoré', 'Djoudandou',
    'Mayel-Ibbé', 'Bamaré', 'Yelwa',
  ],
  Ngaoundéré: [
    'Quartier Administratif', 'Mbideng', 'Camp Fonctionnaire', 'Ndelbe I',
    'Ndelbe II', 'Ndelbe III', 'Bali', 'Boumdjere', 'Mission Catholique',
    'Gambara II', 'Mayo-Djarandi', 'Burkina', 'Bamyanga I', 'Bamyanga II-A',
    'Bamyanga II-B', 'Bamyanga III', 'Bamyanga-Hamadjangui', 'Bamyanga-Pana',
    'Marza I', 'Marza II', 'Ngaoundang', 'Sioute Bonjong', 'Laïga', 'Wakwa',
    'Quartier Lissey', 'Mamra', 'Haut-Plateau', 'Kantalang', 'Beka-Hossere',
    'Mbikala-Hossere', 'Tongo I', 'Tongo Pastoral', 'Baladji I', 'Baladji II',
    'Joli Soir', 'Abattoir', 'Aéroport', 'Lamidat', 'Yarbang', 'Haoussa',
    'Aoudi', 'Sabongari I', 'Sabongari II', 'Sabongari III', 'Troua Malla',
    'Mbibar', 'Mabanga', 'Madagascar', 'Choa', 'Gadamabanga', 'Dang', 'Malang',
  ],
}

const pilots = [
  {
    city: 'Yaoundé',
    name: 'Pharmacie du Centre',
    quartier: 'Centre Commercial',
    address: 'Avenue Mgr Vogt, en face du marché central',
    phone: '+237 690 00 00 01',
    lat: 3.8667,
    lng: 11.5167,
    source: MUNICIPAL_SOURCE,
    lastUpdated: hoursAgo(2),
    verified: true,
    confirmedMinutesAgo: 18,
  },
  {
    city: 'Yaoundé',
    name: 'Pharmacie de la Paix',
    quartier: 'Bastos',
    address: 'Rue Drouot, près du rond-point Bastos',
    phone: '+237 690 00 00 02',
    lat: 3.8877,
    lng: 11.5184,
    source: ADMIN_SOURCE,
    lastUpdated: hoursAgo(6),
    verified: true,
  },
  {
    city: 'Yaoundé',
    name: 'Pharmacie Espérance',
    quartier: 'Biyem-Assi',
    address: 'Carrefour Biyem-Assi, face à la station-service',
    phone: '+237 690 00 00 03',
    lat: 3.83,
    lng: 11.455,
    source: MUNICIPAL_SOURCE,
    lastUpdated: daysAgo(4),
    verified: true,
  },
  {
    city: 'Douala',
    name: 'Pharmacie Saint-Michel',
    quartier: 'Akwa',
    address: 'Boulevard de la Liberté, près du carrefour Akwa',
    phone: '+237 690 00 00 04',
    lat: 4.0505,
    lng: 9.699,
    source: ADMIN_SOURCE,
    lastUpdated: hoursAgo(1),
    verified: true,
    confirmedMinutesAgo: 5,
  },
  {
    city: 'Douala',
    name: 'Pharmacie du Jourdain',
    quartier: 'Bonapriso',
    address: 'Rue Pierre Sémengué, quartier hydraulique',
    phone: '+237 690 00 00 05',
    lat: 4.035,
    lng: 9.692,
    source: MUNICIPAL_SOURCE,
    lastUpdated: hoursAgo(3),
    verified: true,
  },
  {
    city: 'Douala',
    name: 'Pharmacie La Renaissance',
    quartier: 'Bali',
    address: 'Avenue de la République, face à la station Total',
    phone: '+237 690 00 00 06',
    lat: 4.06,
    lng: 9.682,
    source: MUNICIPAL_SOURCE,
    lastUpdated: hoursAgo(20),
    verified: true,
  },
]

// 8 autres chefs-lieux × 3 pharmacies générées (quartiers offset autour de la ville)
const generated = [
  {
    city: 'Bafoussam',
    quartiers: [
      { name: 'Banengo', dLat: -0.028, dLng: -0.022 },
      { name: 'Djeleng', dLat: 0.006, dLng: 0.011 },
      { name: 'Tchimendem', dLat: 0.021, dLng: -0.013 },
    ],
    names: ['Pharmacie de la Gare', 'Pharmacie Cathédrale', 'Pharmacie du Stade'],
  },
  {
    city: 'Bamenda',
    quartiers: [
      { name: 'Nkwen', dLat: -0.02, dLng: -0.015 },
      { name: 'Old Town', dLat: 0.004, dLng: 0.012 },
      { name: 'Mbatu', dLat: 0.018, dLng: -0.009 },
    ],
    names: ['Pharmacie du Lac', 'Pharmacie du Marché', 'Pharmacie Santa'],
  },
  {
    city: 'Bertoua',
    quartiers: [
      { name: 'Radio', dLat: -0.025, dLng: -0.018 },
      { name: 'Chantier', dLat: 0.007, dLng: 0.013 },
      { name: 'Birpondo', dLat: 0.019, dLng: -0.011 },
    ],
    names: ['Pharmacie de l\u2019Est', 'Pharmacie Centrale', 'Pharmacie du Carrefour'],
  },
  {
    city: 'Buéa',
    quartiers: [
      { name: 'Molyko', dLat: -0.024, dLng: -0.017 },
      { name: 'Small Soppo', dLat: 0.006, dLng: 0.012 },
      { name: 'Buea Town', dLat: 0.02, dLng: -0.01 },
    ],
    names: ['Pharmacie Molyko', 'Pharmacie de la Montagne', 'Pharmacie du Palmier'],
  },
  {
    city: 'Ebolowa',
    quartiers: [
      { name: 'Essinguili', dLat: -0.026, dLng: -0.019 },
      { name: 'Ekombité', dLat: 0.005, dLng: 0.012 },
      { name: 'Saint-Cloud', dLat: 0.022, dLng: -0.012 },
    ],
    names: ['Pharmacie du Sud', 'Pharmacie de la Forêt', 'Pharmacie de la Mairie'],
  },
  {
    city: 'Garoua',
    quartiers: [
      { name: 'Roumdé Adjia', dLat: -0.027, dLng: -0.02 },
      { name: 'Doualare', dLat: 0.006, dLng: 0.013 },
      { name: 'Poumpoumre', dLat: 0.02, dLng: -0.011 },
    ],
    names: ['Pharmacie de la Bénoué', 'Pharmacie Doualare', 'Pharmacie du Grand Marché'],
  },
  {
    city: 'Maroua',
    quartiers: [
      { name: 'Dougoui', dLat: -0.025, dLng: -0.018 },
      { name: 'Pitoaré', dLat: 0.006, dLng: 0.012 },
      { name: 'Yelwa', dLat: 0.019, dLng: -0.01 },
    ],
    names: ['Pharmacie du Marché Central', 'Pharmacie Pitoaré', 'Pharmacie Yelwa'],
  },
  {
    city: 'Ngaoundéré',
    quartiers: [
      { name: 'Baladji I', dLat: -0.024, dLng: -0.017 },
      { name: 'Dang', dLat: 0.006, dLng: 0.013 },
      { name: 'Malang', dLat: 0.021, dLng: -0.012 },
    ],
    names: ['Pharmacie du Plateau', 'Pharmacie Malang', 'Pharmacie de la Gare Centrale'],
  },
]

const generatedPharmacies = generated.flatMap((g, cityIndex) => {
  const city = cities.find((c) => c.name === g.city)
  return g.names.map((name, i) => {
    const quartier = g.quartiers[i]
    const confirmed = i === 0
    const stale = i === 2 && cityIndex % 3 === 1
    const reported = i === 2 && cityIndex % 3 === 0
    return {
      city: g.city,
      name,
      quartier: quartier.name,
      address: `Quartier principal — secteur ${quartier.name}`,
      phone: `+237 691 ${String(20 + cityIndex).padStart(2, '0')} ${i + 1}${i + 1}`,
      lat: city.lat + quartier.dLat,
      lng: city.lng + quartier.dLng,
      source:
        i === 1 ? ADMIN_SOURCE : MUNICIPAL_SOURCE,
      lastUpdated: stale ? daysAgo(5) : hoursAgo(2 + cityIndex),
      verified: true,
      confirmedMinutesAgo: confirmed ? 10 + cityIndex * 6 + i * 3 : undefined,
      reportedMinutesAgo: reported ? 30 + cityIndex * 10 : undefined,
    }
  })
})

const pharmacies = [...pilots, ...generatedPharmacies]

const pendingAccounts = new Set([
  'Bertoua::Pharmacie Centrale',
  'Garoua::Pharmacie du Grand Marché',
])
const suspendedAccounts = new Set(['Douala::Pharmacie La Renaissance'])
for (const p of pharmacies) {
  if (pendingAccounts.has(`${p.city}::${p.name}`)) p.verified = false
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

  CREATE TABLE quartiers (
    id INTEGER PRIMARY KEY,
    city_id INTEGER NOT NULL REFERENCES cities(id),
    name TEXT NOT NULL,
    UNIQUE (city_id, name)
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
    created_at TEXT NOT NULL,
    response TEXT
  );

  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL,
    city_id INTEGER REFERENCES cities(id),
    pharmacy_id INTEGER REFERENCES pharmacies(id),
    status TEXT NOT NULL DEFAULT 'actif',
    password TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    metadata TEXT
  );

  CREATE INDEX idx_pharmacies_city ON pharmacies(city_id);
  CREATE INDEX idx_duty_pharmacy_weekday ON duty_schedules(pharmacy_id, weekday);
  CREATE INDEX idx_confirmations_pharmacy ON confirmations(pharmacy_id);
  CREATE INDEX idx_reports_pharmacy_status ON reports(pharmacy_id, status);
  CREATE INDEX idx_users_role_city ON users(role, city_id);
`)

const todayWeekday = new Date().getDay()

const cityIds = new Map()
const insertCity = db.prepare(`
  INSERT INTO cities (name, slug, region, latitude, longitude, is_pilot)
  VALUES (?, ?, ?, ?, ?, ?)
`)
for (const c of cities) {
  insertCity.run([c.name, c.slug, c.region, c.lat, c.lng, c.pilot ? 1 : 0])
  const row = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0]
  cityIds.set(c.name, row)
}
insertCity.free()

const insertQuartier = db.prepare(`
  INSERT INTO quartiers (city_id, name)
  VALUES (?, ?)
`)
let quartierCount = 0
for (const c of cities) {
  for (const quartier of quartiersByCity[c.name] ?? []) {
    insertQuartier.run([cityIds.get(c.name), quartier])
    quartierCount += 1
  }
}
insertQuartier.free()

const pharmacyIds = new Map()
const insertPharmacy = db.prepare(`
  INSERT INTO pharmacies
    (name, city_id, quartier, address, phone, latitude, longitude,
     source, verified, last_updated, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    p.verified ? 1 : 0,
    p.lastUpdated,
    hoursAgo(24 * 60),
  ])
  const row = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0]
  pharmacyIds.set(`${p.city}::${p.name}`, row)
}
insertPharmacy.free()

{ // comptes utilisateurs : super admin, un administrateur par ville, un compte par pharmacie
  const insertUser = db.prepare(`
    INSERT INTO users (name, username, email, role, city_id, pharmacy_id, status, password, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  let userCount = 0
  const usedUsernames = new Set([SUPER_ADMIN_USERNAME])
  const uniqueUsername = (base) => {
    let candidate = base
    let suffix = 2
    while (usedUsernames.has(candidate)) {
      candidate = `${base}-${suffix}`
      suffix += 1
    }
    usedUsernames.add(candidate)
    return candidate
  }
  insertUser.run([
    'Super administrateur — Direction générale',
    SUPER_ADMIN_USERNAME,
    'superadmin@pharmagarde.cm',
    'super_admin',
    null,
    null,
    'actif',
    hashPassword(SUPER_ADMIN_PASSWORD),
    hoursAgo(24 * 365),
  ])
  userCount += 1
  for (const c of cities) {
    insertUser.run([
      `Administrateur — ${c.name}`,
      uniqueUsername(`admin.${c.slug}`),
      `admin.${c.slug}@pharmagarde.cm`,
      'admin',
      cityIds.get(c.name),
      null,
      'actif',
      hashPassword(DEMO_PASSWORD),
      hoursAgo(24 * 180),
    ])
    userCount += 1
  }
  for (const p of pharmacies) {
    const key = `${p.city}::${p.name}`
    const accountStatus = suspendedAccounts.has(key)
      ? 'suspendu'
      : pendingAccounts.has(key)
        ? 'en_attente'
        : 'actif'
    insertUser.run([
      `${p.name} (compte professionnel)`,
      uniqueUsername(slugify(p.name)),
      `pharma.${pharmacyIds.get(key)}@pharmagarde.cm`,
      'pharmacie',
      null,
      pharmacyIds.get(key),
      accountStatus,
      hashPassword(DEMO_PASSWORD),
      p.lastUpdated,
    ])
    userCount += 1
  }
  insertUser.free()
  console.log(`${userCount} comptes utilisateurs insérés`)
}

{ // journal d'audit initial
  const insertAudit = db.prepare(`
    INSERT INTO audit_log (actor, action, resource, timestamp, metadata)
    VALUES (?, ?, ?, ?, ?)
  `)
  const entries = [
    [
      'Super administrateur',
      'validation_batch',
      'pharmacies',
      daysAgo(10),
      'Validation initiale de 30 pharmacies sur les 10 chefs-lieux',
    ],
    [
      'Administrateur — Yaoundé',
      'moderation',
      'report:2',
      hoursAgo(24),
      'Signalement classé en_vérification',
    ],
  ]
  for (const entry of entries) insertAudit.run(entry)
  insertAudit.free()
}

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
let confirmationsCount = 0
for (const p of pharmacies) {
  if (p.confirmedMinutesAgo === undefined) continue
  confirmationsCount += 1
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
  VALUES (?, ?, 'fermeture', ?, 'en_verification', ?)
`)
let reportsCount = 0
for (const p of pharmacies) {
  if (p.reportedMinutesAgo === undefined) continue
  const key = `${p.city}::${p.name}`
  // incident critique : deux signalements convergents pour la même garde
  const extra = key === 'Bafoussam::Pharmacie du Stade' ? 1 : 0
  for (let k = 0; k <= extra; k += 1) {
    reportsCount += 1
    insertReport.run([
      pharmacyIds.get(key),
      k === 0 ? 'Anonyme' : 'Awa M. (usager)',
      k === 0
        ? `Pharmacie fermée malgré la garde affichée (signalement ${reportsCount}).`
        : `Fermée depuis plus d'une heure malgré la garde de nuit affichée (signalement ${reportsCount}).`,
      minutesAgo(p.reportedMinutesAgo - k * 9),
    ])
  }
}
insertReport.free()

mkdirSync(dbDir, { recursive: true })
writeFileSync(dbPath, Buffer.from(db.export()))
console.log(
  `pharmagarde.db générée : ${dbPath} (${cities.length} villes, ${quartierCount} quartiers, ${pharmacies.length} pharmacies, ${confirmationsCount} confirmations, ${reportsCount} signalements)`,
)

const wasmSrc = join(projectDir, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
copyFileSync(wasmSrc, join(dbDir, 'sql-wasm.wasm'))
console.log(`sql-wasm.wasm copié : ${join(dbDir, 'sql-wasm.wasm')}`)

db.close()