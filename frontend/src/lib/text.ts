import type { Language, Translation } from '../api/types'

export function lines(text: string): string[] {
  return text.split('\n').filter((line) => line.trim())
}

/** "धृतराष्ट्र उवाच" / "dhṛitarāśhtra uvācha" lines name the speaker rather than being verse text. */
export function isSpeakerLine(line: string): boolean {
  return /(उवाच|uvācha)\s*$/.test(line.trim())
}

export interface WordMeaning {
  term: string
  meaning: string
}

/** "dharma-kṣhetre—the land of dharma; kuru-kṣhetre—at Kurukshetra" → term/meaning pairs. */
export function parseWordMeanings(text: string): WordMeaning[] {
  return text
    .split(';')
    .map((pair) => {
      const [term, ...rest] = pair.split('—')
      return { term: term.trim(), meaning: rest.join('—').trim() }
    })
    .filter((pair) => pair.term && pair.meaning)
}

export function translationsIn(translations: Translation[], lang: Language): Translation[] {
  return translations.filter((t) => t.language === lang)
}

/** The preferred translator's text, falling back to the first available one. */
export function pickTranslation(translations: Translation[], lang: Language, preferred: string) {
  const available = translationsIn(translations, lang)
  return available.find((t) => t.author === preferred) ?? available[0]
}

export function excerpt(text: string, maxLength = 160): string {
  if (text.length <= maxLength) return text
  return text.slice(0, text.lastIndexOf(' ', maxLength)).replace(/[,;:.]$/, '') + '…'
}

/** Today's date in the viewer's timezone, as YYYY-MM-DD. */
export function localDate(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function verseUrl(chapter: number, verse: number): string {
  return `/verse/${chapter}/${verse}`
}
