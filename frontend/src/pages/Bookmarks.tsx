import { Bookmark, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Link } from 'react-router'

import { LinkButton, Message } from '../components/States'
import { useDocumentTitle } from '../lib/hooks'
import { ease, rise, stagger } from '../lib/motion'
import { useBookmarks } from '../lib/reading'
import { verseUrl } from '../lib/text'

const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

export function Bookmarks() {
  useDocumentTitle('Bookmarks')
  const { bookmarks, remove } = useBookmarks()

  if (!bookmarks.length) {
    return (
      <Message
        title="No bookmarks yet"
        action={<LinkButton to="/chapters">Browse chapters</LinkButton>}
      >
        Tap the <Bookmark className="inline size-4 align-[-2px]" /> on any verse, or press <strong>B</strong>, to keep it
        here.
      </Message>
    )
  }

  return (
    <div className="mx-auto max-w-2xl pt-12 sm:pt-16">
      <motion.header initial="hidden" animate="show" variants={stagger(0.08)}>
        <motion.h1 variants={rise} className="font-display text-5xl font-medium tracking-tight">
          Bookmarks
        </motion.h1>
        <motion.p variants={rise} className="mt-3 text-sm text-faint">
          {bookmarks.length} saved {bookmarks.length === 1 ? 'verse' : 'verses'} · stored in this browser
        </motion.p>
      </motion.header>

      <motion.ul initial="hidden" animate="show" variants={stagger(0.05, 0.1)} className="mt-10 space-y-3">
        <AnimatePresence initial={false}>
          {bookmarks.map((b) => (
            <motion.li
              key={b.ref}
              layout
              variants={rise}
              exit={{ opacity: 0, x: -16, transition: { duration: 0.25, ease } }}
              className="group relative"
            >
              <Link
                to={verseUrl(b.chapter, b.verse)}
                className="block rounded-2xl border border-line bg-surface/30 py-4 pr-14 pl-5 transition-all duration-300 ease-gentle hover:-translate-y-0.5 hover:border-accent/30 hover:bg-surface/70"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-xl font-semibold text-accent">{b.ref}</span>
                  <span className="text-xs text-faint">{b.chapterName}</span>
                </div>
                {b.excerpt && <p className="mt-2 font-serif text-reading-sm text-ink/85">{b.excerpt}</p>}
                <p className="mt-2 text-xs text-faint">Saved {dateFormat.format(new Date(b.at))}</p>
              </Link>
              <button
                onClick={() => remove(b.ref)}
                aria-label={`Remove bookmark ${b.ref}`}
                className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-faint opacity-60 transition-all hover:bg-paper hover:text-ink group-hover:opacity-100"
              >
                <X className="size-4" />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
    </div>
  )
}
