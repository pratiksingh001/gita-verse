import { useEffect, useState } from 'react'

export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · Gita Verse` : 'Gita Verse'
  }, [title])
}

export function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

/** True when the user is typing in a field, so global keyboard shortcuts stay out of the way. */
export function isTyping(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null
  return !!target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
}
