import { useSyncExternalStore } from 'react'

/** Drop a royalty-free flute track here (frontend/public/music/). See README. */
export const MUSIC_SRC = '/music/bansuri.mp3'

/** Lets the background music step aside while a verse is being recited. */
export const RECITATION_EVENT = 'gita:recitation'

export function announceRecitation(playing: boolean) {
  window.dispatchEvent(new CustomEvent(RECITATION_EVENT, { detail: { playing } }))
}

// Whether the music file exists; checked once and shared with the settings panel.
let musicAvailable = false
const availabilityListeners = new Set<() => void>()
void fetch(MUSIC_SRC, { method: 'HEAD' })
  // The dev server answers missing files with the app's HTML, so check it really is audio.
  .then((res) => res.ok && (res.headers.get('content-type') ?? '').startsWith('audio'))
  .catch(() => false)
  .then((ok) => {
    musicAvailable = ok
    availabilityListeners.forEach((listener) => listener())
  })

export function useMusicAvailable() {
  return useSyncExternalStore(
    (listener) => {
      availabilityListeners.add(listener)
      return () => availabilityListeners.delete(listener)
    },
    () => musicAvailable,
  )
}
