import { motion } from 'motion/react'
import type { ReactNode } from 'react'

interface Option<T> {
  value: T
  label: ReactNode
  title?: string
}

/** A pill switch whose highlight glides to the selected option. */
export function Segmented<T extends string | number>({
  id,
  value,
  options,
  onChange,
  label,
}: {
  id: string // unique per instance, so each switch animates its own highlight
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-line bg-surface/60 p-0.5">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={String(option.value)}
            role="radio"
            aria-checked={active}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={`relative flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors duration-300 ${
              active ? 'text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${id}`}
                className="absolute inset-0 rounded-full bg-paper shadow-sm ring-1 ring-line"
                transition={{ type: 'spring', stiffness: 400, damping: 34 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
