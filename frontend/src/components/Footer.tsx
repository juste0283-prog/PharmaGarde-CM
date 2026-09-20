const FOOTER_COLUMNS: { heading: string; links: string[] }[] = [
  { heading: 'Application', links: ['Pharmacies de garde', 'Recherche par position', 'Comment ça marche'] },
  { heading: 'Espaces', links: ['Espace Pharmacie', 'Connexion'] },
  { heading: 'Projet', links: ['Ville pilote', 'Fiabilité', 'Signaler une anomalie'] },
]

export default function Footer({ onOpenSpace }: { onOpenSpace: () => void }) {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <a href="#accueil" className="flex items-center gap-2.5">
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
              <span className="text-lg font-bold tracking-tight">
                PharmaGarde&nbsp;<span className="text-emerald-600">CM</span>
              </span>
            </a>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              La plateforme de recherche, de vérification et de confirmation des
              pharmacies de garde au Cameroun. Une information actualisée,
              vérifiable et accessible, ville pilote après ville pilote.
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.heading}>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{column.heading}</h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link}>
                    {link === 'Espace Pharmacie' ? (
                      <button
                        type="button"
                        onClick={onOpenSpace}
                        className="text-sm text-slate-600 transition-colors hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400"
                      >
                        {link}
                      </button>
                    ) : (
                      <a href="#" className="text-sm text-slate-600 transition-colors hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400">
                        {link}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <p>
            La confirmation de garde est un signal de confiance horodaté, jamais
            une certitude absolue d'ouverture. Avant tout déplacement,
            nous vous recommandons d'appeler la pharmacie affichée.
          </p>
          <p className="mt-2 text-center">
            © {new Date().getFullYear()} PharmaGarde CM: Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  )
}