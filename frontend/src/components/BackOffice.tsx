import { useEffect, useState } from 'react'
import type { Database } from 'sql.js'
import { BACKOFFICE_SESSION_KEY, getDb } from '../db/database'
import {
  authenticateUser,
  getAdminForCity,
  getCities,
  getSuperAdmin,
  getUserByPharmacy,
  logAudit,
} from '../db/queries'
import {
  ROLE_LABELS,
  ROLE_PERIMETERS,
  type BackOfficeRole,
  type BackOfficeSession,
  type City,
  type UserAccount,
} from '../data/pharmacies'
import PharmacySpace from './PharmacySpace'
import AdminSpace from './AdminSpace'

type RoleTab = BackOfficeRole

const ROLE_TABS: { id: RoleTab; description: string }[] = [
  { id: 'pharmacie', description: 'Profil et planning' },
  { id: 'admin', description: 'Ville ou zone assignée' },
  { id: 'super_admin', description: 'Plateforme entière' },
]

function MiniLogo() {
  return (
    <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
      <span className="text-sm font-black">+</span>
    </span>
  )
}

interface LoginViewProps {
  db: Database
  onLoggedIn: (session: BackOfficeSession) => void
  onExit: () => void
}

function LoginView({ db, onLoggedIn, onExit }: LoginViewProps) {
  const [tab, setTab] = useState<RoleTab>('pharmacie')
  const [cities, setCities] = useState<City[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [pharmacyEmail, setPharmacyEmail] = useState('')
  const [pharmacyPassword, setPharmacyPassword] = useState('')

  const [adminCity, setAdminCity] = useState('')

  useEffect(() => {
    setCities(getCities(db))
  }, [db])

  async function handleSubmit() {
    setError(null)
    setBusy(true)
    const label =
      tab === 'pharmacie'
        ? 'Pharmacie'
        : tab === 'admin'
          ? adminCity
          : 'Super administrateur'

    let account: UserAccount | null = null
    let session: BackOfficeSession | null = null

    try {
      if (tab === 'pharmacie') {
        const email = pharmacyEmail.trim()
        const password = pharmacyPassword
        if (!email || !password) {
          setError('Saisissez votre email et votre mot de passe.')
          return
        }
        account = await authenticateUser(db, email, password)
        if (!account) {
          setError('Identifiants incorrects : email ou mot de passe inconnu.')
          return
        }
        if (account.role !== 'pharmacie' || account.pharmacyId === null) {
          setError('Ce compte n’est pas un compte pharmacie. Utilisez l’espace Administrateur.')
          return
        }
        if (account.status === 'suspendu') {
          setError('Ce compte a été suspendu par l’administration. Contactez votre administrateur de zone.')
          return
        }
        if (account.status === 'en_attente') {
          setError('Ce compte attend l’activation par l’administration de votre zone.')
          return
        }
        session = {
          role: 'pharmacie',
          label: account.name,
          userId: account.id,
          city: account.city,
          pharmacyId: account.pharmacyId,
        }
      } else if (tab === 'admin') {
        if (!adminCity) {
          setError('Choisissez d’abord votre ville / zone de responsabilité.')
          return
        }
        account = getAdminForCity(db, adminCity)
        if (!account) {
          setError('Aucun compte administrateur actif pour cette ville.')
          return
        }
        session = { role: 'admin', label: account.name, userId: account.id, city: adminCity, pharmacyId: null }
      } else {
        account = getSuperAdmin(db)
        if (!account) {
          setError('Compte super administrateur introuvable.')
          return
        }
        session = { role: 'super_admin', label: account.name, userId: account.id, city: null, pharmacyId: null }
      }

      try {
        logAudit(db, account?.name ?? label, 'login', 'session', session.role)
      } catch {
        // l'audit ne doit pas bloquer la connexion
      }
      onLoggedIn(session)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Connexion impossible.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <MiniLogo />
            <span className="text-base font-bold tracking-tight">
              Back-office&nbsp;<span className="text-emerald-600">PharmaGarde CM</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
          >
            Retour au site
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
          <strong>Mode démonstration locale.</strong> Le pharmacien se connecte avec l’email et le
          mot de passe attribués par l’administration (comptes de démo : mot de passe{' '}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">PharmaGarde2026</code>).
          Les actions sont enregistrées dans votre navigateur (base web SQLite) et journalisées.
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-bold text-slate-900">Connexion professionnelle</h1>
          <p className="mt-1 text-sm text-slate-600">
            Sélectionnez votre rôle. Chaque espace respecte le périmètre et les responsabilités du
            cahier des charges.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {ROLE_TABS.map((rôle) => (
              <button
                key={rôle.id}
                type="button"
                onClick={() => {
                  setTab(rôle.id)
                  setError(null)
                }}
                aria-pressed={tab === rôle.id}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  tab === rôle.id
                    ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100'
                    : 'border-slate-200 hover:border-emerald-300'
                }`}
              >
                <p className="text-sm font-bold text-slate-900">{ROLE_LABELS[rôle.id]}</p>
                <p className="mt-0.5 text-xs text-slate-500">{rôle.description}</p>
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            {tab === 'pharmacie' && (
              <>
                <div>
                  <label htmlFor="bo-email" className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Email du compte pharmacie
                  </label>
                  <input
                    id="bo-email"
                    type="email"
                    autoComplete="email"
                    value={pharmacyEmail}
                    onChange={(event) => setPharmacyEmail(event.target.value)}
                    placeholder="pharmacie@pharmagarde.cm"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    L’email du compte a été attribué par l’administration à la création de la pharmacie.
                  </p>
                </div>
                <div>
                  <label htmlFor="bo-password" className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Mot de passe
                  </label>
                  <input
                    id="bo-password"
                    type="password"
                    autoComplete="current-password"
                    value={pharmacyPassword}
                    onChange={(event) => setPharmacyPassword(event.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </>
            )}

            {tab === 'admin' && (
              <div>
                <label htmlFor="bo-zone" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Ville / zone assignée
                </label>
                <select
                  id="bo-zone"
                  value={adminCity}
                  onChange={(event) => {
                    setAdminCity(event.target.value)
                    setError(null)
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">Choisir votre zone…</option>
                  {cities.map((city) => (
                    <option key={city.name} value={city.name}>
                      {city.name} — {city.region}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {tab === 'super_admin' && (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                Accès complet à la plateforme : toutes les villes, rôles, paramètres, journal
                d’audit et arbitrage des signalements.
              </p>
            )}

            {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy || (tab === 'pharmacie' && (!pharmacyEmail.trim() || !pharmacyPassword))}
              className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {busy ? 'Connexion…' : `Entrer dans « ${ROLE_LABELS[tab]} »`}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {(Object.keys(ROLE_LABELS) as BackOfficeRole[]).map((rôle) => (
            <div key={rôle} className="rounded-xl border border-slate-200 bg-white p-4 text-xs">
              <p className="font-bold text-slate-800">{ROLE_LABELS[rôle]}</p>
              <p className="mt-0.5 font-medium text-emerald-700">Périmètre : {ROLE_PERIMETERS[rôle]}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default function BackOffice({ onExit }: { onExit: () => void }) {
  const [db, setDb] = useState<Database | null>(null)
  const [session, setSession] = useState<BackOfficeSession | null>(null)

  useEffect(() => {
    let cancelled = false
    getDb()
      .then((database) => {
        if (cancelled) return
        setDb(database)
        const raw = localStorage.getItem(BACKOFFICE_SESSION_KEY)
        if (!raw) return
        try {
          const parsed = JSON.parse(raw) as BackOfficeSession
          if (!parsed || typeof parsed.role !== 'string') return
          let account: UserAccount | null = null
          if (parsed.role === 'pharmacie' && parsed.pharmacyId) {
            account = getUserByPharmacy(database, parsed.pharmacyId)
          } else if (parsed.role === 'admin' && parsed.city) {
            account = getAdminForCity(database, parsed.city)
          } else if (parsed.role === 'super_admin') {
            account = getSuperAdmin(database)
          }
          if (account && account.status !== 'suspendu') setSession(parsed)
        } catch {
          localStorage.removeItem(BACKOFFICE_SESSION_KEY)
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  function handleLoggedIn(next: BackOfficeSession) {
    localStorage.setItem(BACKOFFICE_SESSION_KEY, JSON.stringify(next))
    setSession(next)
  }

  function handleLogout() {
    if (db && session) {
      try {
        logAudit(db, session.label, 'logout', 'session', session.role)
      } catch {
        // sans impact
      }
    }
    localStorage.removeItem(BACKOFFICE_SESSION_KEY)
    setSession(null)
  }

  if (!db) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Chargement du back-office…</p>
      </div>
    )
  }

  if (!session) {
    return <LoginView db={db} onLoggedIn={handleLoggedIn} onExit={onExit} />
  }

  if (session.role === 'pharmacie') {
    if (session.pharmacyId === null) {
      return <LoginView db={db} onLoggedIn={handleLoggedIn} onExit={onExit} />
    }
    return (
      <PharmacySpace
        pharmacyId={session.pharmacyId}
        onLogout={handleLogout}
        onExit={onExit}
      />
    )
  }

  return (
    <AdminSpace
      db={db}
      role={session.role}
      userId={session.userId}
      label={session.label}
      city={session.city}
      onLogout={handleLogout}
      onExit={onExit}
    />
  )
}