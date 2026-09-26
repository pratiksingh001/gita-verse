import { ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'

import { useChapter } from '../api/hooks'
import type { Highlight } from '../api/types'
import type { NavState } from '../components/Layout'
import { Ornament } from '../components/Ornament'
import { ErrorState, LinkButton, Skeleton, SkeletonLines } from '../components/States'
import { useDocumentTitle } from '../lib/hooks'
import { ease, rise, stagger } from '../lib/motion'
import { HIGHLIGHTS, useAnnotations } from '../lib/annotations'
import { useBookmarks } from '../lib/reading'
import { useSettings } from '../lib/settings'
import { lines, verseUrl } from '../lib/text'

export function Chapter() {
  const number = Number(useParams().chapter)
  const { language } = useSettings()
  const { data: chapter, isPending, error, refetch } = useChapter(number, language)
  const { isBookmarked } = useBookmarks()
  const { byRef } = useAnnotations()
  useDocumentTitle(chapter ? `Chapter ${chapter.number}: ${chapter.name_translation}` : undefined)

  if (error) return <ErrorState error={error} retry={refetch} />
  if (isPending) return <ChapterSkeleton />

  const textFont = language === 'hi' ? 'font-hindi' : 'font-serif'
  const summary = lines(language === 'hi' ? chapter.summary_hi : chapter.summary_en)

  return (
    <div className="pt-10 sm:pt-14">
      <Link
        to="/chapters"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent"
      >
        <ArrowLeft className="size-4" /> All chapters
      </Link>

      <motion.header
        initial="hidden"
        animate="show"
        variants={stagger(0.08)}
        className="mx-auto mt-10 max-w-2xl text-center"
      >
        <motion.p variants={rise} className="text-xs font-medium tracking-[0.2em] text-accent uppercase">
          Chapter {chapter.number}
        </motion.p>
        <motion.p variants={rise} className="mt-5 font-sanskrit text-2xl text-muted">
          {chapter.name_sanskrit}
        </motion.p>
        <motion.h1 variants={rise} className="mt-2 font-display text-5xl font-medium tracking-tight sm:text-6xl">
          {chapter.name_translation}
        </motion.h1>
        <motion.p variants={rise} className="mt-3 font-serif text-xl text-muted italic">
          {chapter.name_meaning}
        </motion.p>
        <motion.div variants={rise} className="mt-8">
          <LinkButton to={verseUrl(chapter.number, 1)} primary>
            Start reading <ArrowRight className="size-4" />
          </LinkButton>
        </motion.div>
      </motion.header>

      <Summary paragraphs={summary} className={textFont} />

      <Ornament className="mx-auto my-14 max-w-xs" />

      <section aria-labelledby="verses-heading">
        <h2 id="verses-heading" className="mb-4 text-xs font-medium tracking-[0.2em] text-faint uppercase">
          {chapter.verse_count} verses
        </h2>
        <motion.ol initial="hidden" animate="show" variants={stagger(0.015)} className="divide-y divide-line">
          {chapter.verses.map((verse) => (
            <motion.li key={verse.verse} variants={rise}>
              <Link
                to={verseUrl(chapter.number, verse.verse)}
                className="group -mx-4 flex gap-5 rounded-xl px-4 py-4 transition-colors duration-300 hover:bg-surface/70 sm:gap-8"
              >
                <span className="relative w-12 shrink-0 pt-0.5 text-sm font-medium text-accent tabular-nums">
                  <HighlightDot highlight={byRef(verse.ref)?.highlight} />
                  {verse.ref}
                  {isBookmarked(verse.ref) && (
                    <span className="ml-1.5 inline-block size-1.5 rounded-full bg-accent align-middle" title="Bookmarked" />
                  )}
                </span>
                <span className={`line-clamp-2 text-reading-sm text-ink/85 transition-colors group-hover:text-ink ${textFont}`}>
                  {verse.translation}
                </span>
              </Link>
            </motion.li>
          ))}
        </motion.ol>
      </section>

      <nav className="mt-16 flex justify-between gap-4 border-t border-line pt-8">
        {chapter.prev ? (
          <Link
            to={`/chapter/${chapter.prev}`}
            state={{ dir: -1 } satisfies NavState}
            className="group inline-flex items-center gap-2 text-sm text-muted hover:text-accent"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" /> Chapter {chapter.prev}
          </Link>
        ) : (
          <span />
        )}
        {chapter.next && (
          <Link
            to={`/chapter/${chapter.next}`}
            state={{ dir: 1 } satisfies NavState}
            className="group inline-flex items-center gap-2 text-sm text-muted hover:text-accent"
          >
            Chapter {chapter.next} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        )}
      </nav>
    </div>
  )
}

/** Shows the first paragraph; the rest unfolds on request. */
function Summary({ paragraphs, className }: { paragraphs: string[]; className: string }) {
  const [expanded, setExpanded] = useState(false)
  const [first, ...rest] = paragraphs

  return (
    <section className={`mx-auto mt-14 max-w-2xl text-reading text-ink/85 ${className}`}>
      <p>{first}</p>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease }}
            className="overflow-hidden"
          >
            {rest.map((paragraph, i) => (
              <p key={i} className="mt-5">
                {paragraph}
              </p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {rest.length > 0 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="mt-4 inline-flex items-center gap-1 font-sans text-sm font-medium text-accent"
        >
          {expanded ? 'Show less' : 'Read full summary'}
          <ChevronDown className={`size-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </section>
  )
}

function ChapterSkeleton() {
  return (
    <div className="mx-auto max-w-2xl pt-24 text-center">
      <Skeleton className="mx-auto h-3 w-24" />
      <Skeleton className="mx-auto mt-6 h-7 w-40" />
      <Skeleton className="mx-auto mt-4 h-12 w-72" />
      <SkeletonLines count={4} className="mt-14" />
    </div>
  )
}

/** A small bar in the reader's highlight colour, in the margin beside the verse number. */
function HighlightDot({ highlight }: { highlight?: Highlight | null }) {
  if (!highlight) return null
  return (
    <span
      title={`${HIGHLIGHTS[highlight].label} highlight`}
      className="absolute top-1 -left-3 h-4 w-1 rounded-full"
      style={{ backgroundColor: HIGHLIGHTS[highlight].color }}
    />
  )
}
