import { Bookmark, BookOpen, Compass, Search } from 'lucide-react'
import { AnimatePresence, motion, useScroll, useMotionValueEvent } from 'motion/react'
import { type ReactNode, useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useOutlet } from 'react-router'

import { isTyping } from '../lib/hooks'
import { ease } from '../lib/motion'
import { AccountMenu } from './AccountMenu'
import { BackgroundFeather } from './art/BackgroundFeather'
import { Morpankh } from './art/Morpankh'
import { MusicPlayer } from './MusicPlayer'
import { SettingsPanel } from './SettingsPanel'

/** Set as Link/navigate state to slide the next page in from that side (1 = forward). */
export interface NavState {
  dir?: 1 | -1
  autoplay?: boolean // start the recitation on arrival (continuous play)
}

const NAV = [
  { to: '/chapters', label: 'Chapters', icon: BookOpen },
  { to: '/guidance', label: 'Guidance', icon: Compass },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
]

const pageVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 28, y: dir ? 0 : 10 }),
  center: { opacity: 1, x: 0, y: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -28, y: dir ? 0 : -6 }),
}

export function Layout() {
  const location = useLocation()
  const outlet = useOutlet()
  const navigate = useNavigate()
  const dir = (location.state as NavState | null)?.dir ?? 0

  // "/" jumps to search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !isTyping(e) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        navigate('/search')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <div className="flex min-h-dvh flex-col">
      <BackgroundFeather />
      <Header />
      <AnimatePresence mode="wait" custom={dir} initial={false} onExitComplete={() => window.scrollTo(0, 0)}>
        <motion.main
          key={location.pathname}
          custom={dir}
          variants={pageVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.4, ease }}
          className="mx-auto w-full max-w-5xl flex-1 px-5 pb-24 sm:px-8"
        >
          {outlet}
        </motion.main>
      </AnimatePresence>
      <Footer />
      <MusicPlayer />
    </div>
  )
}

function Header() {
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 8))

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-500 ${
        scrolled ? 'border-line bg-paper/80 backdrop-blur-xl' : 'border-transparent bg-paper/0'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-8">
        <Link to="/" className="group flex items-center gap-2.5" aria-label="Gita Verse home">
          <motion.span whileHover={{ rotate: -8, scale: 1.08 }} transition={{ type: 'spring', stiffness: 300 }}>
            <Morpankh crop="eye" className="h-8 w-auto" />
          </motion.span>
          <span className="font-display text-xl font-semibold tracking-wide">
            Gita <span className="font-medium text-muted italic transition-colors group-hover:text-accent">Verse</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) =>
                `relative flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-colors duration-300 ${
                  isActive ? 'text-ink' : 'text-muted hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="size-4.5 sm:hidden" strokeWidth={1.6} />
                  <span className="max-sm:sr-only">{label}</span>
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-3 -bottom-px h-px bg-accent"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
          <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
          <SettingsPanel />
          <AccountMenu />
        </nav>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-8 text-xs text-faint sm:flex-row sm:justify-between sm:px-8">
        <p>
          Press <Kbd>/</Kbd> to search · <Kbd>←</Kbd> <Kbd>→</Kbd> to move between verses
        </p>
        <p>Text from the open gita/gita dataset · Translations © their respective translators</p>
      </div>
    </footer>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 font-sans text-[0.7rem] text-muted">
      {children}
    </kbd>
  )
}
