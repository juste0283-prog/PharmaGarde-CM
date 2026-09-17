import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Database } from 'sql.js'
import { getDb, resetLocalDb } from '../db/database'
import {
  confirmCurrentGarde,
  getConfirmations,
  getDutySchedules,
  getPharmacyProfile,
  getReports,
  getUserByPharmacy,
  respondToReport,
  setScheduleStatus,
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

function MiniLogo() {
  return (
    <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        className="size-5"
        aria-hidden="true"
      >
        <path d="M12 9v6" />
        <path d="M9 12h6" />
        <path d="M12 3a1 1 0 0 1 1 1v2h2a1 1 0 0 1 0 2h-6a1 1 0 0 1 0-2h2V4a1 1 0 0 1 1-1Z" />
      </svg>
    </span>
  )
}

function Card({ title, icon, children }: { title: string; icon?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
        {icon ? `${icon} ` : ''}
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

interface PharmacySpaceProps {
  pharmacyId: number
  onLogout: () => void
  onExit: () => void
}

export default function PharmacySpace({ pharmacyId, onLogout, onExit }: PharmacySpaceProps) {
  const [db, setDb] = useState<Database | null>(null)
  const [profile, setProfile] = useState<PharmacyProfile | null>(null)
  const [schedules, setSchedules] = useState<GardeSchedule[]>([])
  const [confirmations, setConfirmations] = useState<ConfirmationRecord[]>([])
  const [reports, setReports] = useState<ReportRecord[]>([])
  const [accountStatus, setAccountStatus] = useState('actif')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [editingProfile, setEditingProfile] = useState(false)
  const [phoneDraft, setPhoneDraft] = useState('')
  const [addressDraft, setAddressDraft] = useState('')
  const [quartierDraft, setQuartierDraft] = useState('')
  const [editingSchedule, setEditingSchedule] = useState(false)

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
    setSchedules(getDutySchedules(database, id))
    setConfirmations(getConfirmations(database, id, 10))
    setReports(getReports(database, id))
  }

  function actorName(): string {
    return profile ? `${profile.pharmacy.name} (titulaire)` : 'Pharmacie'
  }

  function handleConfirm() {
    if (db === null || profile === null) return
    setBusy(true)
    const result = confirmCurrentGarde(db, profile.pharmacy.id, actorName())
    if (result.ok) {
      setNotice("Garde confirmée : l'horodatage a été enregistré et le statut public a été mis à jour.")
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

  function handleToggleDay(schedule: GardeSchedule) {
    if (db === null || profile === null) return
    const next = schedule.status === 'publie' ? 'draft' : 'publie'
    setScheduleStatus(db, schedule.id, next, actorName())
    refresh(db, profile.pharmacy.id)
    setNotice(
      next === 'publie'
        ? `Garde du ${WEEKDAYS[schedule.weekday]} re-publiée au planning.`
        : `Garde du ${WEEKDAYS[schedule.weekday]} masquée du planning public.`,
    )
  }

  if (!db || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4">
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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <MiniLogo />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{profile.pharmacy.name}</p>
              <p className="text-xs text-slate-500">Espace Pharmacie — {profile.pharmacy.city}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
            >
              Se déconnecter
            </button>
            <button
              type="button"
              onClick={onExit}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              Retour au site
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {isPending && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
            <strong>Compte {ACCOUNT_STATUS_LABELS.en_attente}.</strong> Votre demande d’inscription
            attend l’activation par l’administration de votre zone.
          </div>
        )}
        {notice && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-800">
            {notice}
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-relaxed text-rose-700">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{profile.pharmacy.name}</h1>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${meta.badge}`}>
                  {meta.label}
                </span>
                {profile.verified && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    Profil vérifié
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {profile.pharmacy.city} · {profile.pharmacy.region} · Quartier {profile.pharmacy.quartier}
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
                {profile.pharmacy.address}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                Téléphone : <span className="font-semibold">{profile.pharmacy.phone}</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {profile.pharmacy.lastUpdated} · Source : {profile.pharmacy.source}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {meta.description}
            </div>
          </div>

          {editingProfile ? (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <p className="text-sm font-bold text-slate-800">Modifier les informations</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="pro-phone" className="mb-1 block text-xs font-semibold text-slate-600">
                    Téléphone
                  </label>
                  <input
                    id="pro-phone"
                    value={phoneDraft}
                    onChange={(event) => setPhoneDraft(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div>
                  <label htmlFor="pro-quartier" className="mb-1 block text-xs font-semibold text-slate-600">
                    Quartier
                  </label>
                  <input
                    id="pro-quartier"
                    value={quartierDraft}
                    onChange={(event) => setQuartierDraft(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div>
                  <label htmlFor="pro-address" className="mb-1 block text-xs font-semibold text-slate-600">
                    Adresse
                  </label>
                  <input
                    id="pro-address"
                    value={addressDraft}
                    onChange={(event) => setAddressDraft(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
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
            <button
              type="button"
              onClick={startProfileEdit}
              className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-500 hover:text-emerald-700"
            >
              Modifier mes informations
            </button>
          )}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="Garde en cours" icon="🚨">
            {profile.gardeTodayLabel ? (
              <div>
                <p className="text-sm text-slate-600">
                  {WEEKDAYS[today]} — <span className="font-semibold text-slate-900">{profile.gardeTodayLabel}</span>
                </p>
                {(profile.confirmedRecently || profile.lastConfirmationAt) && (
                  <p className="mt-2 text-xs text-slate-500">
                    {profile.confirmedRecently
                      ? `Confirmée à ${profile.lastConfirmationAt ? formatTime(profile.lastConfirmationAt) : ''}`
                      : `Dernière confirmation : ${profile.lastConfirmationAt ? formatDateTime(profile.lastConfirmationAt) : 'aucune'}`}
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
              <p className="text-sm text-slate-600">
                Aucune garde programmée pour aujourd’hui. Vérifiez le planning sur la droite.
              </p>
            )}
          </Card>

          <Card title="Planning de garde" icon="📅">
            <div className="divide-y divide-slate-100">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className={`flex items-center justify-between gap-2 py-2 text-sm ${
                    schedule.weekday === today ? 'rounded-lg bg-emerald-50 px-2 font-semibold text-emerald-800' : 'text-slate-600'
                  }`}
                >
                  <span>
                    {WEEKDAYS[schedule.weekday]}{schedule.weekday === today ? ' (aujourd’hui)' : ''}
                    {schedule.status !== 'publie' && (
                      <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                        masquée
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    <span>
                      de {formatHour(schedule.start)}h à {formatHour(schedule.end)}h
                    </span>
                    {editingSchedule ? (
                      <button
                        type="button"
                        onClick={() => handleToggleDay(schedule)}
                        className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
                          schedule.status === 'publie'
                            ? 'border border-slate-300 text-slate-600 hover:bg-slate-100'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {schedule.status === 'publie' ? 'Masquer' : 'Publier'}
                      </button>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">Source : {schedules[0]?.source ?? '—'}</p>
              {!editingSchedule && (
                <button
                  type="button"
                  onClick={() => setEditingSchedule(true)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-emerald-500 hover:text-emerald-700"
                >
                  Modifier le planning
                </button>
              )}
              {editingSchedule && (
                <button
                  type="button"
                  onClick={() => setEditingSchedule(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100"
                >
                  Terminer
                </button>
              )}
            </div>
          </Card>

          <Card title="Historique des confirmations" icon="✅">
            {confirmations.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune confirmation enregistrée pour le moment.</p>
            ) : (
              <ul className="space-y-3">
                {confirmations.map((confirmation) => (
                  <li key={confirmation.id} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium text-slate-800">{confirmation.actor}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(confirmation.timestamp)}</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      {confirmation.result === 'ok' ? 'Confirmée' : confirmation.result}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Signalements reçus" icon="📣">
            {reports.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun signalement. Votre pharmacie est en règle.</p>
            ) : (
              <ul className="space-y-4">
                {reports.map((report) => (
                  <li key={report.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">
                        {REPORT_TYPE_LABELS[report.type] ?? report.type}
                      </p>
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
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
                    {(report.status === 'nouveau' ||
                      report.status === 'en_verification' ||
                      report.status === 'confirme') && (
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
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

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
      </main>
    </div>
  )
}