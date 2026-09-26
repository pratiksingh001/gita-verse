import { motion } from 'motion/react'

import { Morpankh } from './Morpankh'

/**
 * Large, faint peacock feathers resting in the corners of every page, swaying slowly as if
 * in a breeze. Purely decorative: they never take clicks and sit behind all content.
 */
export function BackgroundFeather() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden print:hidden">
      {/* The wrapper sets how faint it is; the inner element fades in and sways. */}
      <div className="absolute -top-16 -right-10 h-[62vh] max-h-160 min-h-85 opacity-[0.13] sm:-right-4 dark:opacity-[0.09]">
        <motion.div
          className="h-full origin-bottom"
          initial={{ opacity: 0, rotate: 22 }}
          animate={{ opacity: 1, rotate: [22, 19, 22] }}
          transition={{
            opacity: { duration: 2.4, ease: 'easeOut' },
            rotate: { duration: 9, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          <Morpankh className="h-full w-auto" />
        </motion.div>
      </div>
      <div className="absolute -bottom-24 -left-16 h-[40vh] max-h-105 opacity-[0.07] max-sm:hidden dark:opacity-[0.05]">
        <motion.div
          className="h-full origin-bottom"
          initial={{ rotate: -148 }}
          animate={{ rotate: [-148, -145, -148] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Morpankh className="h-full w-auto" />
        </motion.div>
      </div>
    </div>
  )
}
