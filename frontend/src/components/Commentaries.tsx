import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useState } from 'react'

import { useCommentaries } from '../api/hooks'
import type { Commentary } from '../api/types'
import { ease } from '../lib/motion'
import { useSettings } from '../lib/settings'
import { lines } from '../lib/text'
import { Disclosure } from './Disclosure'
import { PillSelect } from './PillSelect'
import { Segmented } from './Segmented'
import { SkeletonLines } from './States'

type CommentaryLanguage = Commentary['language']

const LANGUAGE_LABELS: Record<CommentaryLanguage, ReactNode> = {
  en: 'English',
  hi: <span className="font-hindi">हिन्दी</span>,
  sa: <span className="font-sanskrit">संस्कृत</span>,
}

// Longer commentaries start folded to about this many characters.
const PREVIEW_LENGTH = 900

export function Commentaries({ chapter, verse }: { chapter: number; verse: number }) {
  const [open, setOpen] = useState(false)
  const { data, isPending, isError, refetch } = useCommentaries(chapter, verse, open)

  return (
    <Disclosure label="Commentaries" open={open} onToggle={() => setOpen((o) => !o)}>
      <div className="pt-6">
        {isError ? (
          <p className="text-center text-sm text-muted">
            Couldn't load the commentaries.{' '}
            <button onClick={() => refetch()} className="font-medium text-accent">
              Try again
            </button>
          </p>
        ) : isPending ? (
          <SkeletonLines count={5} />
        ) : data.length === 0 ? (
          <p className="text-center text-sm text-muted">No commentaries on this verse.</p>
        ) : (
          <CommentaryReader commentaries={data} />
        )}
      </div>
    </Disclosure>
  )
}

function CommentaryReader({ commentaries }: { commentaries: Commentary[] }) {
  const settings = useSettings()
  const languages = (['en', 'hi', 'sa'] as const).filter((l) => commentaries.some((c) => c.language === l))
  const [language, setLanguage] = useState<CommentaryLanguage>(
    languages.includes(settings.language) ? settings.language : languages[0],
  )
  const inLanguage = commentaries.filter((c) => c.language === language)
  const [author, setAuthor] = useState(inLanguage[0].author)
  const current = inLanguage.find((c) => c.author === author) ?? inLanguage[0]

  const chooseLanguage = (next: CommentaryLanguage) => {
    setLanguage(next)
    setAuthor(commentaries.find((c) => c.language === next)!.author)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {languages.length > 1 && (
          <Segmented<CommentaryLanguage>
            id="commentary-language"
            label="Commentary language"
            value={language}
            onChange={chooseLanguage}
            options={languages.map((l) => ({ value: l, label: LANGUAGE_LABELS[l] }))}
          />
        )}
        <PillSelect
          label="Commentator"
          value={current.author}
          options={inLanguage.map((c) => c.author)}
          onChange={setAuthor}
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${current.language}-${current.author}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3, ease }}
        >
          <CommentaryText commentary={current} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function CommentaryText({ commentary }: { commentary: Commentary }) {
  const [expanded, setExpanded] = useState(false)
  const long = commentary.text.length > PREVIEW_LENGTH
  const font = commentary.language === 'en' ? 'font-serif' : commentary.language === 'hi' ? 'font-hindi' : 'font-sanskrit'

  return (
    <div className="mt-6">
      <div
        className={`relative space-y-4 text-reading-sm text-ink/85 ${font} ${
          long && !expanded ? 'max-h-80 overflow-hidden' : ''
        }`}
      >
        {lines(commentary.text).map((paragraph, i) => (
          <p key={i} className={/^Verses \d/.test(paragraph) ? 'font-sans text-xs text-faint' : ''}>
            {paragraph}
          </p>
        ))}
        {long && !expanded && (
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-paper to-transparent" />
        )}
      </div>
      {long && (
        <button onClick={() => setExpanded((e) => !e)} className="mt-3 text-sm font-medium text-accent">
          {expanded ? 'Show less' : 'Read full commentary'}
        </button>
      )}
      <p className="mt-4 text-xs text-faint">— {commentary.author}</p>
    </div>
  )
}
