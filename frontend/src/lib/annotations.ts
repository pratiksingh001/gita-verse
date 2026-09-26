import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiGet, apiSend } from '../api/client'
import type { Annotation, Highlight } from '../api/types'
import { useUser } from './account'

const KEY = ['annotations']

export const HIGHLIGHTS: Record<Highlight, { label: string; color: string }> = {
  saffron: { label: 'Saffron', color: '#E3A857' },
  sage: { label: 'Sage', color: '#8FB996' },
  sky: { label: 'Sky', color: '#8DB8D6' },
  rose: { label: 'Rose', color: '#E09A9A' },
}

/** The signed-in reader's notes and highlights, looked up by verse ref ("2.47"). */
export function useAnnotations() {
  const { data: user } = useUser()
  const query = useQuery({
    queryKey: KEY,
    queryFn: () => apiGet<Annotation[]>('/api/me/annotations'),
    enabled: !!user,
  })
  const annotations = user ? (query.data ?? []) : []
  return {
    annotations,
    isLoading: !!user && query.isPending,
    byRef: (ref: string) => annotations.find((a) => a.ref === ref),
  }
}

export interface AnnotationChange {
  chapter: number
  verse: number
  ref: string
  chapterName: string
  note: string
  highlight: Highlight | null
}

export function useSaveAnnotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (change: AnnotationChange) =>
      apiSend<Annotation | null>('PUT', `/api/me/annotations/${change.chapter}/${change.verse}`, {
        note: change.note,
        highlight: change.highlight,
      }),
    // Show the change straight away, then settle on what the server stored.
    onMutate: (change) =>
      queryClient.setQueryData<Annotation[]>(KEY, (prev = []) => {
        const others = prev.filter((a) => a.ref !== change.ref)
        if (!change.note.trim() && !change.highlight) return others
        return [
          {
            chapter: change.chapter,
            verse: change.verse,
            ref: change.ref,
            chapter_name: change.chapterName,
            note: change.note,
            highlight: change.highlight,
            updated_at: new Date().toISOString(),
          },
          ...others,
        ]
      }),
    onSuccess: (saved, change) =>
      queryClient.setQueryData<Annotation[]>(KEY, (prev = []) => {
        const others = prev.filter((a) => a.ref !== change.ref)
        return saved ? [saved, ...others] : others
      }),
    onError: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
