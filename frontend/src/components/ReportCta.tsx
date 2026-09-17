export default function ReportCta() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 to-teal-700 px-6 py-12 text-center text-white sm:px-12 sm:py-16">
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Une pharmacie affichée est fermée ?
            </h2>
            <p className="mt-4 text-emerald-50/90">
              Votre signalement est horodaté, traçable jusqu&rsquo;à sa
              résolution et permet de corriger l&rsquo;information pour tout le
              monde. Plusieurs signalements convergents basculent
              automatiquement la garde en &laquo;&nbsp;à vérifier&nbsp;&raquo;.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href="#pharmacies"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-emerald-800 shadow-sm transition-colors hover:bg-emerald-50"
              >
                Signaler une anomalie
              </a>
              <a
                href="#"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Espace Pharmacie
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}