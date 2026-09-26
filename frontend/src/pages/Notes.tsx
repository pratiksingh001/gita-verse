import { motion } from 'motion/react'
import { Link, Navigate } from 'react-router'

import type { Highlight } from '../api/types'
import { LinkButton, Message, Skeleton } from '../components/States'
import { useUser } from '../lib/account'
import { HIGHLIGHTS, useAnnotations } from '../lib/annotations'
import { useDocumentTitle } from '../lib/hooks'
import { rise, stagger } from '../lib/motion'
import { verseUrl } from '../lib/text'

const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

export function Notes() {
  useDocumentTitle('My notes')
  const { data: user, isPending: userPending } = useUser()
  const { annotations, isLoading } = useAnnotations()

  if (userPending) return null
  if (!user) return <Navigate to="/signin" state={{ from: '/notes' }} replace />

  if (!isLoading && !annotations.length) {
    return (
      <Message title="No notes yet" action={<LinkButton to="/chapters">Start reading</LinkButton>}>
        Open any verse to highlight it or write down what it means to you. Your notes are private.
      </Message>
    )
  }

  return (
    <div className="mx-auto max-w-2xl pt-12 sm:pt-16">
      <motion.header initial="hidden" animate="show" variants={stagger(0.08)}>
        <motion.h1 variants={rise} className="font-display text-5xl font-medium tracking-tight">
          My notes
        </motion.h1>
        <motion.p variants={rise} className="mt-3 text-sm text-faint">
          Highlights and reflections, newest first · visible only to you
        </motion.p>
      </motion.header>

      {isLoading ? (
        <div className="mt-10 space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <motion.ul initial="hidden" animate="show" variants={stagger(0.05, 0.1)} className="mt-10 space-y-3">
          {annotations.map((a) => (
            <motion.li key={a.ref} variants={rise}>
              <Link
                to={verseUrl(a.chapter, a.verse)}
                className="relative block overflow-hidden rounded-2xl border border-line bg-surface/30 py-4 pr-5 pl-6 transition-all duration-300 ease-gentle hover:-translate-y-0.5 hover:border-accent/30 hover:bg-surface/70"
              >
                {a.highlight && <HighlightBar color={a.highlight} />}
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-xl font-semibold text-accent">{a.ref}</span>
                  <span className="text-xs text-faint">{a.chapter_name}</span>
                </div>
                {a.note ? (
                  <p className="mt-2 font-serif text-reading-sm whitespace-pre-line text-ink/85">{a.note}</p>
                ) : (
                  <p className="mt-2 text-sm text-faint italic">Highlighted</p>
                )}
                <p className="mt-2 text-xs text-faint">{dateFormat.format(new Date(a.updated_at))}</p>
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  )
}

export function HighlightBar({ color }: { color: Highlight }) {
  return (
    <span
      aria-label={`${HIGHLIGHTS[color].label} highlight`}
      className="absolute inset-y-0 left-0 w-1"
      style={{ backgroundColor: HIGHLIGHTS[color].color }}
    />
  )
}
