import { RotateCw } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { ApiError } from '../api/client'
import { rise } from '../lib/motion'

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

export function SkeletonLines({ count = 3, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`} role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={`h-4 ${i === count - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}

export function Message({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <motion.div initial="hidden" animate="show" variants={rise} className="mx-auto max-w-md py-20 text-center">
      <h2 className="font-display text-3xl font-medium text-ink">{title}</h2>
      {children && <p className="mt-3 leading-relaxed text-muted">{children}</p>}
      {action && <div className="mt-8 flex justify-center">{action}</div>}
    </motion.div>
  )
}

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  if (error instanceof ApiError && error.status === 404) {
    return (
      <Message title="Not found" action={<LinkButton to="/chapters">Browse chapters</LinkButton>}>
        {error.message}. The Gita has 18 chapters; check the chapter and verse number.
      </Message>
    )
  }
  return (
    <Message
      title="Couldn't load this page"
      action={
        retry && (
          <button onClick={retry} className={buttonClass}>
            <RotateCw className="size-4" /> Try again
          </button>
        )
      }
    >
      The server didn't respond. Check that the API is running, then try again.
    </Message>
  )
}

export const buttonClass =
  'inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-5 py-2.5 text-sm font-medium text-ink transition-all duration-300 ease-gentle hover:-translate-y-0.5 hover:border-accent/40 hover:bg-surface'

export const primaryButtonClass =
  'inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-all duration-300 ease-gentle hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_var(--ink)]'

export function LinkButton({ to, children, primary }: { to: string; children: ReactNode; primary?: boolean }) {
  return (
    <Link to={to} className={primary ? primaryButtonClass : buttonClass}>
      {children}
    </Link>
  )
}
