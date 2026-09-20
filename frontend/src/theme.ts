import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'pharmagarde.theme'
const THEME_EVENT = 'pharmagarde:theme'

export function getTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
}

export function setTheme(theme: Theme): Theme {
  localStorage.setItem(STORAGE_KEY, theme)
  applyTheme(theme)
  window.dispatchEvent(new Event(THEME_EVENT))
  return theme
}

export function toggleTheme(): Theme {
  return setTheme(getTheme() === 'dark' ? 'light' : 'dark')
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getTheme)

  useEffect(() => {
    applyTheme(theme)
    const onThemeChange = () => setThemeState(getTheme())
    window.addEventListener(THEME_EVENT, onThemeChange)
    return () => window.removeEventListener(THEME_EVENT, onThemeChange)
  }, [theme])

  return {
    theme,
    toggle: () => setThemeState(toggleTheme()),
    setDark: () => setThemeState(setTheme('dark')),
    setLight: () => setThemeState(setTheme('light')),
  }
}