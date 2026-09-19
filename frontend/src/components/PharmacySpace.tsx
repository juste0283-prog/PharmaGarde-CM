import { useEffect, useState } from 'react'
import type { Database } from 'sql.js'
import { getDb, resetLocalDb } from '../db/database'
import {
  confirmCurrentGarde,
  getConfirmations,
  getDutySchedules,
  getPharmacyProfile,
  getQuartiers,
  getReports,
  getUserByPharmacy,
  respondToReport,
  setDutyDay,
  updatePharmacyProfile,
} from '../db/queries'
import {
  ACCOUNT_STATUS_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_TYPE_LABELS,
  STATUS_META,
  WEEKDAYS,
  type ConfirmationRecord,
  type GardeSchedule,
  type PharmacyProfile,
  type ReportRecord,
} from '../data/pharmacies'
import BackOfficeShell, {
  NoticeBanner,
  Panel,
  SectionTitle,
  StatCard,
  type ShellNavItem,
} from './BackOfficeShell'

function formatHour(hhmm: string): string {
  return String(parseInt(hhmm, 10))
}

function formatDateTime(iso: string): string {
  const date = new Date(iso)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${date.getFullYear()} à ${hours}h${minutes}`
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  return `${String(date.getHours()).padStart(2, '0')}h${String(date.getMinutes()).padStart(2, '0')}`
}

interface DayDraft {
  weekday: number
  enabled: boolean
  start: string
  end: string
}

function buildWeek(schedules: GardeSchedule[]): DayDraft[] {
  const byDay = new Map(schedules.map((s) => [s.weekday, s]))
  return WEEKDAYS.map((_, weekday) => {
    const s = byDay.get(weekday)
    return {
      weekday,
      enabled: !!s && s.status === 'publie',
      start: s ? s.start : '18:00',
      end: s ? s.end : '08:00',
    }
  })
}

type Section = 'apercu' | 'planning' | 'profil' | 'alertes' | 'historique'

const NAV: ShellNavItem[] = [
  { id: 'apercu', label: 'Tableau de bord', icon: 'grid' },
  { id: 'planning', label: 'Planning de garde', icon: 'calendar' },
  { id: 'profil', label: 'Profil & informations', icon: 'user' },
  { id: 'alertes', label: 'Signalements reçus', icon: 'flag' },
  { id: 'historique', label: 'Confirmations', icon: 'clipboard' },
]

const SWITCH_ON = 'bg-emerald-600'
const SWITCH_OFF = 'bg-slate-300'
const KNOB_ON = 'translate-x-5'
const KNOB_OFF = 'translate-x-0'

interface PharmacySpaceProps {
  pharmacyId: number
  onLogout: () => void
  onExit: () => void
}

export default function PharmacySpace({ pharmacyId, onLogout, onExit }: PharmacySpaceProps) {
  const [db, setDb] = useState<Database | null>(null)
  const [profile, setProfile] = useState<PharmacyProfile | null>(null)
  const [schedules, setSchedules] = useState<GardeSchedule[]>([])
  const [week, setWeek] = useState<DayDraft[]>([])
  const [confirmations, setConfirmations] = useState<ConfirmationRecord[]>([])
  const [reports, setReports] = useState<ReportRecord[]>([])
  const [accountStatus, setAccountStatus] = useState('actif')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [section, setSection] = useState<Section>('apercu')

  const [editingProfile, setEditingProfile] = useState(false)
  const [phoneDraft, setPhoneDraft] = useState('')
  const [addressDraft, setAddressDraft] = useState('')
  const [quartierDraft, setQuartierDraft] = useState('')

  useEffect(() => {
    let cancelled = false
    getDb()
      .then((database) => {
        if (cancelled) return
        setDb(database)
        const account = getUserByPharmacy(database, pharmacyId)
        if (account) setAccountStatus(account.status)
        refresh(database, pharmacyId)
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Impossible d’ouvrir la base de données')
      })
    return () => {
      cancelled = true
    }
  }, [pharmacyId])

  function refresh(database: Database, id: number) {
    setProfile(getPharmacyProfile(database, id))
    const schedulesData = getDutySchedules(database, id)
    setSchedules(schedulesData)
    setWeek(buildWeek(schedulesData))
    setConfirmations(getConfirmations(database, id, 10))
    setReports(getReports(database, id))
  }

  function actorName(): string {
    return profile ? `${profile.pharmacy.name} (titulaire)` : 'Pharmacie'
  }

  const changedDays = week.filter((day) => {
    const s = schedules.find((item) => item.weekday === day.weekday)
    const refEnabled = !!s && s.status === 'publie'
    const refStart = s ? s.start : '18:00'
    const refEnd = s ? s.end : '08:00'
    return day.enabled !== refEnabled || day.start !== refStart || day.end !== refEnd
  })

  const cityQuartiers =
    db !== null && profile !== null ? getQuartiers(db, profile.pharmacy.city) : []

  function patchDay(weekday: number, patch: Partial<DayDraft>) {
    setWeek((prev) => prev.map((day) => (day.weekday === weekday ? { ...day, ...patch } : day)))
  }

  function handleSavePlanning() {
    if (db === null || profile === null || changedDays.length === 0) return
    for (const day of changedDays) {
      setDutyDay(db, profile.pharmacy.id, day.weekday, {
        enabled: day.enabled,
        start: day.enabled ? day.start : null,
        end: day.enabled ? day.end : null,
      }, actorName())
    }
    refresh(db, profile.pharmacy.id)
    setNotice(
      changedDays.length === 1
        ? `Planning enregistré : 1 jour mis à jour (${WEEKDAYS[changedDays[0].weekday]}).`
        : `Planning enregistré : ${changedDays.length} jours mis à jour. Le public verra vos nouvelles gardes immédiatement.`,
    )
  }

  function handleConfirm() {
    if (db === null || profile === null) return
    setBusy(true)
    const result = confirmCurrentGarde(db, profile.pharmacy.id, actorName())
    if (result.ok) {
      setNotice('Garde confirmée : l’horodatage a été enregistré et le statut public a été mis à jour.')
    } else if (result.reason === 'already') {
      setNotice('Cette garde a déjà été confirmée dans les dernières minutes.')
    } else {
      setNotice('Aucune garde n’est programmée pour aujourd’hui : rien à confirmer.')
    }
    refresh(db, profile.pharmacy.id)
    setBusy(false)
  }

  function handleReport(reportId: number, decision: 'resolu' | 'rejete') {
    if (db === null || profile === null) return
    const responseText =
      decision === 'resolu'
        ? 'Vérification effectuée sur place : la situation a été corrigée, données mises à jour.'
        : 'Signalement vérifié : la donnée affichée était correcte, aucune anomalie constatée.'
    respondToReport(db, reportId, decision, responseText)
    setNotice(decision === 'resolu' ? 'Signalement marqué comme résolu.' : 'Signalement rejeté.')
    refresh(db, profile.pharmacy.id)
  }

  function handleReset() {
    resetLocalDb()
    window.location.reload()
  }

  function startProfileEdit() {
    if (!profile) return
    setPhoneDraft(profile.pharmacy.phone)
    setAddressDraft(profile.pharmacy.address)
    setQuartierDraft(profile.pharmacy.quartier)
    setEditingProfile(true)
  }

  function handleSaveProfile() {
    if (db === null || profile === null) return
    updatePharmacyProfile(db, profile.pharmacy.id, {
      phone: phoneDraft.trim(),
      address: addressDraft.trim(),
      quartier: quartierDraft.trim(),
    }, actorName())
    setEditingProfile(false)
    refresh(db, profile.pharmacy.id)
    setNotice('Profil mis à jour : la fiche publique et la traçabilité ont été actualisées.')
  }

  if (!db || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 px-4">
        <p className="text-sm text-slate-600">{error ?? 'Chargement du profil…'}</p>
        {error && (
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            Revenir à la connexion
          </button>
        )}
      </div>
    )
  }

  const meta = STATUS_META[profile.pharmacy.status]
  const today = new Date().getDay()
  const isPending = accountStatus === 'en_attente'
  const activeDays = week.filter((day) => day.enabled).length
  const openReports = reports.filter((r) => r.status === 'nouveau' || r.status === 'en_verification').length

  return (
    <BackOfficeShell
      accent="emerald"
      brand="Espace Pharmacie"
      roleLabel="Pharmacie"
      scopeLabel={profile.pharmacy.city}
      userLabel={profile.pharmacy.name}
      nav={NAV}
      active={section}
      onNavigate={(id) => setSection(id as Section)}
      onLogout={onLogout}
      onExit={onExit}
    >
      {isPending && (
        <NoticeBanner kind="warning">
          <strong>Compte {ACCOUNT_STATUS_LABELS.en_attente}.</strong> Votre demande d’inscription attend
          l’activation par l’administration de votre zone. Les actions sont visibles en interne.
        </NoticeBanner>
      )}
      {notice && <NoticeBanner kind="success">{notice}</NoticeBanner>}
      {error && <NoticeBanner kind="error">{error}</NoticeBanner>}

      {section === 'apercu' && (
        <div className="space-y-6">
          <SectionTitle
            title={`Bonjour, ${profile.pharmacy.name.split(' ')[0] ?? ''}`}
            subtitle="Voici l’activité de votre pharmacie aujourd’hui."
            chip={
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.badge}`}>
                <span className="size-1.5 rounded-full bg-current" />
                {meta.label}
              </span>
            }
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Garde du jour"
              value={
                profile.gardeTodayLabel
                  ? (() => {
                      const match = profile.gardeTodayLabel.match(/de (\d+)h à (\d+)h/)
                      return match ? `${match[1]}h — ${match[2]}h` : profile.gardeTodayLabel
                    })()
                  : 'Non programmée'
              }
              note={WEEKDAYS[today]}
            />
            <StatCard label="Planning actif" value={`${activeDays}/7 jours`} note="jours avec garde publiée" />
            <StatCard label="Signalements ouverts" value={`${openReports}`} note="à traiter" />
            <StatCard
              label="Dernière confirmation"
              value={profile.lastConfirmationAt ? formatTime(profile.lastConfirmationAt) : '—'}
              note={profile.confirmedRecently ? 'aujourd’hui' : 'aucune récente'}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title={profile.gardeTodayLabel ? 'Garde en cours' : 'Aucune garde aujourd’hui'}>
              {profile.gardeTodayLabel ? (
                <div>
                  <p className="text-sm text-slate-600">
                    {WEEKDAYS[today]} — <span className="font-semibold text-slate-900">{profile.gardeTodayLabel}</span>
                  </p>
                  {profile.confirmedRecently && profile.lastConfirmationAt ? (
                    <p className="mt-2 text-sm font-medium text-emerald-700">
                      Confirmée à {formatTime(profile.lastConfirmationAt)}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">
                      Dernière confirmation : {profile.lastConfirmationAt ? formatDateTime(profile.lastConfirmationAt) : 'aucune'}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={busy || profile.confirmedRecently}
                    className="mt-4 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {busy ? 'Enregistrement…' : profile.confirmedRecently ? 'Garde confirmée' : 'Confirmer la garde'}
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-slate-600">
                    Vous n’avez pas programmé de garde aujourd’hui. Ouvrez le planning pour décider de
                    votre présence ce jour, ou laisser la pharmacie fermée exceptionnellement.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSection('planning')}
                    className="mt-4 rounded-lg border border-emerald-300 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                  >
                    Ouvrir le planning
                  </button>
                </div>
              )}
            </Panel>

            <Panel title="Aperçu du planning" aside={<span className="text-xs font-semibold text-slate-400">{activeDays}/7 jours actifs</span>}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                {week.map((day) => (
                  <div
                    key={day.weekday}
                    className={`rounded-lg border p-2.5 ${
                      day.enabled ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50 opacity-70'
                    }`}
                  >
                    <p className="truncate text-xs font-bold text-slate-800">{WEEKDAYS[day.weekday]}</p>
                    {day.enabled ? (
                      <p className="text-[11px] font-semibold text-emerald-700">
                        {formatHour(day.start)}h→{formatHour(day.end)}h
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400">Pas de garde</p>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSection('planning')}
                className="mt-4 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-emerald-500 hover:text-emerald-700"
              >
                Gérer mon planning de garde
              </button>
            </Panel>
          </div>
        </div>
      )}

      {section === 'planning' && (
        <div className="space-y-5">
          <SectionTitle
            title="Planning de garde"
            subtitle="Chaque jour, vous décidez si la pharmacie est de garde — et de quelle heure à quelle heure. Les changements sont visibles par le public immédiatement."
            chip={
              changedDays.length > 0 ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                  {changedDays.length} modification(s) en attente
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  Planning à jour
                </span>
              )
            }
          />

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <ul className="divide-y divide-slate-100">
              {week.map((day) => {
                const isToday = day.weekday === today
                return (
                  <li
                    key={day.weekday}
                    className={`flex flex-wrap items-center gap-3 px-5 py-3.5 ${isToday ? 'bg-emerald-50/60' : ''}`}
                  >
                    <div className="w-36 shrink-0">
                      <p className="text-sm font-bold text-slate-900">
                        {WEEKDAYS[day.weekday]}
                        {isToday && <span className="ml-1.5 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">aujourd’hui</span>}
                      </p>
                      <p className={`text-xs ${day.enabled ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {day.enabled ? 'En garde — publiée' : 'Pas de garde'}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-xs font-medium text-slate-500">En garde ?</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={day.enabled}
                        aria-label={`${WEEKDAYS[day.weekday]} : ${day.enabled ? 'activer' : 'désactiver'} la garde`}
                        onClick={() => patchDay(day.weekday, { enabled: !day.enabled })}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${day.enabled ? SWITCH_ON : SWITCH_OFF}`}
                      >
                        <span
                          className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${day.enabled ? KNOB_ON : KNOB_OFF}`}
                        />
                      </button>
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        De
                        <input
                          type="time"
                          value={day.start}
                          disabled={!day.enabled}
                          onChange={(event) => patchDay(day.weekday, { start: event.target.value })}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                        />
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        À
                        <input
                          type="time"
                          value={day.end}
                          disabled={!day.enabled}
                          onChange={(event) => patchDay(day.weekday, { end: event.target.value })}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                        />
                      </label>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
              {changedDays.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setWeek(buildWeek(schedules))
                    setNotice(null)
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
                >
                  Annuler
                </button>
              )}
              <button
                type="button"
                onClick={handleSavePlanning}
                disabled={changedDays.length === 0}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {changedDays.length === 0 ? 'Planning à jour' : `Enregistrer le planning (${changedDays.length})`}
              </button>
            </div>
          </div>

          <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-relaxed text-slate-500">
            Source actuelle : {schedules[0]?.source ?? '—'}. L’annulation d’une garde le jour même est
            visible immédiatement : la pharmacie ne sera plus affichée comme garde ce jour.
          </p>
        </div>
      )}

      {section === 'profil' && (
        <div className="space-y-5">
          <SectionTitle
            title="Profil & informations"
            subtitle="Les coordonnées affichées au public sur la fiche de votre pharmacie."
            chip={profile.verified && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Profil vérifié</span>}
          />

          <Panel title="Informations de la fiche">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Nom</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">{profile.pharmacy.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ville</dt>
                <dd className="mt-1 text-sm text-slate-700">
                  {profile.pharmacy.city} — {profile.pharmacy.region}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Quartier</dt>
                <dd className="mt-1 text-sm text-slate-700">{profile.pharmacy.quartier}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Situation</dt>
                <dd className="mt-1 text-sm text-slate-700">{profile.pharmacy.address}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Téléphone</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">{profile.pharmacy.phone}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Source</dt>
                <dd className="mt-1 text-sm text-slate-600">{profile.pharmacy.source}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Statut</dt>
                <dd className="mt-1 text-sm text-slate-700">{meta.label} — {meta.description}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Dernière mise à jour</dt>
                <dd className="mt-1 text-sm text-slate-600">{profile.pharmacy.lastUpdated}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title={editingProfile ? 'Modifier les informations' : 'Modifier la fiche'}>
            {editingProfile ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="pro-phone" className="mb-1 block text-xs font-semibold text-slate-600">Téléphone</label>
                    <input
                      id="pro-phone"
                      value={phoneDraft}
                      onChange={(event) => setPhoneDraft(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="pro-quartier" className="mb-1 block text-xs font-semibold text-slate-600">Quartier</label>
                    <select
                      id="pro-quartier"
                      value={quartierDraft}
                      onChange={(event) => setQuartierDraft(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    >
                      {cityQuartiers.map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="pro-address" className="mb-1 block text-xs font-semibold text-slate-600">Adresse</label>
                    <input
                      id="pro-address"
                      value={addressDraft}
                      onChange={(event) => setAddressDraft(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProfile(false)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  Téléphone, quartier et adresse sont modifiables depuis cet espace.
                </p>
                <button
                  type="button"
                  onClick={startProfileEdit}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-500 hover:text-emerald-700"
                >
                  Modifier mes informations
                </button>
              </div>
            )}
          </Panel>
        </div>
      )}

      {section === 'alertes' && (
        <div className="space-y-5">
          <SectionTitle
            title="Signalements reçus"
            subtitle="Alertes publiques concernant cette pharmacie. Répondez pour informer la communauté, chaque traitement est horodaté."
            chip={
              openReports > 0 ? (
                <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">{openReports} à traiter</span>
              ) : (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Aucune alerte en cours</span>
              )
            }
          />
          {reports.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              Aucun signalement. Votre pharmacie est en règle.
            </p>
          )}
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">{REPORT_TYPE_LABELS[report.type] ?? report.type}</p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                    {REPORT_STATUS_LABELS[report.status] ?? report.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{report.description}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {report.author} · {formatDateTime(report.createdAt)}
                </p>
                {report.response && (
                  <p className="mt-2 rounded-lg bg-slate-50 p-3 text-xs italic leading-relaxed text-slate-600">
                    Réponse : {report.response}
                  </p>
                )}
                {(report.status === 'nouveau' || report.status === 'en_verification' || report.status === 'confirme') && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleReport(report.id, 'resolu')}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                    >
                      Marquer résolu
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReport(report.id, 'rejete')}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100"
                    >
                      Rejeter
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {section === 'historique' && (
        <div className="space-y-5">
          <SectionTitle
            title="Historique des confirmations"
            subtitle="Horodatages des garanties de présence enregistrées par la pharmacie."
          />
          {confirmations.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              Aucune confirmation enregistrée pour le moment.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Acteur</th>
                    <th className="px-5 py-3">Résultat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {confirmations.map((confirmation) => (
                    <tr key={confirmation.id}>
                      <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500">{formatDateTime(confirmation.timestamp)}</td>
                      <td className="px-5 py-3 font-medium text-slate-800">{confirmation.actor}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                          {confirmation.result === 'ok' ? 'Confirmée' : confirmation.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
        <p>
          Les actions de cet espace sont enregistrées localement dans votre navigateur (base web
          SQLite), en attendant l’API Node.js prévue pour l’authentification et la synchronisation.
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-rose-200 px-3 py-1.5 font-semibold text-rose-600 transition-colors hover:bg-rose-50"
        >
          Réinitialiser les données locales
        </button>
      </div>
    </BackOfficeShell>
  )
}