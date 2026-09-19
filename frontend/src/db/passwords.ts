export const DEMO_PASSWORD = 'PharmaGarde2026'

export const SUPER_ADMIN_USERNAME = 'pharmasuperadmin'
export const SUPER_ADMIN_PASSWORD = 'pharmaadmin@2026'

function toHex(bytes: Uint8Array): string {
  let hex = ''
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto (crypto.subtle) est indisponible pour hacher le mot de passe.')
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data)
  return toHex(new Uint8Array(digest))
}