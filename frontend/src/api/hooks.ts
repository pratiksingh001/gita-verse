import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import { apiGet } from './client'
import type {
  ChapterDetail,
  ChapterSummary,
  Commentary,
  Language,
  SearchResponse,
  SituationDetail,
  SituationSummary,
  VerseDetail,
  VerseOfTheDay,
} from './types'

const SEARCH_PAGE_SIZE = 20

export function useChapters() {
  return useQuery({
    queryKey: ['chapters'],
    queryFn: () => apiGet<ChapterSummary[]>('/api/chapters'),
  })
}

export function useChapter(chapter: number, lang: Language) {
  return useQuery({
    queryKey: ['chapter', chapter, lang],
    queryFn: () => apiGet<ChapterDetail>(`/api/chapters/${chapter}`, { lang }),
  })
}

// All translations are fetched at once so switching language or translator is instant.
export function useVerse(chapter: number, verse: number) {
  return useQuery({
    queryKey: ['verse', chapter, verse],
    queryFn: () => apiGet<VerseDetail>(`/api/verses/${chapter}/${verse}`),
  })
}

// Commentaries are long, so they load only once the reader opens them.
export function useCommentaries(chapter: number, verse: number, enabled: boolean) {
  return useQuery({
    queryKey: ['commentaries', chapter, verse],
    queryFn: () => apiGet<Commentary[]>(`/api/verses/${chapter}/${verse}/commentaries`),
    enabled,
  })
}

export function useVerseOfTheDay(date: string) {
  return useQuery({
    queryKey: ['verse-of-the-day', date],
    queryFn: () => apiGet<VerseOfTheDay>('/api/verse-of-the-day', { date }),
  })
}

export function useSituations() {
  return useQuery({
    queryKey: ['situations'],
    queryFn: () => apiGet<SituationSummary[]>('/api/situations'),
  })
}

export function useSituation(slug: string, lang: Language) {
  return useQuery({
    queryKey: ['situation', slug, lang],
    queryFn: () => apiGet<SituationDetail>(`/api/situations/${slug}`, { lang }),
  })
}

export function useSearch(q: string) {
  return useInfiniteQuery({
    queryKey: ['search', q],
    queryFn: ({ pageParam }) =>
      apiGet<SearchResponse>('/api/search', { q, limit: SEARCH_PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, page) => n + page.results.length, 0)
      return loaded < last.total ? loaded : undefined
    },
    enabled: q.length > 0,
  })
}
