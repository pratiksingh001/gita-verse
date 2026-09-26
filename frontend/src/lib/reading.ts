import { createPersistentStore, useStore } from './store'

export interface SavedVerse {
  chapter: number
  verse: number
  ref: string
  chapterName: string
  excerpt: string // kept so the bookmarks page renders without refetching every verse
  at: string // ISO timestamp
}

const bookmarksStore = createPersistentStore<SavedVerse[]>('gita.bookmarks', [], (saved) =>
  Array.isArray(saved) ? saved : [],
)

const lastReadStore = createPersistentStore<SavedVerse | null>('gita.lastRead', null)

const toggleBookmark = (verse: SavedVerse) =>
  bookmarksStore.set((prev) =>
    prev.some((b) => b.ref === verse.ref) ? prev.filter((b) => b.ref !== verse.ref) : [verse, ...prev],
  )

const removeBookmark = (ref: string) => bookmarksStore.set((prev) => prev.filter((b) => b.ref !== ref))

export function useBookmarks() {
  const bookmarks = useStore(bookmarksStore)
  return {
    bookmarks,
    isBookmarked: (ref: string) => bookmarks.some((b) => b.ref === ref),
    toggle: toggleBookmark,
    remove: removeBookmark,
  }
}

export function useLastRead() {
  return useStore(lastReadStore)
}

export function setLastRead(verse: SavedVerse) {
  lastReadStore.set(verse)
}
