import { motion } from 'motion/react'
import { Link } from 'react-router'

import { useChapters } from '../api/hooks'
import { ErrorState, Skeleton } from '../components/States'
import { useDocumentTitle } from '../lib/hooks'
import { rise, stagger } from '../lib/motion'

export function Chapters() {
  useDocumentTitle('Chapters')
  const { data: chapters, isPending, error, refetch } = useChapters()

  return (
    <div className="pt-12 sm:pt-16">
      <motion.header initial="hidden" animate="show" variants={stagger(0.08)} className="max-w-xl">
        <motion.p variants={rise} className="text-xs font-medium tracking-[0.2em] text-faint uppercase">
          अध्याय · Chapters
        </motion.p>
        <motion.h1 variants={rise} className="mt-3 font-display text-5xl font-medium tracking-tight">
          Eighteen chapters
        </motion.h1>
        <motion.p variants={rise} className="mt-4 font-serif text-lg leading-relaxed text-muted">
          A conversation on a battlefield between Arjuna and Krishna, moving from despair to clarity.
        </motion.p>
      </motion.header>

      {error ? (
        <ErrorState error={error} retry={refetch} />
      ) : (
        <motion.ol
          initial="hidden"
          animate="show"
          variants={stagger(0.04, 0.15)}
          className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {isPending
            ? Array.from({ length: 9 }, (_, i) => <li key={i}><Skeleton className="h-44 rounded-2xl" /></li>)
            : chapters.map((chapter) => (
                <motion.li key={chapter.number} variants={rise}>
                  <Link
                    to={`/chapter/${chapter.number}`}
                    className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface/40 p-6 transition-all duration-500 ease-gentle hover:-translate-y-1 hover:border-accent/30 hover:bg-surface/80 hover:shadow-[0_20px_40px_-28px_rgb(0_0_0/0.35)]"
                  >
                    {/* Large faint numeral in the corner */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-3 right-3 font-display text-8xl font-light text-line transition-colors duration-500 group-hover:text-accent/15"
                    >
                      {chapter.number}
                    </span>
                    <span className="text-xs font-medium tracking-[0.15em] text-accent uppercase">
                      Chapter {chapter.number}
                    </span>
                    <span className="mt-4 font-sanskrit text-lg text-muted">{chapter.name_sanskrit}</span>
                    <span className="mt-1 font-display text-2xl leading-tight font-medium">
                      {chapter.name_translation}
                    </span>
                    <span className="mt-1 font-serif text-muted italic">{chapter.name_meaning}</span>
                    <span className="mt-auto pt-6 text-xs text-faint">{chapter.verse_count} verses</span>
                  </Link>
                </motion.li>
              ))}
        </motion.ol>
      )}
    </div>
  )
}
