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
import {
  ACCOUNT_STATUS_LABELS,
  ACTION_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_TYPE_LABELS,
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
      return 'bg-rose-100 text-rose-800'
    case 'resolu':
      return 'bg-emerald-100 text-emerald-800'
    case 'rejete':
      return 'bg-slate-100 text-slate-700'
    case 'en_verification':
      return 'bg-amber-100 text-amber-800'
    default:
      return 'bg-sky-100 text-sky-800'
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
  const [newAccount, setNewAccount] = useState({ name: '', email: '', role: 'admin' as BackOfficeRole, city: '' })

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
  })
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
    'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-100'

  const existingQuartiers = useMemo(
    () => getQuartiers(db, showCreate ? newPharmacy.city : (city ?? '')),
    [db, showCreate, newPharmacy.city, city],
  )

  function pickCityCoordinates(nextCity: string) {
    const c = data.cities.find((item) => item.name === nextCity)
    if (!c) return
    setNewPharmacy((prev) => ({ ...prev, city: nextCity, latitude: c.lat, longitude: c.lng }))
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

  function run(actionLabel: string, action: () => void) {
    try {
      action()
      setNotice(actionLabel)
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "L'action a échoué.")
    }
  }

  function handleCreateAccount() {
    if (newAccount.name.trim() === '' || newAccount.email.trim() === '') {
      setError('Nom et email sont obligatoires.')
      return
    }
    run('Compte créé et journalisé.', () => {
      createUser(
        db,
        {
          name: newAccount.name.trim(),
          email: newAccount.email.trim(),
          role: newAccount.role,
          city: newAccount.city || null,
        },
        label,
      )
      setNewAccount({ name: '', email: '', role: 'admin', city: '' })
    })
  }

  function handleCreatePharmacy() {
    if (!newPharmacy.name.trim() || !newPharmacy.quartier.trim()) {
      setError('Nom et quartier sont obligatoires pour créer une pharmacie.')
      return
    }
    const result = createPharmacy(db, newPharmacy, label)
    if (!result.ok) {
      setError(result.error ?? 'Création impossible.')
      return
    }
    setNewPharmacy({
      name: '',
      city: city ?? '',
      quartier: '',
      address: '',
      phone: '',
      latitude: 0,
      longitude: 0,
      verified: isSuper,
    })
    setShowCreate(false)
    setNotice(
      `Pharmacie créée (${newPharmacy.quartier}, ${newPharmacy.city}) avec planning initialisé et compte professionnel.`,
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
      <span className="text-xs font-semibold text-slate-500">Périmètre :</span>
      <select
        value={scope ?? ''}
        onChange={(event) => setScope(event.target.value || null)}
        aria-label="Changer de zone"
        className={`rounded-lg border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-100`}
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
    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
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
        <div className="space-y-5">
          <SectionTitle
            title="Supervision"
            subtitle={`Pilotage ${isSuper ? 'de la plateforme entière' : `de votre zone (${city})`}.`}
            chip={scopeChip}
          />
          {stats && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="Villes & zones" value={`${stats.cities}`} note={isSuper ? 'les 10 chefs-lieux' : 'votre zone assignée'} />
              <StatCard label="Pharmacies" value={`${stats.pharmacies}`} note={`${stats.validated} validées`} />
              <StatCard label="Comptes en attente" value={`${stats.pendingPharmacies}`} note="à valider" />
              <StatCard label="Signalements ouverts" value={`${stats.openReports}`} note="à modérer" />
              <StatCard label="Confirmations (24 h)" value={`${stats.confirmations24h}`} note="gardes confirmées" />
              <StatCard label="Gardes programmées" value={`${stats.activeSchedules}`} note="créneaux publiés" />
            </div>
          )}
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title={`Responsabilités — ${ROLE_LABELS[role]}`}>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-600">
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
            <Panel title="Dernières traces d’audit">
              {data.audit.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {isSuper
                    ? 'Le journal d’audit est vide pour l’instant.'
                    : 'Consultation du journal réservée au super administrateur.'}
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.audit.slice(0, 6).map((entry) => (
                    <li key={entry.id} className="flex items-start justify-between gap-3 text-sm">
                      <span className="text-slate-700">
                        <strong>{entry.actor}</strong> — {ACTION_LABELS[entry.action] ?? entry.action}{' '}
                        <span className="text-slate-400">({entry.resource})</span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">{formatDateTime(entry.timestamp)}</span>
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
            subtitle={`${data.pharmacies.length} pharmacies — création et mise à jour par la supervision, quartier et coordonnées GPS inclus.`}
            chip={
              <span className="flex flex-wrap items-center gap-2">
                {scopeChip}
                <button
                  type="button"
                  onClick={() => setShowCreate((value) => !value)}
                  className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
                >
                  {showCreate ? 'Annuler' : '+ Créer une pharmacie'}
                </button>
              </span>
            }
          />
          {showCreate && (
            <div className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-bold text-slate-900">Nouvelle pharmacie</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Le quartier pilote le filtre de l’accueil ; les coordonnées GPS placent la pharmacie sur la carte.
                Un compte professionnel et un planning (7 jours) sont créés automatiquement.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Nom *</span>
                  <input
                    id="np-name"
                    value={newPharmacy.name}
                    onChange={(event) => setNewPharmacy((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Pharmacie du Marché"
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Ville</span>
                  <select
                    id="np-city"
                    value={newPharmacy.city}
                    onChange={(event) => pickCityCoordinates(event.target.value)}
                    disabled={!isSuper}
                    className={`${fieldClass} disabled:cursor-not-allowed disabled:bg-slate-100`}
                  >
                    {data.cities.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Quartier *</span>
                  <input
                    id="np-quartier"
                    value={newPharmacy.quartier}
                    onChange={(event) => setNewPharmacy((prev) => ({ ...prev, quartier: event.target.value }))}
                    list="admin-quartiers"
                    placeholder="Centre-ville"
                    className={fieldClass}
                  />
                  <datalist id="admin-quartiers">
                    {existingQuartiers.map((q) => (
                      <option key={q} value={q} />
                    ))}
                  </datalist>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Téléphone *</span>
                  <input
                    id="np-phone"
                    value={newPharmacy.phone}
                    onChange={(event) => setNewPharmacy((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="6XX XX XX XX"
                    className={fieldClass}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-600">Adresse</span>
                  <input
                    id="np-address"
                    value={newPharmacy.address}
                    onChange={(event) => setNewPharmacy((prev) => ({ ...prev, address: event.target.value }))}
                    placeholder="Rue du Marché, à côté de la Mairie"
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Latitude</span>
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
                  <span className="text-xs font-semibold text-slate-600">Longitude</span>
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
                <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
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
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleCreatePharmacy}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
                >
                  Créer la pharmacie
                </button>
              </div>
            </div>
          )}
          {data.pharmacies.length === 0 && !showCreate && (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              Aucune pharmacie dans ce périmètre.
            </p>
          )}
          <div className="space-y-3">
            {data.pharmacies.map((pharmacy) => {
              const needsValidation = !pharmacy.verified || pharmacy.accountStatus === 'en_attente'
              return (
                <div
                  key={pharmacy.id}
                  className={`rounded-2xl border bg-white p-4 shadow-sm ${needsValidation ? 'border-amber-300' : 'border-slate-200'}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900">{pharmacy.name}</p>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${pharmacy.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {pharmacy.verified ? 'Validée' : 'En attente de validation'}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${pharmacy.accountStatus === 'actif' ? 'bg-slate-100 text-slate-700' : pharmacy.accountStatus === 'suspendu' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}`}>
                          {ACCOUNT_STATUS_LABELS[pharmacy.accountStatus]}
                        </span>
                        <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                          Quartier {pharmacy.quartier}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {pharmacy.city} · {pharmacy.address || 'Adresse à préciser'} · {pharmacy.phone} · Source : {pharmacy.source}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-slate-400">
                        {pharmacy.latitude.toFixed(5)}, {pharmacy.longitude.toFixed(5)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {editingId === pharmacy.id ? (
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                        >
                          Annuler
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(pharmacy)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
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
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                      >
                        Valider
                      </button>
                      <button
                        type="button"
                        onClick={() => run('Pharmacie suspendue.', () => {
                          if (pharmacy.accountId) setAccountStatus(db, pharmacy.accountId, 'suspendu', label)
                        })}
                        disabled={pharmacy.accountStatus === 'suspendu'}
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                      >
                        Suspendre
                      </button>
                    </div>
                  </div>
                  {editingId === pharmacy.id && (
                    <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/40 p-4">
                      <p className="text-xs font-bold text-slate-700">Modifier la fiche (nom, quartier, adresse, téléphone, GPS)</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="block">
                          <span className="text-xs font-semibold text-slate-600">Nom</span>
                          <input
                            aria-label="Nom de la pharmacie (édition)"
                            value={editDraft.name}
                            onChange={(event) => setEditDraft((prev) => ({ ...prev, name: event.target.value }))}
                            className={fieldClass}
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-slate-600">Quartier</span>
                          <input
                            aria-label="Quartier de la pharmacie (édition)"
                            value={editDraft.quartier}
                            onChange={(event) => setEditDraft((prev) => ({ ...prev, quartier: event.target.value }))}
                            className={fieldClass}
                          />
                        </label>
                        <label className="block sm:col-span-2">
                          <span className="text-xs font-semibold text-slate-600">Adresse</span>
                          <input
                            aria-label="Adresse de la pharmacie (édition)"
                            value={editDraft.address}
                            onChange={(event) => setEditDraft((prev) => ({ ...prev, address: event.target.value }))}
                            className={fieldClass}
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-slate-600">Téléphone</span>
                          <input
                            aria-label="Téléphone de la pharmacie (édition)"
                            value={editDraft.phone}
                            onChange={(event) => setEditDraft((prev) => ({ ...prev, phone: event.target.value }))}
                            className={fieldClass}
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-slate-600">Latitude</span>
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
                          <span className="text-xs font-semibold text-slate-600">Longitude</span>
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
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
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
            chip={
              <select
                value={reportFilter}
                onChange={(event) => setReportFilter(event.target.value)}
                aria-label="Filtrer par statut"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
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
              <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                Aucun signalement dans ce périmètre / filtre.
              </p>
            )}
            {data.reports.map((report) => (
              <div key={report.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900">{report.pharmacyName}</p>
                    <span className="text-xs text-slate-400">· {report.city}</span>
                    <span className="text-xs text-slate-400">· {REPORT_TYPE_LABELS[report.type] ?? report.type}</span>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statBadge(report.status)}`}>
                    {REPORT_STATUS_LABELS[report.status] ?? report.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{report.description}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {report.author} · {formatDateTime(report.createdAt)}
                </p>
                {report.response && (
                  <p className="mt-2 rounded-lg bg-slate-50 p-3 text-xs italic text-slate-600">
                    Réponse : {report.response}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    id={`report-status-${report.id}`}
                    defaultValue={report.status}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
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
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors ${accent === 'violet' ? 'bg-violet-600 hover:bg-violet-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
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
            chip={scopeChip}
          />
          {groupedSchedules.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
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
            chip={scopeChip}
          />
          <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
            <p className="text-sm font-bold text-slate-800">Créer un compte</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input
                value={newAccount.name}
                onChange={(event) => setNewAccount((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Nom complet"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              />
              <input
                value={newAccount.email}
                onChange={(event) => setNewAccount((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="email@exemple.cm"
                type="email"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              />
              <select
                value={newAccount.role}
                onChange={(event) => setNewAccount((prev) => ({ ...prev, role: event.target.value as BackOfficeRole }))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              >
                {(Object.keys(ROLE_LABELS) as BackOfficeRole[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <select
                value={newAccount.city}
                onChange={(event) => setNewAccount((prev) => ({ ...prev, city: event.target.value }))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              >
                <option value="">Aucune zone (national)</option>
                {data.cities.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleCreateAccount}
              className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
            >
              Créer le compte
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Compte</th>
                  <th className="px-4 py-3">Rôle</th>
                  <th className="px-4 py-3">Périmètre</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
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
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                      >
                        {(Object.keys(ROLE_LABELS) as BackOfficeRole[]).map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {user.role === 'admin' ? user.city ?? '—' : user.role === 'pharmacie' ? user.pharmacyName ?? '—' : 'Toutes les villes'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${user.status === 'actif' ? 'bg-emerald-100 text-emerald-800' : user.status === 'suspendu' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}`}>
                        {ACCOUNT_STATUS_LABELS[user.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.status === 'actif' ? (
                        <button
                          type="button"
                          onClick={() => run('Compte suspendu.', () => setAccountStatus(db, user.id, 'suspendu', label))}
                          className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
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
            chip={scopeChip}
          />
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Acteur</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Ressource</th>
                  <th className="px-4 py-3">Détail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.audit.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      Aucune entrée pour l’instant.
                    </td>
                  </tr>
                )}
                {data.audit.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">{formatDateTime(entry.timestamp)}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{entry.actor}</td>
                    <td className="px-4 py-2.5 text-slate-700">{ACTION_LABELS[entry.action] ?? entry.action}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{entry.resource}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{entry.metadata ?? '—'}</td>
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
            chip={scopeChip}
          />
          {(
            [
              ['Ville pilote', 'Yaoundé et Douala sont marquées comme villes pilotes. La réplication vers d’autres chefs-lieux est prévue sans refonte (architecture multi-villes).'],
              ['Sécurité', 'En production (API Node.js) : JWT avec expiration et rotation, mots de passe hachés (bcrypt), rate limiting, contrôle d’accès par rôle et appartenance de ressource côté serveur. En démo locale, les actions restent tracées dans le journal d’audit du navigateur.'],
              ['Sauvegardes', 'La base locale (SQLite web) est persistée dans le navigateur. La stratégie chiffrée et le plan de restauration testé arrivent avec le déploiement backend.'],
              ['Périmètre & arbitrage', 'Le contrôle d’accès est appliqué à trois niveaux (route, service métier, donnée). L’arbitrage sur toutes les villes s’effectue depuis ce compte. ' + ROLE_PERIMETERS.super_admin],
            ] as [string, string][]
          ).map(([title, body]) => (
            <Panel key={title} title={title}>
              <p className="text-sm leading-relaxed text-slate-600">{body}</p>
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-slate-900">{pharmacy.pharmacyName}</p>
        <p className="text-xs text-slate-500">{pharmacy.city}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {data.map((schedule) => (
          <button
            key={schedule.id}
            type="button"
            onClick={() => onToggle(schedule)}
            className={`rounded-lg border p-2 text-left transition-colors ${schedule.status === 'publie' ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50 opacity-60'}`}
          >
            <p className="text-xs font-bold text-slate-800">{WEEKDAYS[schedule.weekday]}</p>
            <p className="text-[11px] text-slate-600">
              {formatHour(schedule.start)}h→{formatHour(schedule.end)}h
            </p>
            <p className={`mt-1 text-[10px] font-semibold ${schedule.status === 'publie' ? 'text-emerald-700' : 'text-slate-400'}`}>
              {schedule.status === 'publie' ? 'Publiée' : 'Masquée'}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}