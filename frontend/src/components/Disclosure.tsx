import { ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'

import { ease } from '../lib/motion'

/** A centred toggle that unfolds its content with a height animation. */
export function Disclosure({
  label,
  open,
  onToggle,
  children,
}: {
  label: ReactNode
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <section className="border-t border-line pt-6">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="mx-auto flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-accent"
      >
        {label}
        <ChevronDown className={`size-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
