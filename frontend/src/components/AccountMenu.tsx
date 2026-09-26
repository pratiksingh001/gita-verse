import { Bookmark, CalendarCheck, LogOut, NotebookPen } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'

import { useUser } from '../lib/account'
import { useSignOut } from '../lib/auth'
import { ease } from '../lib/motion'

export function AccountMenu() {
  const { data: user, isPending } = useUser()
  const signOut = useSignOut()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => !menuRef.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (isPending) return <span className="size-9" />

  if (!user) {
    return (
      <Link
        to="/signin"
        state={{ from: location.pathname + location.search }}
        className="rounded-full border border-line px-3.5 py-1.5 text-sm text-muted transition-colors hover:border-accent/40 hover:text-accent"
      >
        Sign in
      </Link>
    )
  }

  const item = 'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface hover:text-ink'

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Account menu"
        className="grid size-9 place-items-center rounded-full bg-accent-soft font-display text-lg font-semibold text-accent ring-1 ring-accent/20 transition-transform hover:scale-105"
      >
        {user.name.trim()[0]?.toUpperCase() ?? '•'}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.2, ease }}
            style={{ transformOrigin: 'top right' }}
            className="absolute top-12 right-0 z-50 w-60 rounded-2xl border border-line bg-paper/95 p-2 shadow-[0_24px_48px_-24px_rgb(0_0_0/0.25)] backdrop-blur-xl"
          >
            <div className="px-3 pt-2 pb-3">
              <p className="truncate font-medium text-ink">{user.name}</p>
              <p className="truncate text-xs text-faint">{user.email}</p>
            </div>
            {/* Any choice closes the menu. */}
            <div className="border-t border-line pt-2" onClick={() => setOpen(false)}>
              <Link to="/plans" className={item}>
                <CalendarCheck className="size-4" /> Reading plans
              </Link>
              <Link to="/notes" className={item}>
                <NotebookPen className="size-4" /> My notes
              </Link>
              <Link to="/bookmarks" className={item}>
                <Bookmark className="size-4" /> Bookmarks
              </Link>
              <button onClick={() => signOut.mutate()} className={`${item} w-full`}>
                <LogOut className="size-4" /> Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
