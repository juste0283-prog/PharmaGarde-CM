import { useEffect, useState } from 'react'
import type { Database } from 'sql.js'
import { BACKOFFICE_SESSION_KEY, getDb } from '../db/database'
import {
  getAdminForCity,
  getCities,
  getPharmacies,
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
  type Pharmacy,
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

  const [pharmacyCity, setPharmacyCity] = useState('')
  const [pharmacyOptions, setPharmacyOptions] = useState<Pharmacy[]>([])
  const [pharmacyId, setPharmacyId] = useState<number | null>(null)

  const [adminCity, setAdminCity] = useState('')

  useEffect(() => {
    setCities(getCities(db))
  }, [db])

  function handlePharmacyCity(nextCity: string) {
    setPharmacyCity(nextCity)
    setPharmacyId(null)
    if (nextCity) setPharmacyOptions(getPharmacies(db, nextCity, null).slice(0, 300))
    else setPharmacyOptions([])
  }

  function handleSubmit() {
    setError(null)
    const label =
      tab === 'pharmacie'
        ? pharmacyOptions.find((p) => p.id === pharmacyId)?.name ?? 'Pharmacie'
        : tab === 'admin'
          ? adminCity
          : 'Super administrateur'

    let account: UserAccount | null = null
    let session: BackOfficeSession | null = null

    if (tab === 'pharmacie') {
      if (pharmacyId === null) {
        setError('Choisissez d’abord votre pharmacie.')
        return
      }
      account = getUserByPharmacy(db, pharmacyId)
      if (!account) {
        setError('Aucun compte professionnel trouvé pour cette pharmacie.')
        return
      }
      if (account.status === 'suspendu') {
        setError('Ce compte a été suspendu par l’administration. Contactez votre administrateur de zone.')
        return
      }
      session = {
        role: 'pharmacie',
        label: account.name,
        userId: account.id,
        city: account.city,
        pharmacyId,
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
          <strong>Mode démonstration locale.</strong> La vérification par mot de passe arrivera avec
          l’API Node.js. Choisissez simplement votre profil ; les actions sont enregistrées dans
          votre navigateur (base web SQLite) et journalisées dans le journal d’audit.
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
                  <label htmlFor="bo-ville" className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Ville
                  </label>
                  <select
                    id="bo-ville"
                    value={pharmacyCity}
                    onChange={(event) => handlePharmacyCity(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="">Choisir une ville…</option>
                    {cities.map((city) => (
                      <option key={city.name} value={city.name}>
                        {city.name} — {city.region}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="bo-pharmacie" className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Pharmacie
                  </label>
                  <select
                    id="bo-pharmacie"
                    value={pharmacyId ?? ''}
                    onChange={(event) => setPharmacyId(event.target.value ? Number(event.target.value) : null)}
                    disabled={!pharmacyCity}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">
                      {pharmacyCity ? 'Choisir une pharmacie…' : 'Choisissez d’abord une ville'}
                    </option>
                    {pharmacyOptions.map((pharmacy) => (
                      <option key={pharmacy.id} value={pharmacy.id}>
                        {pharmacy.name} — {pharmacy.quartier}
                      </option>
                    ))}
                  </select>
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
              disabled={tab === 'pharmacie' && pharmacyId === null}
              className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Entrer dans « {ROLE_LABELS[tab]} »
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