import { ArrowLeft, ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'
import { Link, useParams } from 'react-router'

import { useSituation } from '../api/hooks'
import { LotusMark } from '../components/Ornament'
import { ErrorState, Skeleton, SkeletonLines } from '../components/States'
import { useDocumentTitle } from '../lib/hooks'
import { rise, stagger } from '../lib/motion'
import { useSettings } from '../lib/settings'
import { isSpeakerLine, lines, verseUrl } from '../lib/text'

export function Situation() {
  const slug = useParams().slug ?? ''
  const { language } = useSettings()
  const { data: situation, isPending, error, refetch } = useSituation(slug, language)
  useDocumentTitle(situation?.title)

  if (error) return <ErrorState error={error} retry={refetch} />

  return (
    <div className="mx-auto max-w-2xl pt-10 sm:pt-14">
      <Link to="/guidance" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent">
        <ArrowLeft className="size-4" /> All situations
      </Link>

      {isPending ? (
        <div className="pt-12">
          <Skeleton className="h-12 w-3/4" />
          <SkeletonLines count={3} className="mt-12" />
        </div>
      ) : (
        <>
          <motion.header initial="hidden" animate="show" variants={stagger(0.08)} className="mt-10">
            <motion.h1 variants={rise} className="font-display text-5xl leading-tight font-medium tracking-tight">
              {situation.title}
            </motion.h1>
            <motion.p variants={rise} className="mt-4 font-serif text-lg text-muted">
              {situation.description}
            </motion.p>
          </motion.header>

          <motion.ol initial="hidden" animate="show" variants={stagger(0.12, 0.2)} className="mt-14 space-y-14">
            {situation.verses.map((v, i) => (
              <motion.li key={v.ref} variants={rise} className="relative">
                <div className="flex items-baseline gap-4">
                  <span className="font-display text-4xl font-light text-line">{String(i + 1).padStart(2, '0')}</span>
                  <p className="font-serif text-lg leading-relaxed text-ink italic">{v.note}</p>
                </div>

                <Link
                  to={verseUrl(v.chapter, v.verse)}
                  className="group mt-5 block rounded-2xl border border-line bg-surface/40 px-6 py-6 transition-all duration-500 ease-gentle hover:-translate-y-0.5 hover:border-accent/30 hover:bg-surface/80"
                >
                  <div className="text-center text-sanskrit text-ink/90">
                    {lines(v.sanskrit_text)
                      .filter((line) => !isSpeakerLine(line))
                      .map((line) => (
                        <p key={line} className="text-[0.85em]">
                          {line}
                        </p>
                      ))}
                  </div>
                  <p className={`mt-5 text-reading-sm text-muted ${language === 'hi' ? 'font-hindi' : 'font-serif'}`}>
                    {v.translation}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-xs text-faint">
                    <span>— {v.author}</span>
                    <span className="flex items-center gap-1 font-medium text-accent">
                      Verse {v.ref}
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </motion.li>
            ))}
          </motion.ol>

          <div className="mt-20 flex flex-col items-center gap-3 text-center">
            <LotusMark className="size-5 text-accent/60" />
            <Link to="/guidance" className="text-sm text-muted transition-colors hover:text-accent">
              Explore other situations
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
