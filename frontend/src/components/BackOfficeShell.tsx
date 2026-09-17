import type { ReactNode } from 'react'

export type Accent = 'emerald' | 'indigo' | 'violet'

const ACCENTS: Record<
  Accent,
  {
    grad: string
    brand: string
    chip: string
    navActive: string
    navIdle: string
    primary: string
    focus: string
  }
> = {
  emerald: {
    grad: 'from-emerald-500 to-teal-600',
    brand: 'text-emerald-700',
    chip: 'bg-emerald-100 text-emerald-800',
    navActive: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    navIdle: 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    primary: 'bg-emerald-600 hover:bg-emerald-700',
    focus: 'border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100',
  },
  indigo: {
    grad: 'from-indigo-500 to-violet-600',
    brand: 'text-indigo-700',
    chip: 'bg-indigo-50 text-indigo-700',
    navActive: 'border-indigo-200 bg-indigo-50 text-indigo-900',
    navIdle: 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    primary: 'bg-indigo-600 hover:bg-indigo-700',
    focus: 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100',
  },
  violet: {
    grad: 'from-violet-500 to-fuchsia-600',
    brand: 'text-violet-700',
    chip: 'bg-violet-100 text-violet-800',
    navActive: 'border-violet-200 bg-violet-50 text-violet-900',
    navIdle: 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    primary: 'bg-violet-600 hover:bg-violet-700',
    focus: 'border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100',
  },
}

export interface ShellNavItem {
  id: string
  label: string
  icon: string
}

const ICONS: Record<string, ReactNode> = {
  grid: (
    <path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" />
  ),
  building: (
    <path d="M4 21V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v16M4 21h16M6 8h3m-3 4h3m-3 4h3m6-8h3v8h-3m0-2h2" />
  ),
  flag: (
    <path d="M5 4v16m0-14h9l-1 3 1 3H5M14 8h5v3h-5" />
  ),
  calendar: (
    <path d="M7 3v3m10-3v3M4 8h16M5 4h14a1 1 0 0 1 1 1v15H4V5a1 1 0 0 1 1-1Z" />
  ),
  users: (
    <path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm9 9v-1a4 4 0 0 0-3-3.9M14 4.1a3 3 0 0 1 0 5.8" />
  ),
  list: (
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  ),
  gear: (
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.4 7.4 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.4 7.4 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z" />
  ),
  user: (
    <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0" />
  ),
  clock: (
    <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3 3" />
  ),
  clipboard: (
    <path d="M9 4a2 2 0 0 1 3.4-1.4M9 4h6M9 4H7a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2M9 9h6M9 13h6" />
  ),
}

function NavIcon({ name }: { name: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-[18px] shrink-0"
      aria-hidden="true"
    >
      {ICONS[name] ?? ICONS.grid}
    </svg>
  )
}

export function BrandMark({ accent, mark = 'plus' }: { accent: Accent; mark?: 'plus' | 'star' }) {
  const classes = ACCENTS[accent]
  return (
    <span
      className={`grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm ${classes.grad}`}
    >
      {mark === 'star' ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden="true">
          <path d="M12 2.5l2.6 6.1 6.4.5-4.9 4.2 1.5 6.2L12 16l-5.6 3.5 1.5-6.2L3 9.1l6.4-.5L12 2.5Z" />
        </svg>
      ) : (
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
          <path d="M12 9v6M9 12h6" />
        </svg>
      )}
    </span>
  )
}

export function NoticeBanner({
  kind,
  children,
}: {
  kind: 'success' | 'warning' | 'error'
  children: ReactNode
}) {
  const styles = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    error: 'border-rose-200 bg-rose-50 text-rose-700',
  }
  return (
    <div className={`mb-5 rounded-xl border p-4 text-sm leading-relaxed ${styles[kind]}`}>{children}</div>
  )
}

export function SectionTitle({
  title,
  subtitle,
  chip,
}: {
  title: string
  subtitle?: string
  chip?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {chip}
    </div>
  )
}

export function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{value}</p>
      {note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}
    </div>
  )
}

export function Panel({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {aside}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

export interface BackOfficeShellProps {
  accent: Accent
  brand: string
  roleLabel: string
  scopeLabel: string
  userLabel: string
  nav: ShellNavItem[]
  active: string
  onNavigate: (id: string) => void
  onLogout: () => void
  onExit: () => void
  children: ReactNode
}

const inputClass = `w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors`

export { ACCENTS, ICONS, inputClass, NavIcon }
export default function BackOfficeShell({
  accent,
  brand,
  roleLabel,
  scopeLabel,
  userLabel,
  nav,
  active,
  onNavigate,
  onLogout,
  onExit,
  children,
}: BackOfficeShellProps) {
  const a = ACCENTS[accent]
  const initials = userLabel
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1500px]">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-5">
            <BrandMark accent={accent} mark={accent === 'emerald' ? 'plus' : 'star'} />
            <div>
              <p className="text-sm font-black tracking-tight text-slate-900">PharmaGarde CM</p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Back-office</p>
            </div>
          </div>

          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Espace</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">{brand}</p>
            <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${a.chip}`}>
              <span className="size-1.5 rounded-full bg-current" />
              {scopeLabel}
            </span>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {nav.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={active === item.id ? 'page' : undefined}
                className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  active === item.id ? a.navActive : a.navIdle
                }`}
              >
                <NavIcon name={item.icon} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="border-t border-slate-100 p-4">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <span className={`grid size-9 shrink-0 place-items-center rounded-full bg-white text-xs font-black uppercase shadow-sm ring-1 ring-slate-200 ${a.brand}`}>
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{userLabel}</p>
                <p className="truncate text-xs text-slate-500">{roleLabel}</p>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
              >
                <NavIcon name="user" /> Se déconnecter
              </button>
              <button
                type="button"
                onClick={onExit}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
              >
                <NavIcon name="grid" /> Retour au site public
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
                <BrandMark accent={accent} mark={accent === 'emerald' ? 'plus' : 'star'} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{brand}</p>
                  <p className="truncate text-xs text-slate-500">{scopeLabel}</p>
                </div>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={onExit}
                  className="hidden rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 sm:block"
                >
                  Retour au site
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors ${a.primary}`}
                >
                  Se déconnecter
                </button>
              </div>
            </div>
            <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 lg:hidden" aria-label="Navigation">
              {nav.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={active === item.id ? 'page' : undefined}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active === item.id ? a.navActive : 'text-slate-600'
                  }`}
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                </button>
              ))}
            </nav>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>

          <footer className="border-t border-slate-200 px-6 py-4 text-xs text-slate-400">
            PharmaGarde CM — données locales SQLite (démo), API Node.js prévue pour la production.
          </footer>
        </div>
      </div>
    </div>
  )
}