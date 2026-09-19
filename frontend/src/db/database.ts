import initSqlJs from 'sql.js'
import type { Database, SqlValue } from 'sql.js'
import {
  DEMO_PASSWORD,
  SUPER_ADMIN_PASSWORD,
  SUPER_ADMIN_USERNAME,
  hashPassword,
} from './passwords'

let dbPromise: Promise<Database> | null = null

const baseUrl = import.meta.env.BASE_URL

const LOCAL_DB_KEY = 'pharmagarde.db.local.v2'
const SESSION_KEY = 'pharmagarde.space.session.v1'
export const BACKOFFICE_SESSION_KEY = 'pharmagarde.backoffice.session.v1'

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function migrate(db: Database): Promise<Database> {
  try {
    db.run('ALTER TABLE reports ADD COLUMN response TEXT')
  } catch {
    // colonne déjà présente
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      city_id INTEGER REFERENCES cities(id),
      pharmacy_id INTEGER REFERENCES pharmacies(id),
      status TEXT NOT NULL DEFAULT 'actif',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      metadata TEXT
    );
  `)
  try {
    db.run('ALTER TABLE users ADD COLUMN username TEXT')
  } catch {
    // colonne déjà présente
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS quartiers (
      id INTEGER PRIMARY KEY,
      city_id INTEGER NOT NULL REFERENCES cities(id),
      name TEXT NOT NULL,
      UNIQUE (city_id, name)
    );
  `)
  db.run(`
    INSERT OR IGNORE INTO quartiers (city_id, name)
    SELECT DISTINCT c.id, p.quartier
    FROM pharmacies p
    JOIN cities c ON c.id = p.city_id
  `)
  try {
    db.run('ALTER TABLE users ADD COLUMN password TEXT')
  } catch {
    // colonne déjà présente
  }
  const existing = execFirst(db, 'SELECT COUNT(*) AS n FROM users')
  if (existing && Number(existing.n) === 0) {
    const now = new Date().toISOString()
    db.run(
      `INSERT INTO users (name, email, role, status, created_at)
       VALUES ('Super administrateur — Direction générale', 'superadmin@pharmagarde.cm', 'super_admin', 'actif', ?)`,
      [now],
    )
    db.run(
      `INSERT INTO users (name, email, role, city_id, status, created_at)
       SELECT 'Administrateur — ' || c.name, 'admin.' || c.slug || '@pharmagarde.cm', 'admin', c.id, 'actif', ?
       FROM cities c
       WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.role = 'admin' AND u.city_id = c.id)`,
      [now],
    )
    db.run(
      `INSERT INTO users (name, email, role, pharmacy_id, status, created_at)
       SELECT p.name || ' (compte professionnel)', 'pharma.' || p.id || '@pharmagarde.cm', 'pharmacie', p.id, 'actif', p.last_updated
       FROM pharmacies p
       WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.role = 'pharmacie' AND u.pharmacy_id = p.id)`,
      [],
    )
  }
  const withoutPassword = execFirst(
    db,
    `SELECT COUNT(*) AS n FROM users WHERE password IS NULL OR password = ''`,
  )
  if (withoutPassword && Number(withoutPassword.n) > 0) {
    const defaultHash = await hashPassword(DEMO_PASSWORD)
    db.run(`UPDATE users SET password = ? WHERE password IS NULL OR password = ''`, [defaultHash])
  }
  const usedUsernames = new Set(
    execAll(db, `SELECT username FROM users WHERE username IS NOT NULL AND username <> ''`).map(
      (row) => String(row.username),
    ),
  )
  const withoutUsername = execAll(
    db,
    `SELECT u.id, u.role, c.slug AS city_slug, p.name AS pharmacy_name
     FROM users u
     LEFT JOIN cities c ON c.id = u.city_id
     LEFT JOIN pharmacies p ON p.id = u.pharmacy_id
     WHERE u.username IS NULL OR u.username = ''`,
  )
  for (const row of withoutUsername) {
    const base =
      row.role === 'super_admin'
        ? SUPER_ADMIN_USERNAME
        : row.role === 'admin'
          ? `admin.${row.city_slug ?? 'ville'}`
          : slugify(String(row.pharmacy_name ?? 'pharmacie'))
    let username = base
    let suffix = 2
    while (usedUsernames.has(username)) {
      username = `${base}-${suffix}`
      suffix += 1
    }
    usedUsernames.add(username)
    db.run(`UPDATE users SET username = ? WHERE id = ?`, [username, Number(row.id)])
  }
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)`)

  const superRow = execFirst(
    db,
    `SELECT id, password FROM users WHERE username = ? LIMIT 1`,
    [SUPER_ADMIN_USERNAME],
  )
  if (superRow) {
    const oldDefaultHash = await hashPassword(DEMO_PASSWORD)
    const currentHash = String(superRow.password ?? '')
    if (!currentHash || currentHash === oldDefaultHash) {
      db.run('UPDATE users SET password = ? WHERE id = ?', [
        await hashPassword(SUPER_ADMIN_PASSWORD),
        Number(superRow.id),
      ])
    }
  }
  return db
}

function slugify(value: string): string {
  return (
    String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'compte'
  )
}

export async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await initSqlJs({
        locateFile: () => `${baseUrl}db/sql-wasm.wasm`,
      })
      const response = await fetch(`${baseUrl}db/pharmagarde.db`)
      if (!response.ok) {
        throw new Error(`Impossible de charger la base de données (HTTP ${response.status})`)
      }
      const bytes = new Uint8Array(await response.arrayBuffer())
      const saved = localStorage.getItem(LOCAL_DB_KEY)
      if (saved) {
        try {
          return await migrate(new SQL.Database(base64ToBytes(saved)))
        } catch {
          return await migrate(new SQL.Database(bytes))
        }
      }
      return await migrate(new SQL.Database(bytes))
    })()
  }
  return dbPromise
}

export function saveDb(db: Database): void {
  localStorage.setItem(LOCAL_DB_KEY, bytesToBase64(db.export()))
}

export function resetLocalDb(): void {
  localStorage.removeItem(LOCAL_DB_KEY)
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(BACKOFFICE_SESSION_KEY)
}

export type Row = Record<string, string | number | null>

export function execAll(db: Database, sql: string, params: SqlValue[] = []): Row[] {
  const statement = db.prepare(sql)
  statement.bind(params)
  const results: Row[] = []
  while (statement.step()) {
    const row: Row = {}
    const values = statement.get()
    statement.getColumnNames().forEach((column, index) => {
      const value = values[index]
      row[column] =
        typeof value === 'string' || typeof value === 'number'
          ? value
          : value === null
            ? null
            : String(value)
    })
    results.push(row)
  }
  statement.free()
  return results
}

export function execFirst(db: Database, sql: string, params: SqlValue[] = []): Row | undefined {
  return execAll(db, sql, params)[0]
}