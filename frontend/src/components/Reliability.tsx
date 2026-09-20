import { STATUS_META, type ReliabilityStatus } from '../data/pharmacies'

const ORDER: ReliabilityStatus[] = ['verifiee', 'confirmee', 'ancienne', 'a-verifier']

export default function Reliability() {
  return (
    <section id="fiabilite" className="scroll-mt-20 bg-slate-50 py-16 dark:bg-slate-950 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Une fiabilité visible en un coup d&rsquo;œil
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            Chaque fiche indique le niveau de fiabilité de la garde, à partir de
            la source et de la dernière confirmation horodatée.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ORDER.map((status) => {
            const meta = STATUS_META[status]
            return (
              <div
                key={status}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${meta.badge}`}
                >
                  <span className={`size-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
                  {meta.label}
                </span>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {meta.description}
                </p>
              </div>
            )
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950/60">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 size-5 shrink-0 text-emerald-700 dark:text-emerald-400"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <p className="text-sm leading-relaxed text-emerald-900 dark:text-emerald-100">
              L&rsquo;absence de confirmation n&rsquo;implique pas la fermeture :
              elle dégrade uniquement le niveau de fiabilité affiché. Une
              confirmation de garde est un signal de confiance horodaté, jamais
              une preuve absolue d&rsquo;ouverture.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}