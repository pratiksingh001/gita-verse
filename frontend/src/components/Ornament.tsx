/** A hairline divider with a small lotus bud in the middle. */
export function Ornament({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 ${className}`} aria-hidden="true">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-line" />
      <LotusMark className="size-4 text-accent/70" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-line" />
    </div>
  )
}

export function LotusMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 3.5c2.2 3 3.2 5.4 3.2 7.6a3.2 3.2 0 0 1-6.4 0c0-2.2 1-4.6 3.2-7.6Z" />
      <path d="M4.5 10.5c3 .4 5 1.9 6 4.4-3 .5-5.4-1-6-4.4Zm15 0c-3 .4-5 1.9-6 4.4 3 .5 5.4-1 6-4.4Z" opacity=".55" />
      <path d="M6 18.5h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </svg>
  )
}
