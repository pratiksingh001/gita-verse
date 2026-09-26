import { Minus, Monitor, Moon, Plus, SlidersHorizontal, Sun } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useEffect, useRef, useState } from 'react'

import type { Language } from '../api/types'
import { ease } from '../lib/motion'
import { TEXT_SCALES, type Theme, updateSettings, useSettings } from '../lib/settings'
import { Segmented } from './Segmented'

export function SettingsPanel() {
  const [open, setOpen] = useState(false)
  const settings = useSettings()
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Reading settings"
        className={`grid size-10 place-items-center rounded-full transition-colors duration-300 hover:bg-surface hover:text-ink ${
          open ? 'bg-surface text-ink' : 'text-muted'
        }`}
      >
        <SlidersHorizontal className="size-4.5" strokeWidth={1.6} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.25, ease }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-line bg-paper/95 p-5 shadow-[0_24px_48px_-24px_rgb(0_0_0/0.25)] backdrop-blur-xl"
          >
            <p className="mb-4 font-display text-xl font-medium">Reading settings</p>

            <Row label="Theme">
              <Segmented<Theme>
                id="theme"
                label="Theme"
                value={settings.theme}
                onChange={(theme) => updateSettings({ theme })}
                options={[
                  { value: 'light', label: <Sun className="size-3.5" />, title: 'Light' },
                  { value: 'dark', label: <Moon className="size-3.5" />, title: 'Dark' },
                  { value: 'system', label: <Monitor className="size-3.5" />, title: 'Match device' },
                ]}
              />
            </Row>

            <Row label="Translation">
              <Segmented<Language>
                id="language"
                label="Translation language"
                value={settings.language}
                onChange={(language) => updateSettings({ language })}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'hi', label: <span className="font-hindi">हिन्दी</span> },
                ]}
              />
            </Row>

            <Row label="Text size">
              <div className="flex items-center gap-2">
                <StepButton
                  label="Smaller text"
                  disabled={settings.textSize === 0}
                  onClick={() => updateSettings({ textSize: settings.textSize - 1 })}
                >
                  <Minus className="size-3.5" />
                </StepButton>
                <div className="flex gap-1" aria-hidden="true">
                  {TEXT_SCALES.map((_, i) => (
                    <span
                      key={i}
                      className={`size-1.5 rounded-full transition-colors duration-300 ${
                        i <= settings.textSize ? 'bg-accent' : 'bg-line'
                      }`}
                    />
                  ))}
                </div>
                <StepButton
                  label="Larger text"
                  disabled={settings.textSize === TEXT_SCALES.length - 1}
                  onClick={() => updateSettings({ textSize: settings.textSize + 1 })}
                >
                  <Plus className="size-3.5" />
                </StepButton>
              </div>
            </Row>

            <Row label="Transliteration">
              <Switch
                label="Show transliteration"
                checked={settings.showTransliteration}
                onChange={(showTransliteration) => updateSettings({ showTransliteration })}
              />
            </Row>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line py-3 first-of-type:border-t-0">
      <span className="text-sm text-muted">{label}</span>
      {children}
    </div>
  )
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-7 place-items-center rounded-full border border-line text-muted transition-colors hover:text-ink disabled:opacity-40 disabled:hover:text-muted"
    >
      {children}
    </button>
  )
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-10 rounded-full transition-colors duration-300 ${checked ? 'bg-accent' : 'bg-line'}`}
    >
      <motion.span
        className="absolute top-0.5 left-0.5 size-5 rounded-full bg-paper shadow-sm"
        animate={{ x: checked ? 16 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      />
    </button>
  )
}
