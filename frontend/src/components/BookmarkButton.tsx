import { Bookmark } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

export function BookmarkButton({ saved, onToggle }: { saved: boolean; onToggle: () => void }) {
  return (
    <motion.button
      onClick={onToggle}
      whileTap={{ scale: 0.85 }}
      aria-pressed={saved}
      aria-label={saved ? 'Remove bookmark' : 'Bookmark this verse'}
      title={saved ? 'Remove bookmark (B)' : 'Bookmark (B)'}
      className="relative grid size-10 place-items-center rounded-full text-muted transition-colors duration-300 hover:bg-surface hover:text-accent"
    >
      <motion.span
        key={String(saved)}
        initial={{ scale: saved ? 0.6 : 1 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
      >
        <Bookmark className={`size-5 ${saved ? 'fill-accent text-accent' : ''}`} strokeWidth={1.6} />
      </motion.span>
      {/* A soft ring that ripples out when a verse is saved. */}
      <AnimatePresence>
        {saved && (
          <motion.span
            key="ripple"
            className="absolute inset-0 rounded-full border border-accent"
            initial={{ opacity: 0.6, scale: 0.6 }}
            animate={{ opacity: 0, scale: 1.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  )
}
