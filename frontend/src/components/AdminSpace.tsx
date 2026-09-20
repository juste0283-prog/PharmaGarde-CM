import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Database } from 'sql.js'
import {
  createPharmacy,
  createUser,
  getAdminPharmacies,
  getAdminReports,
  getAdminSchedules,
  getAdminStats,
  getAuditLogs,
  getCities,
  getQuartiers,
  getUsers,
  setAccountStatus,
  setPharmacyVerified,
  setReportStatusAdmin,
  setScheduleStatus,
  updatePharmacyFull,
  updateUserRole,
} from '../db/queries'
import { DEMO_PASSWORD } from '../db/passwords'
import {
  ACCOUNT_STATUS_LABELS,
  ACTION_LABELS,
  REPORT_TYPE_LABELS,
  REPORT_STATUS_LABELS,
  ROLE_LABELS,
  ROLE_PERIMETERS,
  WEEKDAYS,
  type AdminPharmacy,
  type AdminReport,
  type AdminSchedule,
  type AdminStats,
  type AuditEntry,
  type BackOfficeRole,
  type City,
  type NewPharmacyInput,
  type UserAccount,
} from '../data/pharmacies'
import BackOfficeShell, {
  NoticeBanner,
  Panel,
  SectionTitle,
  StatCard,
  NavIcon,
  type ShellNavItem,
} from './BackOfficeShell'

type TabId = 'dashboard' | 'pharmacies' | 'reports' | 'schedules' | 'users' | 'audit' | 'settings'

interface AdminData {
  cities: City[]
  stats: AdminStats | null
  pharmacies: AdminPharmacy[]
  reports: AdminReport[]
  schedules: AdminSchedule[]
  users: UserAccount[]
  audit: AuditEntry[]
}

function formatDateTime(iso: string): string {
  const date = new Date(iso)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${date.getFullYear()} à ${hours}h${minutes}`
}

function formatHour(hhmm: string): string {
  return String(parseInt(hhmm, 10))
}

function statBadge(status: string): string {
  switch (status) {
    case 'confirme':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
    case 'resolu':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
    case 'rejete':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
    case 'en_verification':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
    default:
      return 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200'
  }
}

export default function AdminSpace({
  db,
  role,
  label,
  city,
  onLogout,
  onExit,
}: {
  db: Database
  role: 'admin' | 'super_admin'
  userId: number
  label: string
  city: string | null
  onLogout: () => void
  onExit: () => void
}) {
  const isSuper = role === 'super_admin'
  const [scope, setScope] = useState<string | null>(city)
  const [tab, setTab] = useState<TabId>('dashboard')
  const [data, setData] = useState<AdminData>({
    cities: [],
    stats: null,
    pharmacies: [],
    reports: [],
    schedules: [],
    users: [],
    audit: [],
  })
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reportFilter, setReportFilter] = useState('')
  const [newAccount, setNewAccount] = useState({
    name: '',
    email: '',
    role: 'admin' as BackOfficeRole,
    city: '',
    password: '',
  })

  const [showCreate, setShowCreate] = useState(false)
  const [newPharmacy, setNewPharmacy] = useState<NewPharmacyInput>({
    name: '',
    city: city ?? '',
    quartier: '',
    address: '',
    phone: '',
    latitude: 0,
    longitude: 0,
    verified: isSuper,
    email: '',
    password: '',
  })
  const [newRegion, setNewRegion] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<{
    name: string
    quartier: string
    address: string
    phone: string
    latitude: string
    longitude: string
  }>({ name: '', quartier: '', address: '', phone: '', latitude: '', longitude: '' })

  const fieldClass =
    'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-violet-500/20'

  const existingQuartiers = useMemo(
    () => getQuartiers(db, showCreate ? newPharmacy.city : (city ?? '')),
    [db, showCreate, newPharmacy.city, city],
  )

  const regions = useMemo(
    () => Array.from(new Set(data.cities.map((item) => item.region))).sort(),
    [data.cities],
  )

  const selectedRegion = isSuper
    ? newRegion
    : data.cities.find((item) => item.name === newPharmacy.city)?.region ?? ''

  const regionCities = useMemo(
    () => data.cities.filter((item) => item.region === selectedRegion),
    [data.cities, selectedRegion],
  )

  function pickCityCoordinates(nextCity: string) {
    const c = data.cities.find((item) => item.name === nextCity)
    if (!c) return
    setNewPharmacy((prev) => ({ ...prev, city: nextCity, quartier: '', latitude: c.lat, longitude: c.lng }))
  }

  const load = useCallback(() => {
    const nextScope = isSuper ? scope : city
    try {
      setData({
        cities: getCities(db),
        stats: getAdminStats(db, nextScope),
        pharmacies: getAdminPharmacies(db, nextScope),
        reports: getAdminReports(db, nextScope, reportFilter || undefined),
        schedules: getAdminSchedules(db, nextScope),
        users: isSuper ? getUsers(db) : [],
        audit: isSuper ? getAuditLogs(db, 80) : [],
      })
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erreur de chargement des données.')
    }
  }, [db, isSuper, scope, city, reportFilter])

  useEffect(() => {
    load()
  }, [load])

  async function run(actionLabel: string, action: () => void | Promise<void>) {
    try {
      await action()
      setNotice(actionLabel)
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "L'action a échoué.")
    }
  }

  async function handleCreateAccount() {
    if (newAccount.name.trim() === '' || newAccount.email.trim() === '') {
      setError('Nom et email sont obligatoires.')
      return
    }
    const password = newAccount.password ?? ''
    if (password && password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    try {
      const account = await createUser(
        db,
        {
          name: newAccount.name.trim(),
          email: newAccount.email.trim(),
          role: newAccount.role,
          city: newAccount.city || null,
          password: password || undefined,
        },
        label,
      )
      setNewAccount({ name: '', email: '', role: 'admin', city: '', password: '' })
      setNotice(
        password
          ? `Compte créé : nom d’utilisateur ${account?.username ?? '—'} / mot de passe choisi.`
          : `Compte créé : nom d’utilisateur ${account?.username ?? '—'} / mot de passe par défaut (${DEMO_PASSWORD}).`,
      )
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La création du compte a échoué.')
    }
  }

  async function handleCreatePharmacy() {
    if (!newPharmacy.name.trim() || !newPharmacy.quartier.trim() || !newPharmacy.phone.trim()) {
      setError('Nom, quartier et téléphone sont obligatoires pour créer une pharmacie.')
      return
    }
    if (!newPharmacy.city) {
      setError('La région et la ville sont obligatoires : choisissez la région, puis la ville.')
      return
    }
    const email = newPharmacy.email?.trim() ?? ''
    const password = newPharmacy.password ?? ''
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Adresse email invalide pour le compte de la pharmacie.')
      return
    }
    if (password && password.length < 8) {
      setError('Le mot de passe du compte doit contenir au moins 8 caractères.')
      return
    }
    const result = await createPharmacy(db, newPharmacy, label)
    if (!result.ok) {
      setError(result.error ?? 'Création impossible.')
      return
    }
    const resetCity = city ?? ''
    setNewPharmacy({
      name: '',
      city: resetCity,
      quartier: '',
      address: '',
      phone: '',
      latitude: 0,
      longitude: 0,
      verified: isSuper,
      email: '',
      password: '',
    })
    setNewRegion(isSuper ? '' : selectedRegion)
    setShowCreate(false)
    setNotice(
      `Pharmacie créée dans le quartier ${newPharmacy.quartier} (${newPharmacy.city} — ${selectedRegion}), ` +
        `planning initialisé. Identifiants du compte : nom d’utilisateur ${result.accountUsername ?? '—'} / ` +
        `${result.accountPassword ? 'mot de passe saisi' : `mot de passe par défaut (${DEMO_PASSWORD})`}. ` +
        'Le pharmacien se connecte avec ces identifiants depuis « Connexion professionnelle ».',
    )
    load()
  }

  function startEdit(pharmacy: AdminPharmacy) {
    setEditingId(pharmacy.id)
    setEditDraft({
      name: pharmacy.name,
      quartier: pharmacy.quartier,
      address: pharmacy.address,
      phone: pharmacy.phone,
      latitude: String(pharmacy.latitude),
      longitude: String(pharmacy.longitude),
    })
  }

  function handleSaveEdit(pharmacyId: number) {
    const lat = Number(editDraft.latitude)
    const lng = Number(editDraft.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError('Coordonnées invalides pour la mise à jour de la fiche.')
      return
    }
    updatePharmacyFull(
      db,
      pharmacyId,
      {
        name: editDraft.name,
        quartier: editDraft.quartier,
        address: editDraft.address,
        phone: editDraft.phone,
        latitude: lat,
        longitude: lng,
      },
      label,
    )
    setEditingId(null)
    setNotice('Fiche de pharmacie mise à jour (coordonnées GPS, quartier, contact).')
    load()
  }

  const accent = isSuper ? 'violet' : 'indigo'

  const primaryGrad =
    accent === 'violet'
      ? 'from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700'
      : 'from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700'

  const nav: ShellNavItem[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: 'grid' },
    { id: 'pharmacies', label: 'Pharmacies & comptes', icon: 'building' },
    { id: 'reports', label: 'Signalements', icon: 'flag' },
    { id: 'schedules', label: 'Planning des gardes', icon: 'calendar' },
    ...(isSuper
      ? [
          { id: 'users' as TabId, label: 'Utilisateurs & rôles', icon: 'users' },
          { id: 'audit' as TabId, label: "Journal d'audit", icon: 'list' },
          { id: 'settings' as TabId, label: 'Paramètres & sécurité', icon: 'gear' },
        ]
      : []),
  ]

  const groupedSchedules = useMemo(() => {
    const groups: AdminSchedule[][] = []
    for (const schedule of data.schedules) {
      const last = groups[groups.length - 1]
      if (last && last[0].pharmacyId === schedule.pharmacyId) last.push(schedule)
      else groups.push([schedule])
    }
    return groups
  }, [data.schedules])

  const stats = data.stats

  const scopeChip = isSuper ? (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Périmètre :</span>
      <select
        value={scope ?? ''}
        onChange={(event) => setScope(event.target.value || null)}
        aria-label="Changer de zone"
        className={`rounded-lg border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-violet-500/20`}
      >
        <option value="">Toutes les villes</option>
        {data.cities.map((c) => (
          <option key={c.name} value={c.name}>
            {c.name} — {c.region}
          </option>
        ))}
      </select>
    </div>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">
      <span className="size-1.5 rounded-full bg-current" />
      Zone assignée : {city}
    </span>
  )

  return (
    <BackOfficeShell
      accent={accent}
      brand={isSuper ? 'Espace Super administrateur' : 'Espace Administrateur'}
      roleLabel={ROLE_LABELS[role]}
      scopeLabel={isSuper ? (scope ? scope : 'Plateforme entière') : `${city} — zone assignée`}
      userLabel={label}
      nav={nav}
      active={tab}
      onNavigate={(id) => setTab(id as TabId)}
      onLogout={onLogout}
      onExit={onExit}
    >
      {notice && <NoticeBanner kind="success">{notice}</NoticeBanner>}
      {error && <NoticeBanner kind="error">{error}</NoticeBanner>}

      {tab === 'dashboard' && (
        <div className="space-y-6">
          <SectionTitle
            title="Supervision"
            subtitle={`Pilotage ${isSuper ? 'de la plateforme entière' : `de votre zone (${city})`}.`}
            icon={<NavIcon name="grid" />}
            accent={accent}
            chip={scopeChip}
          />
          {stats && (
            <div className="pg-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="Villes & zones" value={`${stats.cities}`} note={isSuper ? 'les 10 chefs-lieux' : 'votre zone assignée'} icon={<NavIcon name="pin" />} accent={accent} />
              <StatCard label="Pharmacies" value={`${stats.pharmacies}`} note={`${stats.validated} validées`} icon={<NavIcon name="building" />} accent={accent} />
              <StatCard label="Comptes en attente" value={`${stats.pendingPharmacies}`} note="à valider" icon={<NavIcon name="users" />} accent={accent} />
              <StatCard label="Signalements ouverts" value={`${stats.openReports}`} note="à modérer" icon={<NavIcon name="flag" />} accent={accent} />
              <StatCard label="Confirmations (24 h)" value={`${stats.confirmations24h}`} note="gardes confirmées" icon={<NavIcon name="clipboard" />} accent={accent} />
              <StatCard label="Gardes programmées" value={`${stats.activeSchedules}`} note="créneaux publiés" icon={<NavIcon name="calendar" />} accent={accent} />
            </div>
          )}
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title={`Responsabilités — ${ROLE_LABELS[role]}`} icon={<NavIcon name="shield" />} accent={accent}>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-600 dark:text-slate-300">
                {isSuper ? (
                  <>
                    <li>Gestion complète : rôles, paramètres, sécurité, audit, arbitrage sur toutes les villes.</li>
                    <li>Validation et supervision des administrateurs de zone.</li>
                    <li>Arbitrage des signalements et des litiges entre zones.</li>
                  </>
                ) : (
                  <>
                    <li>Valider les pharmacies et les comptes professionnels de votre zone.</li>
                    <li>Programmer et valider les gardes (planning hebdomadaire).</li>
                    <li>Modérer les signalements et suivre les statistiques.</li>
                  </>
                )}
              </ul>
            </Panel>
            <Panel title="Dernières traces d’audit" icon={<NavIcon name="list" />} accent={accent}>
              {data.audit.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {isSuper
                    ? 'Le journal d’audit est vide pour l’instant.'
                    : 'Consultation du journal réservée au super administrateur.'}
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.audit.slice(0, 6).map((entry) => (
                    <li key={entry.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50/60 px-3 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800">
                      <span className="text-slate-700 dark:text-slate-300">
                        <strong>{entry.actor}</strong> — {ACTION_LABELS[entry.action] ?? entry.action}{' '}
                        <span className="text-slate-400 dark:text-slate-500">({entry.resource})</span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{formatDateTime(entry.timestamp)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}

      {tab === 'pharmacies' && (
        <div className="space-y-5">
          <SectionTitle
            title="Validation des pharmacies & comptes"
            subtitle={`${data.pharmacies.length} pharmacies — création et mise à jour par la supervision : région, quartier et coordonnées GPS inclus.`}
            icon={<NavIcon name="building" />}
            accent={accent}
            chip={
              <span className="flex flex-wrap items-center gap-2">
                {scopeChip}
                <button
                  type="button"
                  onClick={() => setShowCreate((value) => !value)}
                  className={`rounded-xl bg-gradient-to-r ${primaryGrad} px-3.5 py-2 text-sm font-semibold text-white shadow-md shadow-black/10 transition-all duration-200 hover:-translate-y-px`}
                >
                  {showCreate ? 'Annuler' : '+ Créer une pharmacie'}
                </button>
              </span>
            }
          />
          {showCreate && (
            <div className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm dark:border-violet-900 dark:bg-slate-900">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Nouvelle pharmacie</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                La région et le quartier (choisi parmi ceux de la ville) localisent la pharmacie ; les
                coordonnées GPS la placent sur la carte. Un nom d’utilisateur est généré
                automatiquement ; l’email et le mot de passe complètent les identifiants de connexion
                du pharmacien.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Nom *</span>
                  <input
                    id="np-name"
                    value={newPharmacy.name}
                    onChange={(event) => setNewPharmacy((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Pharmacie du Marché"
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Région *</span>
                  <select
                    id="np-region"
                    value={selectedRegion}
                    onChange={(event) => {
                      const next = event.target.value
                      setNewRegion(next)
                      setNewPharmacy((prev) => ({ ...prev, city: '', quartier: '', latitude: 0, longitude: 0 }))
                    }}
                    disabled={!isSuper}
                    className={`${fieldClass} disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800`}
                  >
                    {!isSuper ? (
                      <option value={selectedRegion}>{selectedRegion || 'Région de la zone assignée'}</option>
                    ) : (
                      <>
                        <option value="">Choisir une région…</option>
                        {regions.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Ville *</span>
                  <select
                    id="np-city"
                    value={newPharmacy.city}
                    onChange={(event) => pickCityCoordinates(event.target.value)}
                    disabled={!isSuper || !selectedRegion}
                    className={`${fieldClass} disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800`}
                  >
                    {!isSuper ? (
                      <option value={newPharmacy.city}>{newPharmacy.city}</option>
                    ) : (
                      <>
                        <option value="">
                          {selectedRegion ? 'Choisir une ville…' : 'Choisissez d’abord une région'}
                        </option>
                        {regionCities.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Quartier *</span>
                  <select
                    id="np-quartier"
                    value={newPharmacy.quartier}
                    onChange={(event) => setNewPharmacy((prev) => ({ ...prev, quartier: event.target.value }))}
                    disabled={!newPharmacy.city}
                    className={`${fieldClass} disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800`}
                  >
                    <option value="">
                      {newPharmacy.city ? 'Choisir un quartier…' : 'Choisissez d’abord une ville'}
                    </option>
                    {existingQuartiers.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Téléphone *</span>
                  <input
                    id="np-phone"
                    value={newPharmacy.phone}
                    onChange={(event) => setNewPharmacy((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="6XX XX XX XX"
                    className={fieldClass}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Adresse</span>
                  <input
                    id="np-address"
                    value={newPharmacy.address}
                    onChange={(event) => setNewPharmacy((prev) => ({ ...prev, address: event.target.value }))}
                    placeholder="Rue du Marché, à côté de la Mairie"
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Email du compte</span>
                  <input
                    id="np-email"
                    type="email"
                    value={newPharmacy.email ?? ''}
                    onChange={(event) => setNewPharmacy((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="pharma@exemple.cm (automatique si vide)"
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Mot de passe</span>
                  <input
                    id="np-password"
                    type="password"
                    value={newPharmacy.password ?? ''}
                    onChange={(event) => setNewPharmacy((prev) => ({ ...prev, password: event.target.value }))}
                    placeholder="8 caractères min."
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Latitude</span>
                  <input
                    id="np-lat"
                    type="number"
                    step="any"
                    value={newPharmacy.latitude}
                    onChange={(event) =>
                      setNewPharmacy((prev) => ({ ...prev, latitude: Number(event.target.value) }))
                    }
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Longitude</span>
                  <input
                    id="np-lng"
                    type="number"
                    step="any"
                    value={newPharmacy.longitude}
                    onChange={(event) =>
                      setNewPharmacy((prev) => ({ ...prev, longitude: Number(event.target.value) }))
                    }
                    className={fieldClass}
                  />
                </label>
              </div>
              {isSuper && (
                <label className="mt-3 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    id="np-verified"
                    type="checkbox"
                    checked={newPharmacy.verified}
                    onChange={(event) =>
                      setNewPharmacy((prev) => ({ ...prev, verified: event.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  Vérifiée immédiatement (compte activé dès la création)
                </label>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleCreatePharmacy}
                  className={`rounded-xl bg-gradient-to-r ${primaryGrad} px-4 py-2 text-sm font-semibold text-white shadow-md shadow-black/10 transition-all duration-200 hover:-translate-y-px`}
                >
                  Créer la pharmacie
                </button>
              </div>
            </div>
          )}
          {data.pharmacies.length === 0 && !showCreate && (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              Aucune pharmacie dans ce périmètre.
            </p>
          )}
          <div className="space-y-3">
            {data.pharmacies.map((pharmacy) => {
              const needsValidation = !pharmacy.verified || pharmacy.accountStatus === 'en_attente'
              return (
                <div
                  key={pharmacy.id}
                  className={`rounded-2xl border bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 dark:bg-slate-900 dark:hover:shadow-slate-900/60 ${needsValidation ? 'border-amber-300 dark:border-amber-900' : 'border-slate-200 dark:border-slate-800'}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900 dark:text-slate-100">{pharmacy.name}</p>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${pharmacy.verified ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'}`}>
                          {pharmacy.verified ? 'Validée' : 'En attente de validation'}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${pharmacy.accountStatus === 'actif' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' : pharmacy.accountStatus === 'suspendu' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'}`}>
                          {ACCOUNT_STATUS_LABELS[pharmacy.accountStatus]}
                        </span>
                        <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-200">
                          Quartier {pharmacy.quartier}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {pharmacy.city} ({pharmacy.region}) · {pharmacy.address || 'Adresse à préciser'} ·{' '}
                        {pharmacy.phone} · Source : {pharmacy.source}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-slate-400 dark:text-slate-500">
                        {pharmacy.latitude.toFixed(5)}, {pharmacy.longitude.toFixed(5)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {editingId === pharmacy.id ? (
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Annuler
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(pharmacy)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Modifier la fiche
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => run('Pharmacie validée (profil + compte).', () => {
                          setPharmacyVerified(db, pharmacy.id, true, label)
                          if (pharmacy.accountId) setAccountStatus(db, pharmacy.accountId, 'actif', label)
                        })}
                        disabled={!needsValidation}
                        className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-emerald-600/20 transition-all duration-200 hover:from-emerald-700 hover:to-teal-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:from-slate-200 disabled:to-slate-200 dark:disabled:from-slate-700 dark:disabled:to-slate-700 dark:disabled:text-slate-400 dark:disabled:shadow-none"
                      >
                        Valider
                      </button>
                      <button
                        type="button"
                        onClick={() => run('Pharmacie suspendue.', () => {
                          if (pharmacy.accountId) setAccountStatus(db, pharmacy.accountId, 'suspendu', label)
                        })}
                        disabled={pharmacy.accountStatus === 'suspendu'}
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/50 dark:disabled:border-slate-700 dark:disabled:text-slate-500"
                      >
                        Suspendre
                      </button>
                    </div>
                  </div>
                  {editingId === pharmacy.id && (
                    <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/40 p-4 dark:border-violet-900 dark:bg-violet-950/30">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Modifier la fiche (nom, quartier, adresse, téléphone, GPS)</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="block">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Nom</span>
                          <input
                            aria-label="Nom de la pharmacie (édition)"
                            value={editDraft.name}
                            onChange={(event) => setEditDraft((prev) => ({ ...prev, name: event.target.value }))}
                            className={fieldClass}
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Quartier</span>
                          <input
                            aria-label="Quartier de la pharmacie (édition)"
                            value={editDraft.quartier}
                            onChange={(event) => setEditDraft((prev) => ({ ...prev, quartier: event.target.value }))}
                            className={fieldClass}
                          />
                        </label>
                        <label className="block sm:col-span-2">
<span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Adresse</span>
                          <input
                            aria-label="Adresse de la pharmacie (édition)"
                            value={editDraft.address}
                            onChange={(event) => setEditDraft((prev) => ({ ...prev, address: event.target.value }))}
                            className={fieldClass}
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Téléphone</span>
                          <input
                            aria-label="Téléphone de la pharmacie (édition)"
                            value={editDraft.phone}
                            onChange={(event) => setEditDraft((prev) => ({ ...prev, phone: event.target.value }))}
                            className={fieldClass}
                          />
                        </label>
                        <label className="block">
<span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Latitude</span>
                          <input
                            id="ep-lat"
                            type="number"
                            step="any"
                            value={editDraft.latitude}
                            onChange={(event) => setEditDraft((prev) => ({ ...prev, latitude: event.target.value }))}
                            className={fieldClass}
                          />
                        </label>
                        <label className="block">
<span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Longitude</span>
                          <input
                            id="ep-lng"
                            type="number"
                            step="any"
                            value={editDraft.longitude}
                            onChange={(event) => setEditDraft((prev) => ({ ...prev, longitude: event.target.value }))}
                            className={fieldClass}
                          />
                        </label>
                      </div>
                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Fermer
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(pharmacy.id)}
                          className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-700"
                        >
                          Enregistrer la fiche
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-5">
          <SectionTitle
            title="Modération des signalements"
            subtitle="Classifier, vérifier, confirmer ou rejeter. Tout traitement est journalisé."
            icon={<NavIcon name="flag" />}
            accent={accent}
            chip={
              <select
                value={reportFilter}
                onChange={(event) => setReportFilter(event.target.value)}
                aria-label="Filtrer par statut"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-violet-500/20"
              >
                <option value="">Tous les statuts</option>
                {Object.entries(REPORT_STATUS_LABELS).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            }
          />
          <div className="space-y-4">
            {data.reports.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                Aucun signalement dans ce périmètre / filtre.
              </p>
            )}
            {data.reports.map((report) => (
              <div key={report.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-slate-900/60">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900 dark:text-slate-100">{report.pharmacyName}</p>
                    <span className="text-xs text-slate-400 dark:text-slate-500">· {report.city}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">· {REPORT_TYPE_LABELS[report.type] ?? report.type}</span>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statBadge(report.status)}`}>
                    {REPORT_STATUS_LABELS[report.status] ?? report.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{report.description}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {report.author} · {formatDateTime(report.createdAt)}
                </p>
                {report.response && (
                  <p className="mt-2 rounded-lg bg-slate-50 p-3 text-xs italic text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                    Réponse : {report.response}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    id={`report-status-${report.id}`}
                    defaultValue={report.status}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:focus:ring-violet-500/20"
                  >
                    {Object.entries(REPORT_STATUS_LABELS).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => run('Statut du signalement mis à jour.', () => {
                      const select = document.getElementById(`report-status-${report.id}`) as HTMLSelectElement | null
                      const next = select?.value ?? report.status
                      setReportStatusAdmin(db, report.id, next, null, label)
                    })}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-black/10 transition-all duration-200 hover:-translate-y-px bg-gradient-to-r ${primaryGrad}`}
                  >
                    Appliquer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'schedules' && (
        <div className="space-y-5">
          <SectionTitle
            title="Programmation / validation des gardes"
            subtitle="Publier ou masquer un créneau de garde. Les pharmacies gèrent leurs horaires ; ici vous contrôlez l’affichage public."
            icon={<NavIcon name="calendar" />}
            accent={accent}
            chip={scopeChip}
          />
          {groupedSchedules.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              Aucune garde programmée dans ce périmètre.
            </p>
          )}
          <div className="space-y-3">
            {groupedSchedules.map((group) => (
              <ScheduleGroup
                key={`pharmacy-${group[0].pharmacyId}`}
                data={group}
                onToggle={(schedule) =>
                  run('Créneau de garde modifié.', () =>
                    setScheduleStatus(
                      db,
                      schedule.id,
                      schedule.status === 'publie' ? 'draft' : 'publie',
                      label,
                    ),
                  )
                }
              />
            ))}
          </div>
        </div>
      )}

      {tab === 'users' && isSuper && (
        <div className="space-y-5">
          <SectionTitle
            title="Utilisateurs & rôles"
            subtitle="Gestion complète des comptes : profils, rôles, zones, activation et suspension."
            icon={<NavIcon name="users" />}
            accent={accent}
            chip={scopeChip}
          />
          <div className="overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm dark:border-violet-900 dark:bg-slate-900">
            <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50 to-fuchsia-50 px-5 py-4 dark:border-violet-900 dark:from-slate-900 dark:to-slate-900">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Créer un compte</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Le mot de passe est optionnel : s’il est vide, le compte reprend le mot de passe par
                défaut ({DEMO_PASSWORD}). Les comptes pharmacie se créent dans l’onglet « Pharmacies ».
              </p>
            </div>
            <div className="p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <input
                  value={newAccount.name}
                  onChange={(event) => setNewAccount((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Nom complet"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <input
                  value={newAccount.email}
                  onChange={(event) => setNewAccount((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="email@exemple.cm"
                  type="email"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <select
                  value={newAccount.role}
                  onChange={(event) => setNewAccount((prev) => ({ ...prev, role: event.target.value as BackOfficeRole }))}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {(['admin', 'super_admin'] as BackOfficeRole[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <select
                  value={newAccount.city}
                  onChange={(event) => setNewAccount((prev) => ({ ...prev, city: event.target.value }))}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Aucune zone (national)</option>
                  {data.cities.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  value={newAccount.password}
                  onChange={(event) => setNewAccount((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Mot de passe (8 caractères min.)"
                  type="password"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <button
                type="button"
                onClick={handleCreateAccount}
                className={`mt-4 rounded-xl bg-gradient-to-r ${primaryGrad} px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-black/10 transition-all duration-200 hover:-translate-y-px`}
              >
                Créer le compte
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Compte</th>
                  <th className="px-4 py-3">Rôle</th>
                  <th className="px-4 py-3">Périmètre</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.users.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Nom d’utilisateur : {user.username || '—'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        aria-label={`Rôle de ${user.name}`}
                        defaultValue={user.role}
                        onChange={(event) =>
                          run('Rôle du compte mis à jour.', () =>
                            updateUserRole(db, user.id, event.target.value as BackOfficeRole, label),
                          )
                        }
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:focus:ring-violet-500/20"
                      >
                        {(Object.keys(ROLE_LABELS) as BackOfficeRole[]).map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                      {user.role === 'admin' ? user.city ?? '—' : user.role === 'pharmacie' ? user.pharmacyName ?? '—' : 'Toutes les villes'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${user.status === 'actif' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : user.status === 'suspendu' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'}`}>
                        {ACCOUNT_STATUS_LABELS[user.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.status === 'actif' ? (
                        <button
                          type="button"
                          onClick={() => run('Compte suspendu.', () => setAccountStatus(db, user.id, 'suspendu', label))}
                          className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/50"
                        >
                          Suspendre
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => run('Compte activé.', () => setAccountStatus(db, user.id, 'actif', label))}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                        >
                          Activer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'audit' && isSuper && (
        <div className="space-y-5">
          <SectionTitle
            title="Journal d’audit"
            subtitle="Traçabilité systématique des actions sensibles : acteur, ressource, horodatage."
            icon={<NavIcon name="list" />}
            accent={accent}
            chip={scopeChip}
          />
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Acteur</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Ressource</th>
                  <th className="px-4 py-3">Détail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.audit.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                      Aucune entrée pour l’instant.
                    </td>
                  </tr>
                )}
                {data.audit.map((entry) => (
                  <tr key={entry.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(entry.timestamp)}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-100">{entry.actor}</td>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{ACTION_LABELS[entry.action] ?? entry.action}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500 dark:text-slate-400">{entry.resource}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">{entry.metadata ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'settings' && isSuper && (
        <div className="space-y-5">
          <SectionTitle
            title="Paramètres & sécurité"
            subtitle="Configuration de la plateforme — uniquement accessible au super administrateur."
            icon={<NavIcon name="gear" />}
            accent={accent}
            chip={scopeChip}
          />
          {(
            [
              ['Ville pilote', 'pin', 'Yaoundé et Douala sont marquées comme villes pilotes. La réplication vers d’autres chefs-lieux est prévue sans refonte (architecture multi-villes).'],
              ['Sécurité', 'shield', 'En production (API Node.js) : JWT avec expiration et rotation, mots de passe hachés (bcrypt), rate limiting, contrôle d’accès par rôle et appartenance de ressource côté serveur. En démo locale, les actions restent tracées dans le journal d’audit du navigateur.'],
              ['Sauvegardes', 'refresh', 'La base locale (SQLite web) est persistée dans le navigateur. La stratégie chiffrée et le plan de restauration testé arrivent avec le déploiement backend.'],
              ['Périmètre & arbitrage', 'check', 'Le contrôle d’accès est appliqué à trois niveaux (route, service métier, donnée). L’arbitrage sur toutes les villes s’effectue depuis ce compte. ' + ROLE_PERIMETERS.super_admin],
            ] as [string, string, string][]
          ).map(([title, icon, body]) => (
            <Panel key={title} title={title} icon={<NavIcon name={icon} />} accent={accent}>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{body}</p>
            </Panel>
          ))}
        </div>
      )}
    </BackOfficeShell>
  )
}

function ScheduleGroup({
  data,
  onToggle,
}: {
  data: AdminSchedule[]
  onToggle: (schedule: AdminSchedule) => void
}) {
  const pharmacy = data[0]
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-slate-900/60">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-slate-900 dark:text-slate-100">{pharmacy.pharmacyName}</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {pharmacy.city}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {data.map((schedule) => (
          <button
            key={schedule.id}
            type="button"
            onClick={() => onToggle(schedule)}
            aria-pressed={schedule.status === 'publie'}
            className={`rounded-lg border p-2 text-left transition-all duration-200 ${
              schedule.status === 'publie'
                ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/50 dark:hover:bg-emerald-950'
                : 'border-slate-200 bg-slate-50 opacity-60 hover:opacity-100 dark:border-slate-700 dark:bg-slate-800'
            }`}
          >
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{WEEKDAYS[schedule.weekday]}</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              {formatHour(schedule.start)}h→{formatHour(schedule.end)}h
            </p>
            <p className={`mt-1 text-[10px] font-semibold ${schedule.status === 'publie' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
              {schedule.status === 'publie' ? 'Publiée' : 'Masquée'}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}