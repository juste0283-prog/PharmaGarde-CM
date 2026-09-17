import initSqlJs from 'sql.js'
import type { Database, SqlValue } from 'sql.js'

let dbPromise: Promise<Database> | null = null

const baseUrl = import.meta.env.BASE_URL

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
      return new SQL.Database(bytes)
    })()
  }
  return dbPromise
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

export function execFirst(db: Database, sql: string): Row | undefined {
  return execAll(db, sql)[0]
}