import { Check, Copy, Download, Share2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

import { ease } from '../lib/motion'
import { type CardContent, type CardFormat, type CardStyle, renderVerseCard } from '../lib/shareImage'
import { Segmented } from './Segmented'
import { Skeleton, buttonClass, primaryButtonClass } from './States'

export function ShareButton({ content }: { content: CardContent }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Share this verse"
        title="Share"
        className="grid size-10 place-items-center rounded-full text-muted transition-colors duration-300 hover:bg-surface hover:text-accent"
      >
        <Share2 className="size-4.5" strokeWidth={1.6} />
      </button>
      <AnimatePresence>{open && <ShareDialog content={content} onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  )
}

function ShareDialog({ content, onClose }: { content: CardContent; onClose: () => void }) {
  const [style, setStyle] = useState<CardStyle>(document.documentElement.classList.contains('dark') ? 'night' : 'paper')
  const [format, setFormat] = useState<CardFormat>('square')
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Re-render the card whenever the style or format changes.
  useEffect(() => {
    let cancelled = false
    let url: string | undefined
    renderVerseCard(content, style, format).then((blob) => {
      if (cancelled) return
      url = URL.createObjectURL(blob)
      setImage({ blob, url })
    })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [content, style, format])

  useEffect(() => {
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const fileName = `bhagavad-gita-${content.ref}.png`
  const file = image && new File([image.blob], fileName, { type: 'image/png' })
  const canShareFile = !!file && !!navigator.canShare?.({ files: [file] })

  const share = () => {
    if (file) navigator.share({ files: [file], title: `Bhagavad Gita ${content.ref}` }).catch(() => {})
  }

  const download = () => {
    if (!image) return
    const link = document.createElement('a')
    link.href = image.url
    link.download = fileName
    link.click()
  }

  const copyText = async () => {
    const text = `${content.sanskritLines.join('\n')}\n\n${content.translation}\n— ${content.author}\n\nBhagavad Gita ${content.ref}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/25 backdrop-blur-sm sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Share verse ${content.ref}`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.35, ease }}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-line bg-paper p-6 shadow-2xl outline-none sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-medium">Share verse {content.ref}</h2>
          <button onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 flex justify-center">
          <div className={`relative w-full ${format === 'square' ? 'aspect-square' : 'aspect-[4/5]'}`}>
            {image ? (
              <motion.img
                key={image.url}
                src={image.url}
                alt={`Verse ${content.ref} as an image`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="size-full rounded-2xl border border-line object-contain shadow-[0_20px_40px_-24px_rgb(0_0_0/0.4)]"
              />
            ) : (
              <Skeleton className="size-full rounded-2xl" />
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Segmented<CardStyle>
            id="card-style"
            label="Card style"
            value={style}
            onChange={setStyle}
            options={[
              { value: 'paper', label: 'Paper' },
              { value: 'night', label: 'Night' },
            ]}
          />
          <Segmented<CardFormat>
            id="card-format"
            label="Card format"
            value={format}
            onChange={setFormat}
            options={[
              { value: 'square', label: 'Square' },
              { value: 'portrait', label: 'Portrait' },
            ]}
          />
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {canShareFile && (
            <button onClick={share} className={primaryButtonClass}>
              <Share2 className="size-4" /> Share
            </button>
          )}
          <button onClick={download} disabled={!image} className={canShareFile ? buttonClass : primaryButtonClass}>
            <Download className="size-4" /> Download
          </button>
          <button onClick={copyText} className={buttonClass}>
            {copied ? <Check className="size-4 text-accent" /> : <Copy className="size-4" />}
            {copied ? 'Copied' : 'Copy text'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
