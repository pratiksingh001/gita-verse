import type { Transition, Variants } from 'motion/react'

// One easing curve everywhere: quick start, long soft landing.
export const ease = [0.22, 1, 0.36, 1] as const

export const gentle: Transition = { duration: 0.6, ease }

/** Children fade and rise into place one after another. */
export function stagger(gap = 0.06, delay = 0): Variants {
  return { hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } }
}

export const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: gentle },
}

export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.8, ease } },
}
