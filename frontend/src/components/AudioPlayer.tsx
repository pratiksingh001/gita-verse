import { Pause, Play, Repeat } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

import { isTyping } from '../lib/hooks'
import { updateSettings, useSettings } from '../lib/settings'

const RING_RADIUS = 21
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

/**
 * Sanskrit recitation for one verse. `autoStart` begins playback on mount (used when
 * continuous play moves on from the previous verse); `onEnded` fires when it finishes.
 */
export function AudioPlayer({ src, autoStart, onEnded }: { src: string; autoStart: boolean; onEnded: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0) // 0..1
  const [duration, setDuration] = useState(0)
  const { autoplay } = useSettings()

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    // play() rejects when the browser blocks audio that wasn't started by the user.
    if (audio.paused) audio.play().catch(() => setPlaying(false))
    else audio.pause()
  }

  useEffect(() => {
    if (autoStart) audioRef.current?.play().catch(() => setPlaying(false))
  }, [autoStart])

  // P plays or pauses.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p' && !isTyping(e) && !e.metaKey && !e.ctrlKey) toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex items-center justify-center gap-4">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 1))}
        onEnded={() => {
          setProgress(0)
          onEnded()
        }}
      />

      <motion.button
        onClick={toggle}
        whileTap={{ scale: 0.92 }}
        aria-label={playing ? 'Pause recitation' : 'Play recitation'}
        title={playing ? 'Pause (P)' : 'Listen (P)'}
        className="group relative grid size-12 place-items-center rounded-full text-accent transition-colors hover:bg-accent-soft/50"
      >
        <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx="24" cy="24" r={RING_RADIUS} fill="none" stroke="var(--line)" strokeWidth="1.5" />
          <circle
            cx="24"
            cy="24"
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - progress)}
            className="transition-[stroke-dashoffset] duration-300 ease-linear"
          />
        </svg>
        {playing ? (
          <Pause className="size-4.5 fill-current" strokeWidth={0} />
        ) : (
          <Play className="ml-0.5 size-4.5 fill-current" strokeWidth={0} />
        )}
      </motion.button>

      <div className="flex min-w-24 flex-col">
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          {playing ? 'Reciting' : 'Listen'}
          {playing && <SoundBars />}
        </span>
        <span className="text-xs text-faint tabular-nums">
          {formatTime(progress * duration)} / {formatTime(duration)}
        </span>
      </div>

      <button
        onClick={() => updateSettings({ autoplay: !autoplay })}
        aria-pressed={autoplay}
        title={autoplay ? 'Continuous play is on: moves to the next verse' : 'Continuous play is off'}
        className={`grid size-8 place-items-center rounded-full transition-colors ${
          autoplay ? 'bg-accent-soft text-accent' : 'text-faint hover:text-muted'
        }`}
      >
        <Repeat className="size-3.5" />
        <span className="sr-only">Continuous play</span>
      </button>
    </div>
  )
}

function SoundBars() {
  return (
    <span className="flex h-3 items-end gap-0.5" aria-hidden="true">
      {[0, 0.2, 0.4].map((delay) => (
        <motion.span
          key={delay}
          className="w-0.5 rounded-full bg-accent"
          animate={{ height: ['30%', '100%', '45%', '80%', '30%'] }}
          transition={{ duration: 1.1, repeat: Infinity, delay, ease: 'easeInOut' }}
        />
      ))}
    </span>
  )
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00'
  const s = Math.floor(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
