import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { apiGet } from '../api/client'
import { useChapters, useVerse } from '../api/hooks'
import type { Language, VerseDetail, VerseRef } from '../api/types'
import { BookmarkButton } from '../components/BookmarkButton'
import type { NavState } from '../components/Layout'
import { Ornament } from '../components/Ornament'
import { Segmented } from '../components/Segmented'
import { ErrorState, Skeleton, SkeletonLines } from '../components/States'
import { isTyping, useDocumentTitle } from '../lib/hooks'
import { ease, rise, stagger } from '../lib/motion'
import { setLastRead, type SavedVerse, useBookmarks } from '../lib/reading'
import { updateSettings, useSettings } from '../lib/settings'
import { excerpt, isSpeakerLine, lines, parseWordMeanings, pickTranslation, translationsIn, verseUrl } from '../lib/text'

export function Verse() {
  const params = useParams()
  const chapter = Number(params.chapter)
  const number = Number(params.verse)
  const { data: verse, isPending, error, refetch } = useVerse(chapter, number)
  const settings = useSettings()
  const { isBookmarked, toggle } = useBookmarks()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  useDocumentTitle(verse ? `Bhagavad Gita ${verse.ref}` : undefined)

  const translation = verse && pickTranslation(verse.translations, settings.language, settings.translator[settings.language])
  // What a bookmark stores; the excerpt is in whichever translation is showing.
  const saved = useMemo<SavedVerse | undefined>(
    () =>
      verse && {
        chapter: verse.chapter,
        verse: verse.verse,
        ref: verse.ref,
        chapterName: verse.chapter_name,
        excerpt: excerpt(translation?.text ?? ''),
        at: new Date().toISOString(),
      },
    [verse, translation],
  )

  // Remember the reading position, and preload the neighbours so next/prev feel instant.
  useEffect(() => {
    if (!verse) return
    setLastRead({
      chapter: verse.chapter,
      verse: verse.verse,
      ref: verse.ref,
      chapterName: verse.chapter_name,
      excerpt: '',
      at: new Date().toISOString(),
    })
    for (const neighbour of [verse.prev, verse.next]) {
      if (neighbour) {
        queryClient.prefetchQuery({
          queryKey: ['verse', neighbour.chapter, neighbour.verse],
          queryFn: () => apiGet<VerseDetail>(`/api/verses/${neighbour.chapter}/${neighbour.verse}`),
        })
      }
    }
  }, [verse, queryClient])

  // ← / → move between verses, B bookmarks.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!verse || isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return
      const go = (ref: VerseRef | null, dir: 1 | -1) =>
        ref && navigate(verseUrl(ref.chapter, ref.verse), { state: { dir } satisfies NavState })
      if (e.key === 'ArrowRight') go(verse.next, 1)
      else if (e.key === 'ArrowLeft') go(verse.prev, -1)
      else if (e.key.toLowerCase() === 'b' && saved) toggle(saved)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [verse, saved, navigate, toggle])

  if (error) return <ErrorState error={error} retry={refetch} />
  if (isPending) return <VerseSkeleton />

  const sanskrit = lines(verse.sanskrit_text)
  const transliteration = lines(verse.transliteration)

  return (
    <article className="pt-8 sm:pt-12">
      <ChapterProgress chapter={verse.chapter} verse={verse.verse} />

      <div className="flex items-center justify-between">
        <Link
          to={`/chapter/${verse.chapter}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent"
        >
          <ArrowLeft className="size-4" />
          Chapter {verse.chapter} <span className="text-faint">·</span>{' '}
          <span className="max-sm:hidden">{verse.chapter_name}</span>
        </Link>
        {saved && <BookmarkButton saved={isBookmarked(verse.ref)} onToggle={() => toggle(saved)} />}
      </div>

      <motion.div initial="hidden" animate="show" variants={stagger(0.1)} className="mx-auto max-w-2xl">
        <motion.p variants={rise} className="mt-8 text-center text-xs font-medium tracking-[0.25em] text-accent uppercase">
          Verse {verse.ref}
        </motion.p>

        {/* Sanskrit */}
        <motion.div variants={rise} className="mt-8 text-center text-ink">
          {sanskrit.map((line, i) =>
            isSpeakerLine(line) ? (
              <p key={i} className="mb-3 font-sanskrit text-base text-muted">
                {line}
              </p>
            ) : (
              <p key={i} className="text-sanskrit">
                {line}
              </p>
            ),
          )}
        </motion.div>

        {/* Transliteration */}
        <AnimatePresence initial={false}>
          {settings.showTransliteration && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.45, ease }}
              className="overflow-hidden"
            >
              <motion.div variants={rise} className="pt-6 text-center font-serif text-reading-sm text-muted italic">
                {transliteration.map((line, i) => (
                  <p key={i} className={isSpeakerLine(line) ? 'mb-2 text-sm text-faint' : ''}>
                    {line}
                  </p>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div variants={rise}>
          <Ornament className="mx-auto my-12 max-w-48" />
        </motion.div>

        {/* Translation */}
        <motion.section variants={rise} aria-label="Translation">
          <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
            <Segmented<Language>
              id="verse-language"
              label="Translation language"
              value={settings.language}
              onChange={(language) => updateSettings({ language })}
              options={[
                { value: 'en', label: 'English' },
                { value: 'hi', label: <span className="font-hindi">हिन्दी</span> },
              ]}
            />
            <TranslatorSelect verse={verse} language={settings.language} current={translation?.author} />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {translation && (
              <motion.figure
                key={translation.author}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3, ease }}
                className="text-center"
              >
                <blockquote className={`text-reading text-ink ${settings.language === 'hi' ? 'font-hindi' : 'font-serif'}`}>
                  {translation.text}
                </blockquote>
                <figcaption className="mt-5 text-sm text-faint">— {translation.author}</figcaption>
              </motion.figure>
            )}
          </AnimatePresence>
        </motion.section>

        <motion.div variants={rise}>
          <WordMeanings text={verse.word_meanings} />
        </motion.div>
      </motion.div>

      <VerseNav prev={verse.prev} next={verse.next} />
    </article>
  )
}

function TranslatorSelect({ verse, language, current }: { verse: VerseDetail; language: Language; current?: string }) {
  const settings = useSettings()
  const authors = translationsIn(verse.translations, language).map((t) => t.author)
  if (authors.length < 2) return null

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Translator</span>
      <select
        value={current}
        onChange={(e) => updateSettings({ translator: { ...settings.translator, [language]: e.target.value } })}
        className="cursor-pointer appearance-none rounded-full border border-line bg-surface/60 py-1.5 pr-8 pl-3.5 text-xs font-medium text-muted transition-colors hover:text-ink"
      >
        {authors.map((author) => (
          <option key={author}>{author}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-3.5 text-faint" />
    </label>
  )
}

function WordMeanings({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const words = parseWordMeanings(text)
  if (!words.length) return null

  return (
    <section className="mt-14 border-t border-line pt-6">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mx-auto flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-accent"
      >
        Word by word meaning
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
            <dl className="grid gap-x-6 gap-y-3 pt-6 sm:grid-cols-2">
              {words.map(({ term, meaning }, i) => (
                <div key={i} className="flex gap-3 border-b border-line/60 pb-3 text-[0.95rem]">
                  <dt className="font-serif text-accent italic">{term}</dt>
                  <dd className="text-muted">{meaning}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

function VerseNav({ prev, next }: { prev: VerseRef | null; next: VerseRef | null }) {
  const card =
    'group flex flex-1 flex-col rounded-2xl border border-line px-5 py-4 transition-all duration-300 ease-gentle hover:-translate-y-0.5 hover:border-accent/30 hover:bg-surface/60'
  return (
    <nav className="mx-auto mt-16 flex max-w-2xl gap-3" aria-label="Verse navigation">
      {prev ? (
        <Link to={verseUrl(prev.chapter, prev.verse)} state={{ dir: -1 } satisfies NavState} className={card}>
          <span className="flex items-center gap-1 text-xs text-faint">
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" /> Previous
          </span>
          <span className="mt-1 font-display text-2xl font-medium">{prev.ref}</span>
        </Link>
      ) : (
        <span className="flex-1" />
      )}
      {next ? (
        <Link to={verseUrl(next.chapter, next.verse)} state={{ dir: 1 } satisfies NavState} className={`${card} items-end text-right`}>
          <span className="flex items-center gap-1 text-xs text-faint">
            Next <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
          <span className="mt-1 font-display text-2xl font-medium">{next.ref}</span>
        </Link>
      ) : (
        <span className="flex-1" />
      )}
    </nav>
  )
}

/** A hairline under the header showing how far through the chapter this verse is. */
function ChapterProgress({ chapter, verse }: { chapter: number; verse: number }) {
  const { data: chapters } = useChapters()
  const total = chapters?.find((c) => c.number === chapter)?.verse_count
  if (!total) return null

  return (
    <div
      className="fixed inset-x-0 top-16 z-30 h-px bg-line/60"
      role="progressbar"
      aria-label={`Verse ${verse} of ${total} in chapter ${chapter}`}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={verse}
    >
      <motion.div
        className="h-full origin-left bg-accent"
        initial={{ scaleX: (verse - 1) / total }}
        animate={{ scaleX: verse / total }}
        transition={{ duration: 0.8, ease }}
      />
    </div>
  )
}

function VerseSkeleton() {
  return (
    <div className="mx-auto max-w-2xl pt-24 text-center">
      <Skeleton className="mx-auto h-3 w-24" />
      <Skeleton className="mx-auto mt-10 h-8 w-4/5" />
      <Skeleton className="mx-auto mt-4 h-8 w-3/4" />
      <SkeletonLines count={3} className="mt-20" />
    </div>
  )
}
