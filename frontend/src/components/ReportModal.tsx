import { useState } from 'react'
import {
  REPORT_TYPE_LABELS,
  type Pharmacy,
  type ReportRecord,
} from '../data/pharmacies'
import { createAnomalyReport } from '../db/queries'
import { getDb } from '../db/database'

const REPORT_TYPES = Object.keys(REPORT_TYPE_LABELS)

interface ReportModalProps {
  pharmacy: Pharmacy
  onClose: () => void
  onSubmitted: (report: ReportRecord) => void
}

export default function ReportModal({ pharmacy, onClose, onSubmitted }: ReportModalProps) {
  const [type, setType] = useState('fermeture')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit() {
    if (description.trim().length < 10) {
      setError('Décrivez brièvement l\u2019anomalie constatée (au moins 10 caractères).')
      return
    }
    setBusy(true)
    setError(null)
    getDb()
      .then((db) => createAnomalyReport(
        db,
        pharmacy.id,
        author.trim(),
        type,
        description.trim(),
      ))
      .then((report) => {
        if (report) onSubmitted(report)
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Impossible d\u2019enregistrer le signalement.')
        setBusy(false)
      })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 dark:bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-label="Signaler une anomalie"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Signaler une anomalie</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {pharmacy.name} — {pharmacy.city}, quartier {pharmacy.quartier}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg px-2 py-1 text-xl leading-none text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            ×
          </button>
        </div>

        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Chaque signalement est horodaté et transmis à la pharmacie et à l\u2019administration. Une
          vérification est effectuée avant tout impact sur l\u2019affichage public.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="report-type" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Type de problème
            </label>
            <select
              id="report-type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20"
            >
              {REPORT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {REPORT_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="report-author" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Votre nom (facultatif)
            </label>
            <input
              id="report-author"
              type="text"
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder="Anonyme"
              maxLength={80}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label htmlFor="report-desc" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Description
            </label>
            <textarea
              id="report-desc"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Ex. : pharmacie fermée alors que la garde de nuit est affichée…"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20"
            />
          </div>

          {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy}
              className="flex-1 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {busy ? 'Envoi…' : 'Envoyer le signalement'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}