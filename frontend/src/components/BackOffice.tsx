import { useEffect, useState } from 'react'
import type { Database } from 'sql.js'
import { BACKOFFICE_SESSION_KEY, getDb } from '../db/database'
import {
  authenticateUser,
  getAdminForCity,
  getSuperAdmin,
  getUserByPharmacy,
  logAudit,
} from '../db/queries'
import { SUPER_ADMIN_USERNAME } from '../db/passwords'
import {
  ROLE_LABELS,
  ROLE_PERIMETERS,
  type BackOfficeRole,
  type BackOfficeSession,
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
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const fieldClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100'

  async function handleSubmit() {
    setError(null)
    const name = username.trim()
    if (!name || !password) {
      setError('Saisissez votre nom d’utilisateur et votre mot de passe.')
      return
    }
    setBusy(true)
    try {
      const account = await authenticateUser(db, name, password)
      if (!account) {
        setError('Identifiants incorrects : nom d’utilisateur ou mot de passe inconnu.')
        return
      }

      let session: BackOfficeSession | null = null
      if (tab === 'pharmacie') {
        if (account.role !== 'pharmacie' || account.pharmacyId === null) {
          setError('Ce compte n’est pas un compte pharmacie. Utilisez l’onglet Administrateur.')
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
        if (account.role !== 'admin') {
          setError('Ce compte n’est pas un compte administrateur. Utilisez un autre onglet.')
          return
        }
        if (!account.city) {
          setError('Ce compte administrateur n’est rattaché à aucune ville / zone.')
          return
        }
        session = { role: 'admin', label: account.name, userId: account.id, city: account.city, pharmacyId: null }
      } else {
        if (account.role !== 'super_admin') {
          setError('Ce compte n’est pas le super administrateur. Utilisez un autre onglet.')
          return
        }
        session = { role: 'super_admin', label: account.name, userId: account.id, city: null, pharmacyId: null }
      }

      try {
        logAudit(db, account.name, 'login', 'session', session.role)
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
          <strong>Mode démonstration locale.</strong> Chaque compte se connecte avec son{' '}
          <em>nom d’utilisateur</em> et son <em>mot de passe</em>. Comptes de démo : mot de passe{' '}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">PharmaGarde2026</code>{' '}
          pour les administrateurs et les pharmacies ; le super administrateur utilise{' '}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
            pharmasuperadmin
          </code>{' '}
          /{' '}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
            pharmaadmin@2026
          </code>
          . Les actions sont enregistrées dans votre navigateur (base web SQLite) et journalisées.
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-bold text-slate-900">Connexion professionnelle</h1>
          <p className="mt-1 text-sm text-slate-600">
            Sélectionnez votre rôle, puis authentifiez-vous avec votre nom d’utilisateur et votre mot
            de passe. Chaque espace respecte le périmètre et les responsabilités du cahier des
            charges.
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
            <div>
              <label htmlFor="bo-username" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Nom d’utilisateur
              </label>
              <input
                id="bo-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={tab === 'super_admin' ? 'pharmasuperadmin' : tab === 'admin' ? 'admin.yaounde' : 'votre nom d’utilisateur'}
                className={fieldClass}
              />
              <p className="mt-1 text-xs text-slate-500">
                {tab === 'super_admin'
                  ? `Compte réservé : nom d’utilisateur ${SUPER_ADMIN_USERNAME}.`
                  : tab === 'admin'
                    ? 'Nom d’utilisateur attribué par le super administrateur (ex. admin.yaounde).'
                    : 'Le nom d’utilisateur du compte a été attribué à la création de la pharmacie.'}
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
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className={fieldClass}
              />
            </div>

            {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy || !username.trim() || !password}
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