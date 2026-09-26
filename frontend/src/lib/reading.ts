import { type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { apiGet, apiSend } from '../api/client'
import type { ServerBookmark, ServerProgress } from '../api/types'
import { useUser } from './account'
import { createPersistentStore, useStore } from './store'

/**
 * Bookmarks and reading position. Signed-out readers keep them in this browser; signed-in
 * readers keep them in their account, so they follow them across devices.
 */

export interface SavedVerse {
  chapter: number
  verse: number
  ref: string
  chapterName: string
  excerpt: string // kept so the bookmarks page renders without refetching every verse
  at: string // ISO timestamp
}

const BOOKMARKS_KEY = ['bookmarks']
const PROGRESS_KEY = ['progress']

const bookmarksStore = createPersistentStore<SavedVerse[]>('gita.bookmarks', [], (saved) =>
  Array.isArray(saved) ? saved : [],
)
const lastReadStore = createPersistentStore<SavedVerse | null>('gita.lastRead', null)

function fromServer(b: ServerBookmark | ServerProgress, excerpt = '', at = ''): SavedVerse {
  return { chapter: b.chapter, verse: b.verse, ref: b.ref, chapterName: b.chapter_name, excerpt, at }
}

// --- bookmarks --------------------------------------------------------------

const toggleLocal = (verse: SavedVerse) =>
  bookmarksStore.set((prev) =>
    prev.some((b) => b.ref === verse.ref) ? prev.filter((b) => b.ref !== verse.ref) : [verse, ...prev],
  )

async function saveOnServer(queryClient: QueryClient, verse: SavedVerse, save: boolean) {
  // Update the list immediately; the server's answer replaces it afterwards.
  queryClient.setQueryData<ServerBookmark[]>(BOOKMARKS_KEY, (prev = []) => {
    const others = prev.filter((b) => b.ref !== verse.ref)
    if (!save) return others
    const optimistic = {
      chapter: verse.chapter,
      verse: verse.verse,
      ref: verse.ref,
      chapter_name: verse.chapterName,
      excerpt: verse.excerpt,
      saved_at: verse.at,
    }
    return [optimistic, ...others]
  })
  const path = `/api/me/bookmarks/${verse.chapter}/${verse.verse}`
  try {
    await (save ? apiSend('PUT', path, { excerpt: verse.excerpt }) : apiSend('DELETE', path))
  } finally {
    queryClient.invalidateQueries({ queryKey: BOOKMARKS_KEY })
  }
}

export function useBookmarks() {
  const { data: user } = useUser()
  const queryClient = useQueryClient()
  const local = useStore(bookmarksStore)
  const server = useQuery({
    queryKey: BOOKMARKS_KEY,
    queryFn: () => apiGet<ServerBookmark[]>('/api/me/bookmarks'),
    enabled: !!user,
  })

  const bookmarks = user ? (server.data ?? []).map((b) => fromServer(b, b.excerpt, b.saved_at)) : local
  const isBookmarked = (ref: string) => bookmarks.some((b) => b.ref === ref)

  return {
    bookmarks,
    isBookmarked,
    isLoading: !!user && server.isPending,
    toggle: (verse: SavedVerse) =>
      user ? saveOnServer(queryClient, verse, !isBookmarked(verse.ref)).catch(() => {}) : toggleLocal(verse),
    remove: (verse: SavedVerse) =>
      user
        ? saveOnServer(queryClient, verse, false).catch(() => {})
        : bookmarksStore.set((prev) => prev.filter((b) => b.ref !== verse.ref)),
  }
}

// --- reading position -------------------------------------------------------

export function useLastRead(): SavedVerse | null {
  const { data: user } = useUser()
  const local = useStore(lastReadStore)
  const server = useQuery({
    queryKey: PROGRESS_KEY,
    queryFn: () => apiGet<ServerProgress | null>('/api/me/progress'),
    enabled: !!user,
  })
  if (!user) return local
  return server.data ? fromServer(server.data, '', server.data.read_at) : null
}

/** Returns a function that records the verse being read. */
export function useRecordReading() {
  const { data: user, isPending } = useUser()
  const queryClient = useQueryClient()
  return useCallback(
    (verse: SavedVerse) => {
      // Wait until we know whether the reader is signed in; this runs again once we do.
      if (isPending) return
      if (!user) {
        lastReadStore.set(verse)
        return
      }
      apiSend<ServerProgress>('PUT', '/api/me/progress', { chapter: verse.chapter, verse: verse.verse })
        .then((progress) => {
          queryClient.setQueryData(PROGRESS_KEY, progress)
          // Reading counts towards streaks and plans.
          queryClient.invalidateQueries({ queryKey: ['streak'] })
          queryClient.invalidateQueries({ queryKey: ['plans'] })
        })
        .catch(() => {})
    },
    [user, isPending, queryClient],
  )
}

// --- moving browser data into an account ------------------------------------

/** After signing in, merge what this browser saved while signed out into the account. */
export async function syncLocalToAccount(queryClient: QueryClient) {
  const local = bookmarksStore.get()
  if (local.length) {
    const merged = await apiSend<ServerBookmark[]>(
      'POST',
      '/api/me/bookmarks/import',
      local.map((b) => ({ chapter: b.chapter, verse: b.verse, excerpt: b.excerpt, saved_at: b.at })),
    )
    queryClient.setQueryData(BOOKMARKS_KEY, merged)
    bookmarksStore.set([])
  }

  const lastRead = lastReadStore.get()
  if (lastRead) {
    const server = await apiGet<ServerProgress | null>('/api/me/progress')
    // Keep whichever position is more recent.
    if (!server || new Date(server.read_at) < new Date(lastRead.at)) {
      queryClient.setQueryData(
        PROGRESS_KEY,
        await apiSend('PUT', '/api/me/progress', { chapter: lastRead.chapter, verse: lastRead.verse }),
      )
    }
    lastReadStore.set(null)
  }
}
