import { Music, VolumeX } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

import { MUSIC_SRC, RECITATION_EVENT, useMusicAvailable } from '../lib/music'
import { updateSettings, useSettings } from '../lib/settings'

// Wait this long after a recitation stops before bringing the music back, so continuous
// play from one verse to the next doesn't make it swell in between.
const RESUME_DELAY = 1500

/**
 * Soft background flute. Browsers only allow sound after the visitor interacts with the
 * page, so it starts on the first click or key press (unless muted), and fades out while a
 * verse is being recited. The floating button mutes or unmutes; the choice is remembered.
 */
export function MusicPlayer() {
  const { music, musicVolume } = useSettings()
  const available = useMusicAvailable()
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Latest values for the event handlers below, which are registered once.
  const state = useRef({ music, volume: musicVolume, interacted: false, reciting: false })
  const fadeFrame = useRef(0)
  const resumeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const fadeTo = (target: number, ms: number, done?: () => void) => {
    const audio = audioRef.current
    if (!audio) return
    cancelAnimationFrame(fadeFrame.current)
    const from = audio.volume
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      audio.volume = from + (target - from) * t
      if (t < 1) fadeFrame.current = requestAnimationFrame(step)
      else done?.()
    }
    fadeFrame.current = requestAnimationFrame(step)
  }

  /** Play or pause to match the current settings and what's happening on the page. */
  const sync = () => {
    const audio = audioRef.current
    if (!audio) return
    const { music, volume, interacted, reciting } = state.current
    if (music && interacted && !reciting) {
      if (audio.paused) {
        audio.volume = 0
        audio.play().then(() => fadeTo(volume, 2500)).catch(() => {})
      } else {
        fadeTo(volume, 600)
      }
    } else if (!audio.paused) {
      fadeTo(0, 900, () => audio.pause())
    }
  }

  useEffect(() => {
    state.current.music = music
    state.current.volume = musicVolume
    sync()
    // sync reads everything it needs from refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [music, musicVolume])

  // Start on the first interaction anywhere, except on the music button itself (that's a choice).
  useEffect(() => {
    if (!available) return
    const onFirstInteraction = (e: Event) => {
      if ((e.target as Element | null)?.closest?.('[data-music-toggle]')) return
      state.current.interacted = true
      sync()
      window.removeEventListener('pointerdown', onFirstInteraction)
      window.removeEventListener('keydown', onFirstInteraction)
    }
    window.addEventListener('pointerdown', onFirstInteraction)
    window.addEventListener('keydown', onFirstInteraction)
    return () => {
      window.removeEventListener('pointerdown', onFirstInteraction)
      window.removeEventListener('keydown', onFirstInteraction)
    }
  }, [available])

  // Step aside while a verse is recited.
  useEffect(() => {
    const onRecitation = (e: Event) => {
      const reciting = (e as CustomEvent<{ playing: boolean }>).detail.playing
      clearTimeout(resumeTimer.current)
      if (reciting) {
        state.current.reciting = true
        sync()
      } else {
        resumeTimer.current = setTimeout(() => {
          state.current.reciting = false
          sync()
        }, RESUME_DELAY)
      }
    }
    window.addEventListener(RECITATION_EVENT, onRecitation)
    return () => {
      window.removeEventListener(RECITATION_EVENT, onRecitation)
      clearTimeout(resumeTimer.current)
      cancelAnimationFrame(fadeFrame.current)
    }
  }, [])

  if (!available) return null

  const toggle = () => {
    state.current.interacted = true
    updateSettings({ music: !music })
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={MUSIC_SRC}
        loop
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <motion.button
        data-music-toggle
        onClick={toggle}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        whileTap={{ scale: 0.9 }}
        aria-pressed={music}
        aria-label={music ? 'Mute background music' : 'Play background music'}
        title={music ? 'Mute music' : 'Play soft flute music'}
        className="fixed right-4 bottom-4 z-40 grid size-11 place-items-center rounded-full border border-line bg-paper/80 text-muted shadow-[0_8px_24px_-12px_rgb(0_0_0/0.3)] backdrop-blur-md transition-colors hover:text-accent sm:right-6 sm:bottom-6"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Soft rings ripple outwards while the music plays. */}
        <AnimatePresence>
          {playing &&
            [0, 1.4].map((delay) => (
              <motion.span
                key={delay}
                className="absolute inset-0 rounded-full border border-accent/40"
                initial={{ opacity: 0.6, scale: 1 }}
                animate={{ opacity: 0, scale: 1.7 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2.8, repeat: Infinity, delay, ease: 'easeOut' }}
              />
            ))}
        </AnimatePresence>
        {music ? <Music className={`size-4.5 ${playing ? 'text-accent' : ''}`} /> : <VolumeX className="size-4.5" />}
      </motion.button>
    </>
  )
}
