import initSqlJs from 'sql.js'
import type { Database, SqlValue } from 'sql.js'

let dbPromise: Promise<Database> | null = null

const baseUrl = import.meta.env.BASE_URL

const LOCAL_DB_KEY = 'pharmagarde.db.local.v1'
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

function migrate(db: Database): Database {
  try {
    db.run('ALTER TABLE reports ADD COLUMN response TEXT')
  } catch {
    // colonne déjà présente
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
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
  return db
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
          return migrate(new SQL.Database(base64ToBytes(saved)))
        } catch {
          return migrate(new SQL.Database(bytes))
        }
      }
      return migrate(new SQL.Database(bytes))
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