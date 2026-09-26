// Mirrors backend/app/schemas.py.

export type Language = 'en' | 'hi'

export interface VerseRef {
  chapter: number
  verse: number
  ref: string
}

export interface ChapterSummary {
  number: number
  name_sanskrit: string
  name_transliterated: string
  name_translation: string
  name_meaning: string
  verse_count: number
}

export interface ChapterVerse {
  verse: number
  ref: string
  translation: string
}

export interface ChapterDetail extends ChapterSummary {
  summary_en: string
  summary_hi: string
  verses: ChapterVerse[]
  prev: number | null
  next: number | null
}

export interface Translation {
  author: string
  language: Language
  text: string
}

export interface VerseDetail {
  chapter: number
  verse: number
  ref: string
  chapter_name: string
  sanskrit_text: string
  transliteration: string
  word_meanings: string
  translations: Translation[]
  audio_url: string | null
  prev: VerseRef | null
  next: VerseRef | null
}

export interface Commentary {
  author: string
  language: Language | 'sa'
  text: string
}

export interface VerseOfTheDay extends VerseDetail {
  date: string
}

export interface SnippetPart {
  text: string
  match: boolean
}

export interface SearchResult {
  chapter: number
  verse: number
  ref: string
  author: string
  language: Language
  snippet: SnippetPart[]
}

export interface SearchResponse {
  query: string
  kind: 'reference' | 'keyword'
  reference: VerseRef | null
  total: number
  results: SearchResult[]
}

export interface SituationSummary {
  slug: string
  title: string
  description: string
  verse_count: number
}

export interface SituationVerse {
  chapter: number
  verse: number
  ref: string
  sanskrit_text: string
  translation: string
  author: string
  note: string
}

export interface SituationDetail {
  slug: string
  title: string
  description: string
  verses: SituationVerse[]
}

// --- accounts and personal data (backend/app/routers/auth.py, me.py) ---

export interface User {
  id: number
  email: string
  name: string
  has_password: boolean
  google_linked: boolean
}

export interface VerseLocation {
  chapter: number
  verse: number
  ref: string
  chapter_name: string
}

export interface ServerBookmark extends VerseLocation {
  excerpt: string
  saved_at: string
}

export interface ServerProgress extends VerseLocation {
  read_at: string
}

export type Highlight = 'saffron' | 'sage' | 'sky' | 'rose'

export interface Annotation extends VerseLocation {
  note: string
  highlight: Highlight | null
  updated_at: string
}
