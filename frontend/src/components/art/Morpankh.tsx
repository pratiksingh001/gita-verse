import { BARBS, BLUE, BRONZE, HALO, QUILL, TEAL } from './featherPaths'

// Peacock colours, softened to sit with the warm palette.
const COLORS = { barbs: '#8A9A55', quill: '#A8843C', halo: '#D9C47C', bronze: '#B98C3E', teal: '#2F7A6E', blue: '#22386E' }

/**
 * A peacock feather. `crop="eye"` frames just the eye and its fan of barbs, for small marks
 * like the logo; `tone="line"` draws it in the current text colour instead of peacock colours.
 */
export function Morpankh({
  className = '',
  crop = 'full',
  tone = 'color',
}: {
  className?: string
  crop?: 'full' | 'eye'
  tone?: 'color' | 'line'
}) {
  const c = tone === 'color' ? COLORS : Object.fromEntries(Object.keys(COLORS).map((k) => [k, 'currentColor']))
  return (
    <svg
      viewBox={crop === 'eye' ? '12 22 176 212' : '0 20 200 575'}
      className={className}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <path d={BARBS} stroke={c.barbs} strokeWidth={crop === 'eye' ? 1.4 : 0.7} fill="none" opacity={0.75} />
      <path d={QUILL} stroke={c.quill} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <path d={HALO} fill={c.halo} opacity={tone === 'color' ? 0.55 : 0.2} />
      <path d={BRONZE} fill={c.bronze} opacity={tone === 'color' ? 0.9 : 0.35} />
      <path d={TEAL} fill={c.teal} opacity={tone === 'color' ? 1 : 0.55} />
      <path d={BLUE} fill={c.blue} />
    </svg>
  )
}
