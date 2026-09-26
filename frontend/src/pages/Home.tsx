import { ArrowRight, BookOpen } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router'

import { useSituations, useVerseOfTheDay } from '../api/hooks'
import { KrishnaFlute } from '../components/art/KrishnaFlute'
import { Morpankh } from '../components/art/Morpankh'
import { LotusMark, Ornament } from '../components/Ornament'
import { LinkButton, SkeletonLines } from '../components/States'
import { useDocumentTitle } from '../lib/hooks'
import { rise, stagger } from '../lib/motion'
import { useLastRead } from '../lib/reading'
import { useSettings } from '../lib/settings'
import { isSpeakerLine, lines, localDate, pickTranslation, verseUrl } from '../lib/text'

const GUIDANCE_CHIPS = 6

export function Home() {
  useDocumentTitle(undefined)
  const lastRead = useLastRead()

  return (
    <motion.div initial="hidden" animate="show" variants={stagger(0.12)} className="pt-12 sm:pt-20">
      {/* Hero */}
      <section className="mx-auto max-w-2xl text-center">
        <motion.div variants={rise} className="mx-auto -mt-4 mb-4 w-56 text-accent/70 sm:w-64">
          <KrishnaFlute />
        </motion.div>
        <motion.p variants={rise} className="font-sanskrit text-lg text-accent">
          श्रीमद्भगवद्गीता
        </motion.p>
        <motion.h1
          variants={rise}
          className="mt-3 font-display text-5xl leading-[1.05] font-medium tracking-tight sm:text-7xl"
        >
          The Bhagavad Gita
        </motion.h1>
        <motion.p variants={rise} className="mx-auto mt-6 max-w-md font-serif text-lg leading-relaxed text-muted">
          Eighteen chapters. Seven hundred verses. <br className="max-sm:hidden" />
          Read slowly, one verse at a time.
        </motion.p>
        <motion.div variants={rise} className="mt-10 flex flex-wrap justify-center gap-3">
          {lastRead ? (
            <LinkButton to={verseUrl(lastRead.chapter, lastRead.verse)} primary>
              Continue at {lastRead.ref} <ArrowRight className="size-4" />
            </LinkButton>
          ) : (
            <LinkButton to={verseUrl(1, 1)} primary>
              Begin reading <ArrowRight className="size-4" />
            </LinkButton>
          )}
          <LinkButton to="/chapters">
            <BookOpen className="size-4" /> Browse chapters
          </LinkButton>
        </motion.div>
      </section>

      <motion.div variants={rise}>
        <Ornament className="mx-auto my-20 max-w-xs" />
      </motion.div>

      <motion.div variants={rise}>
        <VerseOfTheDay />
      </motion.div>

      <motion.div variants={rise}>
        <GuidanceChips />
      </motion.div>
    </motion.div>
  )
}

const chipClass =
  'rounded-full border border-line px-4 py-1.5 font-serif text-[0.95rem] text-muted transition-all duration-300 ease-gentle hover:-translate-y-0.5 hover:border-accent/40 hover:text-accent'

function GuidanceChips() {
  const { data: situations } = useSituations()
  if (!situations) return null

  return (
    <section className="mx-auto mt-24 max-w-2xl text-center">
      <h2 className="text-xs font-medium tracking-[0.2em] text-faint uppercase">What are you going through?</h2>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {situations.slice(0, GUIDANCE_CHIPS).map((s) => (
          <Link key={s.slug} to={`/guidance/${s.slug}`} className={chipClass}>
            {s.title}
          </Link>
        ))}
        <Link to="/guidance" className={`${chipClass} inline-flex items-center gap-1 border-dashed`}>
          More <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </section>
  )
}

function VerseOfTheDay() {
  const { data: verse, isPending, isError } = useVerseOfTheDay(localDate())
  const { language, translator } = useSettings()

  // The home page still works if the API is down; the card just stays hidden.
  if (isError) return null

  const translation = verse && pickTranslation(verse.translations, language, translator[language])

  return (
    <section className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-center gap-2 text-xs font-medium tracking-[0.2em] text-faint uppercase">
        <LotusMark className="size-3.5 text-accent/70" /> Verse of the day
      </div>

      <div className="glow relative">
        <Morpankh
          className="pointer-events-none absolute -top-10 -right-3 z-10 h-28 w-auto rotate-[28deg] opacity-80 sm:-right-6 sm:h-32"
        />
        <Link
          to={verse ? verseUrl(verse.chapter, verse.verse) : '/'}
          aria-disabled={!verse}
          className="group block aria-disabled:pointer-events-none rounded-3xl border border-line bg-surface/50 px-6 py-10 text-center backdrop-blur-sm transition-all duration-500 ease-gentle hover:-translate-y-1 hover:border-accent/30 hover:bg-surface/80 sm:px-12"
        >
          {isPending || !verse ? (
            <SkeletonLines count={4} className="mx-auto max-w-md" />
          ) : (
            <>
              <div className="text-sanskrit text-ink">
                {lines(verse.sanskrit_text)
                  .filter((line) => !isSpeakerLine(line))
                  .map((line) => (
                    <p key={line}>{line}</p>
                  ))}
              </div>
              {translation && (
                <>
                  <p
                    className={`mx-auto mt-8 max-w-lg text-reading text-muted ${
                      language === 'hi' ? 'font-hindi' : 'font-serif italic'
                    }`}
                  >
                    {translation.text}
                  </p>
                  <p className="mt-4 text-xs text-faint">— {translation.author}</p>
                </>
              )}
              <p className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                Read verse {verse.ref}
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </p>
            </>
          )}
        </Link>
      </div>
    </section>
  )
}
