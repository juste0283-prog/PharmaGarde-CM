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
import { NavIcon } from './BackOfficeShell'
import ThemeToggle from './ThemeToggle'

type RoleTab = BackOfficeRole

const ROLE_TABS: { id: RoleTab; description: string }[] = [
  { id: 'pharmacie', description: 'Profil et planning' },
  { id: 'admin', description: 'Ville ou zone assignée' },
  { id: 'super_admin', description: 'Plateforme entière' },
]

const ROLE_ICONS: Record<RoleTab, string> = {
  pharmacie: 'building',
  admin: 'pin',
  super_admin: 'shield',
}

function MiniLogo() {
  return (
    <span className="grid size-9 place-items-center overflow-hidden rounded-xl bg-white p-1 shadow-md">
      <img src="/logo.png" alt="Logo PharmaGarde CM" className="size-6 object-contain" />
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 12%, rgba(255,255,255,0.22) 0, transparent 30%), radial-gradient(circle at 85% 72%, rgba(16,185,129,0.4) 0, transparent 42%), radial-gradient(circle at 60% 90%, rgba(45,212,191,0.25) 0, transparent 36%)',
        }}
        aria-hidden="true"
      />
      <header className="relative z-10 border-b border-white/10 bg-white/5 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <MiniLogo />
            <span className="text-base font-bold tracking-tight">
              Back-office&nbsp;<span className="text-emerald-300">PharmaGarde CM</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="text-white ring-1 ring-white/20 hover:bg-white/10 dark:text-white dark:hover:bg-white/10" />
            <button
              type="button"
              onClick={onExit}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 transition-all duration-200 hover:bg-white/20"
            >
              Retour au site
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="pg-animate-rise">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium ring-1 ring-white/20">
              <span className="pg-animate-pulse-dot size-2 rounded-full bg-emerald-300" aria-hidden="true" />
              Espace professionnel sécurisé
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Pilotez les pharmacies de garde du Cameroun
            </h1>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-emerald-50/85">
              Authentifiez-vous avec votre nom d’utilisateur et votre mot de passe. Chaque espace
              respecte le périmètre et les responsabilités du cahier des charges.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-emerald-50/90">
              {[
                'Accès par nom d’utilisateur unique + mot de passe pour chaque compte',
                'Rôles, zones et permissions appliqués à la donnée et aux actions',
                'Toutes les actions sensibles tracées dans le journal d’audit',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-300/30">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-3.5"
                      aria-hidden="true"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pg-animate-rise" style={{ animationDelay: '0.12s' }}>
            <div className="rounded-3xl bg-white p-6 text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-slate-100 sm:p-8">
              <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
                {ROLE_TABS.map((rôle) => (
                  <button
                    key={rôle.id}
                    type="button"
                    onClick={() => {
                      setTab(rôle.id)
                      setError(null)
                    }}
                    aria-pressed={tab === rôle.id}
                    className={`flex flex-col items-center gap-1 rounded-xl px-1.5 py-2.5 transition-all duration-200 ${
                      tab === rôle.id
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/25'
                        : 'text-slate-600 hover:bg-white hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    <NavIcon name={ROLE_ICONS[rôle.id]} />
                    <span className="text-xs font-bold leading-none">{ROLE_LABELS[rôle.id]}</span>
                    <span className={`text-[10px] font-medium leading-none ${tab === rôle.id ? 'text-white/80' : 'text-slate-400 dark:text-slate-400'}`}>
                      {rôle.description}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <label htmlFor="bo-username" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Nom d’utilisateur
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <NavIcon name="user" />
                    </span>
                    <input
                      id="bo-username"
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder={tab === 'super_admin' ? 'pharmasuperadmin' : tab === 'admin' ? 'admin.yaounde' : 'votre nom d’utilisateur'}
                      className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-500"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    {tab === 'super_admin'
                      ? `Compte réservé : nom d’utilisateur ${SUPER_ADMIN_USERNAME}.`
                      : tab === 'admin'
                        ? 'Nom d’utilisateur attribué par le super administrateur (ex. admin.yaounde).'
                        : 'Le nom d’utilisateur du compte a été attribué à la création de la pharmacie.'}
                  </p>
                </div>
                <div>
                  <label htmlFor="bo-password" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <NavIcon name="lock" />
                    </span>
                    <input
                      id="bo-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') handleSubmit()
                      }}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-500"
                    />
                  </div>
                </div>

                {error && (
                  <p className="pg-animate-rise flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-100 dark:bg-rose-950 dark:text-rose-200 dark:ring-rose-900">
                    <span className="mt-0.5 shrink-0 text-rose-500">
                      <NavIcon name="flag" />
                    </span>
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={busy || !username.trim() || !password}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition-all duration-200 hover:-translate-y-px hover:from-emerald-700 hover:to-teal-700 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-100 disabled:shadow-none"
                >
                  {busy ? 'Connexion…' : `Entrer dans « ${ROLE_LABELS[tab]} »`}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14m-6-6 6 6-6 6" />
                  </svg>
                </button>

                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950/70 dark:text-amber-200">
                  <strong>Mode démonstration locale.</strong> Les actions sont enregistrées dans votre
                  navigateur (base SQLite) et journalisées. Comptes de démo : mot de passe{' '}
                  <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[11px] dark:bg-amber-900/80 dark:text-amber-100">PharmaGarde2026</code>{' '}
                  (admin & pharmacies) ; super administrateur{' '}
                  <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[11px] dark:bg-amber-900/80 dark:text-amber-100">pharmasuperadmin</code>{' '}
                  /{' '}
                  <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[11px] dark:bg-amber-900/80 dark:text-amber-100">pharmaadmin@2026</code>.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                Périmètres des espaces
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {(Object.keys(ROLE_LABELS) as BackOfficeRole[]).map((rôle) => (
                  <div key={rôle} className="flex items-start gap-2 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                    <span className="mt-0.5 shrink-0 text-emerald-200">
                      <NavIcon name={ROLE_ICONS[rôle]} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold">{ROLE_LABELS[rôle]}</p>
                      <p className="text-[11px] leading-snug text-emerald-50/75">{ROLE_PERIMETERS[rôle]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-sm text-slate-500 dark:text-slate-400">Chargement du back-office…</p>
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