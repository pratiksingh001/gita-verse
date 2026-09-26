import { Check, NotebookPen } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'

import type { Highlight } from '../api/types'
import { useUser } from '../lib/account'
import { HIGHLIGHTS, useAnnotations, useSaveAnnotation } from '../lib/annotations'
import { Skeleton } from './States'

const AUTOSAVE_DELAY = 800

/** The reader's private note and highlight colour for one verse. Saves as they type. */
export function NotePanel({ chapter, verse, refLabel, chapterName }: { chapter: number; verse: number; refLabel: string; chapterName: string }) {
  const { data: user } = useUser()
  const location = useLocation()

  if (!user) {
    return (
      <section className="rounded-2xl border border-dashed border-line px-6 py-5 text-center text-sm text-muted">
        <NotebookPen className="mx-auto mb-2 size-5 text-faint" />
        <Link to="/signin" state={{ from: location.pathname }} className="font-medium text-accent">
          Sign in
        </Link>{' '}
        to highlight verses and keep private notes.
      </section>
    )
  }
  return <LoadedEditor chapter={chapter} verse={verse} refLabel={refLabel} chapterName={chapterName} />
}

type EditorProps = { chapter: number; verse: number; refLabel: string; chapterName: string }

// The editor mounts only after annotations load, so its initial text is the saved note.
function LoadedEditor(props: EditorProps) {
  const { isLoading } = useAnnotations()
  return isLoading ? <Skeleton className="h-36 rounded-2xl" /> : <Editor {...props} />
}

function Editor({ chapter, verse, refLabel, chapterName }: EditorProps) {
  const { byRef } = useAnnotations()
  const save = useSaveAnnotation()
  const saved = byRef(refLabel)
  const [note, setNote] = useState(saved?.note ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const highlight = saved?.highlight ?? null

  useEffect(() => () => clearTimeout(timer.current), [])

  const persist = (nextNote: string, nextHighlight: Highlight | null) => {
    setStatus('saving')
    save.mutate(
      { chapter, verse, ref: refLabel, chapterName, note: nextNote, highlight: nextHighlight },
      { onSuccess: () => setStatus('saved'), onError: () => setStatus('idle') },
    )
  }

  const onType = (value: string) => {
    setNote(value)
    setStatus('idle')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => persist(value, highlight), AUTOSAVE_DELAY)
  }

  const onHighlight = (color: Highlight) => {
    clearTimeout(timer.current)
    persist(note, highlight === color ? null : color)
  }

  return (
    <section className="rounded-2xl border border-line bg-surface/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-muted">
          <NotebookPen className="size-4" /> Your note
        </h2>
        <div className="flex items-center gap-1.5" role="group" aria-label="Highlight colour">
          {(Object.keys(HIGHLIGHTS) as Highlight[]).map((color) => (
            <motion.button
              key={color}
              whileTap={{ scale: 0.85 }}
              onClick={() => onHighlight(color)}
              aria-pressed={highlight === color}
              title={`${HIGHLIGHTS[color].label} highlight`}
              className="grid size-6 place-items-center rounded-full ring-offset-2 ring-offset-paper transition-shadow aria-pressed:ring-2"
              style={{ backgroundColor: HIGHLIGHTS[color].color, ['--tw-ring-color' as string]: HIGHLIGHTS[color].color }}
            >
              {highlight === color && <Check className="size-3.5 text-white" strokeWidth={3} />}
            </motion.button>
          ))}
        </div>
      </div>
      <textarea
        value={note}
        onChange={(e) => onType(e.target.value)}
        maxLength={5000}
        rows={3}
        placeholder="What does this verse mean to you?"
        aria-label={`Note on verse ${refLabel}`}
        className="mt-3 w-full resize-y rounded-xl border border-transparent bg-paper/60 px-4 py-3 font-serif text-reading-sm text-ink placeholder:text-faint focus:border-line focus:outline-none"
      />
      <div className="mt-1 h-4 text-right text-xs text-faint" aria-live="polite">
        <AnimatePresence mode="wait">
          {status !== 'idle' && (
            <motion.span key={status} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {status === 'saving' ? 'Saving…' : 'Saved'}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
