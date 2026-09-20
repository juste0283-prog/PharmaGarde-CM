import type { ReactNode } from 'react'
import ThemeToggle from './ThemeToggle'

export type Accent = 'emerald' | 'indigo' | 'violet'

const ACCENTS: Record<
  Accent,
  {
    grad: string
    sideGrad: string
    avatarGrad: string
    brand: string
    chip: string
    bar: string
    soft: string
    navActive: string
    navIdle: string
    primary: string
    focus: string
  }
> = {
  emerald: {
    grad: 'from-emerald-500 to-teal-600',
    sideGrad: 'from-emerald-900 via-emerald-800 to-teal-900',
    avatarGrad: 'from-emerald-500 to-teal-600',
    brand: 'text-emerald-700',
    chip: 'bg-emerald-100 text-emerald-800',
    bar: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    soft: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
    navActive: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/25',
    navIdle: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white',
    primary:
      'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-sm shadow-emerald-600/25',
    focus: 'border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:border-slate-600',
  },
  indigo: {
    grad: 'from-indigo-500 to-violet-600',
    sideGrad: 'from-indigo-950 via-indigo-900 to-violet-950',
    avatarGrad: 'from-indigo-500 to-violet-600',
    brand: 'text-indigo-700',
    chip: 'bg-indigo-50 text-indigo-700',
    bar: 'bg-gradient-to-r from-indigo-500 to-violet-500',
    soft: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100',
    navActive: 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-500/25',
    navIdle: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white',
    primary:
      'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-sm shadow-indigo-600/25',
    focus: 'border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-600',
  },
  violet: {
    grad: 'from-violet-500 to-fuchsia-600',
    sideGrad: 'from-violet-950 via-violet-900 to-fuchsia-950',
    avatarGrad: 'from-violet-500 to-fuchsia-600',
    brand: 'text-violet-700',
    chip: 'bg-violet-100 text-violet-800',
    bar: 'bg-gradient-to-r from-violet-500 to-fuchsia-500',
    soft: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
    navActive: 'bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-sm shadow-violet-500/25',
    navIdle: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white',
    primary:
      'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-sm shadow-violet-600/25',
    focus: 'border-slate-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 dark:border-slate-600',
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
  check: (
    <path d="M20 6 9 17l-5-5" />
  ),
  pin: (
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
  ),
  phone: (
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z" />
  ),
  shield: (
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
  ),
  refresh: (
    <path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" />
  ),
  lock: (
    <path d="M12 17v-2m-7 6h14V10H5v11Zm7-13a2 2 0 0 1 2 2v2H10v-2a2 2 0 0 1 2-2Z" />
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

export function BrandMark(_props: { accent: Accent }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1 shadow-md ring-1 ring-white/25">
      <img src="/logo.png" alt="Logo PharmaGarde CM" className="size-6 object-contain" />
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
    success: {
      wrap: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200',
      dot: 'bg-emerald-500',
      glow: 'text-emerald-600',
      glyph: <NavIcon name="check" />,
    },
    warning: {
      wrap: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200',
      dot: 'bg-amber-500',
      glow: 'text-amber-600',
      glyph: <NavIcon name="clock" />,
    },
    error: {
      wrap: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200',
      dot: 'bg-rose-500',
      glow: 'text-rose-600',
      glyph: <NavIcon name="flag" />,
    },
  }[kind]

  return (
    <div
      className={`pg-animate-rise mb-5 flex items-start gap-3 rounded-2xl border p-4 text-sm leading-relaxed shadow-sm ${styles.wrap}`}
    >
      <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-white shadow-sm ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10 ${styles.glow}`}>
        {styles.glyph}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
      <span className={`mt-1 size-2 shrink-0 rounded-full ${styles.dot} pg-animate-pulse-dot`} aria-hidden="true" />
    </div>
  )
}

export function SectionTitle({
  title,
  subtitle,
  chip,
  icon,
  accent = 'emerald',
}: {
  title: string
  subtitle?: string
  chip?: ReactNode
  icon?: ReactNode
  accent?: Accent
}) {
  const a = ACCENTS[accent]
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon ? (
          <span className={`grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${a.grad} text-white shadow-md shadow-black/10`}>
            {icon}
          </span>
        ) : (
          <span className={`mt-2 h-7 w-1.5 shrink-0 rounded-full ${a.bar}`} aria-hidden="true" />
        )}
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {chip && <div className="flex flex-wrap items-center gap-2">{chip}</div>}
    </div>
  )
}

export function StatCard({
  label,
  value,
  note,
  icon,
  accent = 'emerald',
}: {
  label: string
  value: string
  note?: string
  icon?: ReactNode
  accent?: Accent
}) {
  const a = ACCENTS[accent]
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-slate-900/60">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${a.grad}`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        {icon && (
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${a.grad} text-white shadow-sm transition-transform duration-300 group-hover:scale-110`}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
      {note && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{note}</p>}
    </div>
  )
}

export function Panel({
  title,
  children,
  aside,
  icon,
  accent = 'emerald',
}: {
  title: string
  children: ReactNode
  aside?: ReactNode
  icon?: ReactNode
  accent?: Accent
}) {
  const a = ACCENTS[accent]
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-lg hover:shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-slate-900/60">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-5 py-4 dark:border-slate-800 dark:from-slate-900/70 dark:to-slate-900">
        <h2 className="flex items-center gap-2.5 text-sm font-bold text-slate-900 dark:text-slate-100">
          {icon && (
            <span className={`grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${a.grad} text-white shadow-sm`}>
              {icon}
            </span>
          )}
          {title}
        </h2>
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

export { ACCENTS, ICONS, NavIcon }
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
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <div className="mx-auto flex min-h-screen max-w-[1500px]">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex">
          <div className={`relative overflow-hidden bg-gradient-to-br ${a.sideGrad} px-5 pb-5 pt-6 text-white`}>
            <div
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 15% 10%, rgba(255,255,255,0.35) 0, transparent 30%), radial-gradient(circle at 90% 90%, rgba(255,255,255,0.2) 0, transparent 34%)',
              }}
              aria-hidden="true"
            />
            <div className="relative flex items-center gap-3">
              <BrandMark accent={accent} />
              <div>
                <p className="text-sm font-black tracking-tight">PharmaGarde CM</p>
                <p className="text-[11px] font-medium uppercase tracking-wider text-white/60">
                  Back-office
                </p>
              </div>
            </div>
            <div className="relative mt-5 rounded-xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">Espace</p>
              <p className="mt-0.5 truncate font-bold text-white">{brand}</p>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/10">
                <span className="pg-animate-pulse-dot size-1.5 rounded-full bg-current" />
                {scopeLabel}
              </span>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Navigation
            </p>
            {nav.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={active === item.id ? 'page' : undefined}
                className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  active === item.id ? a.navActive : `${a.navIdle} border-transparent`
                }`}
              >
                <NavIcon name={item.icon} />
                {item.label}
                {active === item.id && <span className="ml-auto size-1.5 rounded-full bg-white/80" aria-hidden="true" />}
              </button>
            ))}
          </nav>

          <div className="border-t border-slate-100 dark:border-slate-800 p-4">
            <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${a.sideGrad} p-3 text-white shadow-md`}>
              <div className="flex items-center gap-3">
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-full text-xs font-black uppercase shadow-md ring-2 ring-white/30 ${a.avatarGrad}`}
                >
                  {initials || '?'}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{userLabel}</p>
                  <p className="truncate text-xs text-white/70">{roleLabel}</p>
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-rose-50 hover:text-rose-700 dark:text-slate-300 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
              >
                <NavIcon name="user" /> Se déconnecter
              </button>
              <button
                type="button"
                onClick={onExit}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <NavIcon name="grid" /> Retour au site public
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 shadow-sm shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
            <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
                <BrandMark accent={accent} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{brand}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{scopeLabel}</p>
                </div>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <ThemeToggle className="text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" />
                <button
                  type="button"
                  onClick={onExit}
                  className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 sm:block"
                >
                  Retour au site
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-px ${a.primary}`}
                >
                  Se déconnecter
                </button>
              </div>
            </div>
            <nav
              className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 dark:border-slate-800 lg:hidden"
              aria-label="Navigation"
            >
              {nav.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={active === item.id ? 'page' : undefined}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active === item.id ? a.navActive : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                </button>
              ))}
            </nav>
          </header>

          <main className="relative flex-1 px-4 py-7 sm:px-6 lg:px-8">
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-gradient-to-br ${a.grad} opacity-[0.08] blur-3xl`}
            />
            <div className="relative z-10" key={active}>
              {children}
            </div>
          </main>

          <footer className="border-t border-slate-200 bg-white/60 px-6 py-4 text-xs text-slate-400 backdrop-blur dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-500">
            PharmaGarde CM — données locales SQLite (démo), API Node.js prévue pour la production.
          </footer>
        </div>
      </div>
    </div>
  )
}