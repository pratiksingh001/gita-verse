import { ArrowRight, Search as SearchIcon, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useSearch } from '../api/hooks'
import type { SearchResponse } from '../api/types'
import { ErrorState, Skeleton, buttonClass } from '../components/States'
import { useDebounced, useDocumentTitle } from '../lib/hooks'
import { rise, stagger } from '../lib/motion'
import { verseUrl } from '../lib/text'

const SUGGESTIONS = ['karma', 'peace of mind', 'fear', 'surrender', 'the self', '2.47', 'कर्म']

export function Search() {
  const [params, setParams] = useSearchParams()
  const urlQuery = params.get('q') ?? ''
  const [input, setInput] = useState(urlQuery)
  const query = useDebounced(input.trim(), 300)
  const navigate = useNavigate()
  useDocumentTitle(query ? `“${query}”` : 'Search')

  // Keep the URL in step with what's being searched, so results can be shared and survive reloads.
  // (Links into search, like the theme chips, mount this page fresh, so the input starts from the URL.)
  useEffect(() => {
    if (query !== urlQuery) setParams(query ? { q: query } : {}, { replace: true })
  }, [query, urlQuery, setParams])

  const search = useSearch(query)
  const first = search.data?.pages[0]
  const results = search.data?.pages.flatMap((page) => page.results) ?? []

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const ref = first?.query === input.trim() ? first.reference : null
    if (ref) navigate(verseUrl(ref.chapter, ref.verse))
  }

  return (
    <div className="mx-auto max-w-2xl pt-12 sm:pt-16">
      <motion.h1
        initial="hidden"
        animate="show"
        variants={rise}
        className="text-center font-display text-5xl font-medium tracking-tight"
      >
        Search the Gita
      </motion.h1>

      <form onSubmit={onSubmit} role="search" className="relative mt-10">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-faint" />
        <input
          autoFocus
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="A word or idea, or a verse like 2.47"
          aria-label="Search"
          className="w-full rounded-full border border-line bg-surface/50 py-4 pr-12 pl-13 font-serif text-lg text-ink shadow-[0_12px_32px_-24px_rgb(0_0_0/0.3)] transition-all duration-300 placeholder:text-faint focus:border-accent/40 focus:bg-surface focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        <AnimatePresence>
          {input && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setInput('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-4 grid size-8 -translate-y-1/2 place-items-center rounded-full text-faint hover:bg-paper hover:text-ink"
            >
              <X className="size-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </form>

      <div className="mt-10">
        {!query ? (
          <Suggestions onPick={setInput} />
        ) : search.error ? (
          <ErrorState error={search.error} retry={search.refetch} />
        ) : !first ? (
          <ResultsSkeleton />
        ) : first.kind === 'reference' ? (
          <ReferenceResult response={first} />
        ) : first.total === 0 ? (
          <p className="py-16 text-center font-serif text-lg text-muted">
            No verses mention “{query}”. Try a simpler word, like <em>duty</em> or <em>mind</em>.
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-faint">
              {first.total} {first.total === 1 ? 'verse' : 'verses'}
            </p>
            <motion.ol key={query} initial="hidden" animate="show" variants={stagger(0.04)} className="space-y-3">
              {results.map((result) => (
                <motion.li key={result.ref} variants={rise}>
                  <Link
                    to={verseUrl(result.chapter, result.verse)}
                    className="group block rounded-2xl border border-line bg-surface/30 px-5 py-4 transition-all duration-300 ease-gentle hover:-translate-y-0.5 hover:border-accent/30 hover:bg-surface/70"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="font-display text-xl font-semibold text-accent">{result.ref}</span>
                      <span className="truncate text-xs text-faint">{result.author}</span>
                    </div>
                    <p className={`mt-2 text-reading-sm text-ink/85 ${result.language === 'hi' ? 'font-hindi' : 'font-serif'}`}>
                      {result.snippet.map((part, i) => (part.match ? <mark key={i}>{part.text}</mark> : part.text))}
                    </p>
                  </Link>
                </motion.li>
              ))}
            </motion.ol>
            {search.hasNextPage && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => search.fetchNextPage()}
                  disabled={search.isFetchingNextPage}
                  className={buttonClass}
                >
                  {search.isFetchingNextPage ? 'Loading…' : 'Show more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Suggestions({ onPick }: { onPick: (q: string) => void }) {
  return (
    <motion.div initial="hidden" animate="show" variants={stagger(0.05)} className="text-center">
      <motion.p variants={rise} className="text-xs font-medium tracking-[0.2em] text-faint uppercase">
        Try
      </motion.p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <motion.button
            key={s}
            variants={rise}
            onClick={() => onPick(s)}
            className={`rounded-full border border-line px-4 py-1.5 text-[0.95rem] text-muted transition-colors duration-300 hover:border-accent/40 hover:text-accent ${
              /[ऀ-ॿ]/.test(s) ? 'font-hindi' : 'font-serif'
            }`}
          >
            {s}
          </motion.button>
        ))}
      </div>
      <motion.p variants={rise} className="mx-auto mt-10 max-w-sm text-sm leading-relaxed text-faint">
        English words search the English translations; type in Devanagari to search the Hindi ones.
      </motion.p>
    </motion.div>
  )
}

function ReferenceResult({ response }: { response: SearchResponse }) {
  const ref = response.reference
  if (!ref) {
    return (
      <p className="py-16 text-center font-serif text-lg text-muted">
        There's no verse {response.query.trim()}. The Gita has 18 chapters; check the numbers.
      </p>
    )
  }
  return (
    <motion.div initial="hidden" animate="show" variants={rise}>
      <Link
        to={verseUrl(ref.chapter, ref.verse)}
        className="group flex items-center justify-between rounded-2xl border border-accent/30 bg-accent-soft/40 px-6 py-5 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-soft/70"
      >
        <span>
          <span className="block text-xs text-muted">Go to verse · press Enter</span>
          <span className="font-display text-3xl font-semibold">{ref.ref}</span>
        </span>
        <ArrowRight className="size-5 text-accent transition-transform group-hover:translate-x-1" />
      </Link>
    </motion.div>
  )
}

function ResultsSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Searching">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  )
}
