import { ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router'

import { useSituations } from '../api/hooks'
import { ErrorState, Skeleton } from '../components/States'
import { useDocumentTitle } from '../lib/hooks'
import { rise, stagger } from '../lib/motion'

export function Situations() {
  useDocumentTitle('Guidance')
  const { data: situations, isPending, error, refetch } = useSituations()

  return (
    <div className="pt-12 sm:pt-16">
      <motion.header initial="hidden" animate="show" variants={stagger(0.08)} className="max-w-xl">
        <motion.p variants={rise} className="text-xs font-medium tracking-[0.2em] text-faint uppercase">
          मार्गदर्शन · Guidance
        </motion.p>
        <motion.h1 variants={rise} className="mt-3 font-display text-5xl font-medium tracking-tight">
          What are you going through?
        </motion.h1>
        <motion.p variants={rise} className="mt-4 font-serif text-lg leading-relaxed text-muted">
          The Gita begins with a person overwhelmed by doubt and grief. These verses speak to the moments we all
          face.
        </motion.p>
      </motion.header>

      {error ? (
        <ErrorState error={error} retry={refetch} />
      ) : (
        <motion.ul
          initial="hidden"
          animate="show"
          variants={stagger(0.04, 0.15)}
          className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {isPending
            ? Array.from({ length: 6 }, (_, i) => (
                <li key={i}>
                  <Skeleton className="h-36 rounded-2xl" />
                </li>
              ))
            : situations.map((s) => (
                <motion.li key={s.slug} variants={rise}>
                  <Link
                    to={`/guidance/${s.slug}`}
                    className="group flex h-full flex-col rounded-2xl border border-line bg-surface/40 p-6 transition-all duration-500 ease-gentle hover:-translate-y-1 hover:border-accent/30 hover:bg-surface/80 hover:shadow-[0_20px_40px_-28px_rgb(0_0_0/0.35)]"
                  >
                    <span className="font-display text-2xl leading-tight font-medium">{s.title}</span>
                    <span className="mt-2 font-serif text-muted">{s.description}</span>
                    <span className="mt-auto flex items-center justify-between pt-6 text-xs text-faint">
                      {s.verse_count} verses
                      <ArrowRight className="size-4 text-accent opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
                    </span>
                  </Link>
                </motion.li>
              ))}
        </motion.ul>
      )}
    </div>
  )
}
