import { useEffect } from 'react'

import type { Language } from '../api/types'
import { createPersistentStore, useStore } from './store'

export type Theme = 'light' | 'dark' | 'system'

export interface Settings {
  theme: Theme
  language: Language
  textSize: number // index into TEXT_SCALES
  showTransliteration: boolean
  autoplay: boolean // continue to the next verse's recitation when one finishes
  music: boolean // soft flute music in the background
  musicVolume: number // 0..1
  translator: Record<Language, string> // preferred translator per language
}

export const TEXT_SCALES = [0.9, 1, 1.12, 1.25]

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  language: 'en',
  textSize: 1,
  showTransliteration: true,
  autoplay: true,
  music: true,
  musicVolume: 0.35,
  translator: { en: 'Swami Sivananda', hi: 'Swami Ramsukhdas' },
}

// The key is also read by the inline script in index.html to avoid a theme flash.
export const settingsStore = createPersistentStore<Settings>('gita.settings', DEFAULT_SETTINGS, (saved) => {
  const s = (saved ?? {}) as Partial<Settings>
  return { ...DEFAULT_SETTINGS, ...s, translator: { ...DEFAULT_SETTINGS.translator, ...s.translator } }
})

export function useSettings() {
  return useStore(settingsStore)
}

export function updateSettings(patch: Partial<Settings>) {
  settingsStore.set((prev) => ({ ...prev, ...patch }))
}

/** Keeps <html> in sync with the theme and text-size settings. Mount once. */
export function useApplySettings() {
  const { theme, textSize } = useSettings()

  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#14130F' : '#FAF7F2')
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    const scale = TEXT_SCALES[textSize] ?? 1
    document.documentElement.style.setProperty('--reading-scale', String(scale))
  }, [textSize])
}
