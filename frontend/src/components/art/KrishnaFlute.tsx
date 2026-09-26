import { motion, useReducedMotion } from 'motion/react'
import { useId } from 'react'

import { BARBS, BLUE, BRONZE, QUILL, TEAL } from './featherPaths'

// Line art of Shri Krishna in profile, eyes closed, playing the bansuri. Drawn in the current
// text colour; each stroke is listed in the order it draws itself in.
const STROKES: { d: string; width?: number; dash?: string }[] = [
  // crown band and fan
  { d: 'M166 124 C184 115 205 111 227 112' },
  { d: 'M168 117 C185 109 205 106 225 107' },
  { d: 'M170 117 C168 106 174 98 182 98 C182 90 190 84 197 88 C201 80 212 80 214 90 C221 88 227 96 224 107' },
  { d: 'M182 98 C186 104 186 110 185 113 M197 88 C199 96 199 104 198 110 M214 90 C213 98 212 104 211 108', width: 1 },
  // face profile, closed eye, brow, tilak
  {
    d: 'M225 113 C228 122 229 132 228 140 C227 145 228 150 232 156 C236 162 240 166 238 169 C236 172 232 172 230 173 C232 175 234 177 233 180 C232 182 230 183 229 184 C231 186 232 189 230 192 C228 196 227 201 223 206 C217 212 207 214 198 212',
  },
  { d: 'M208 149 C212 152 218 152 222 149' },
  { d: 'M210 151 L208 154 M214 152 L213 155 M218 152 L218 155', width: 1 },
  { d: 'M206 139 C212 135 220 135 226 138', width: 1.3 },
  { d: 'M226 122 L226 131', width: 1.2 },
  // ear and kundal
  { d: 'M187 150 C182 152 181 164 187 170 C190 172 193 168 192 163' },
  { d: 'M188 172 C184 178 184 186 188 190 C192 186 192 178 188 172 Z', width: 1.2 },
  // hair
  { d: 'M168 126 C156 138 158 152 162 162 C166 174 156 182 154 194 C152 208 164 216 158 230 C153 242 144 248 148 264' },
  { d: 'M176 128 C168 142 172 154 174 164 C176 176 168 186 168 198', width: 1.1 },
  // neck and shoulder
  { d: 'M198 212 C196 224 192 236 184 246 C172 258 152 264 132 272' },
  { d: 'M215 211 C215 224 219 236 226 246' },
  // bansuri
  { d: 'M227 183 L388 204' },
  { d: 'M226 188 L388 209' },
  { d: 'M388 204 C391 205.5 391 207.5 388 209' },
  { d: 'M246 185.5 L245.5 190.5 M372 202 L371.5 207', width: 1 },
  // fingers on the flute
  { d: 'M262 186 C266 181 272 182 273 188 M270 186 C274 182 280 184 280 190 M278 188 C282 185 287 187 286 193', width: 1.3 },
  { d: 'M334 195 C338 190 344 191 344 197 M341 196 C345 192 351 194 350 200 M348 198 C352 195 357 197 355 203', width: 1.3 },
]

// Forearms and bangles, which fade out downwards.
const FOREARMS = [
  'M262 190 C258 214 252 244 246 272',
  'M284 196 C280 222 274 250 268 276',
  'M257 212 C263 214 269 215 275 214 M255 219 C261 221 267 222 273 221',
  'M334 199 C330 224 324 252 318 280',
  'M354 205 C350 230 344 258 338 284',
  'M329 220 C335 222 341 223 347 222 M327 227 C333 229 339 230 345 229',
]

const GARLAND = 'M188 244 C198 272 216 292 240 304 C262 314 282 312 300 302'

export function KrishnaFlute({ className = '', animate = true }: { className?: string; animate?: boolean }) {
  // useId() can contain characters (":", "«") that break url(#...) references.
  const maskId = `krishna-fade-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const reduceMotion = useReducedMotion()
  const draw = animate && !reduceMotion

  const stroke = (i: number) =>
    draw
      ? {
          initial: { pathLength: 0, opacity: 0 },
          animate: { pathLength: 1, opacity: 1 },
          transition: { pathLength: { duration: 1.6, delay: 0.2 + i * 0.07, ease: 'easeInOut' as const }, opacity: { duration: 0.2, delay: 0.2 + i * 0.07 } },
        }
      : {}
  const fadeIn = (delay: number) =>
    draw ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 1.2, delay } } : {}

  return (
    <svg viewBox="120 0 280 320" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${maskId}-grad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.6" stopColor="white" />
          <stop offset="0.86" stopColor="black" />
        </linearGradient>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="320">
          <rect width="400" height="320" fill={`url(#${maskId}-grad)`} />
        </mask>
      </defs>

      <g fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        {/* The morpankh tucked into the crown, leaning back. */}
        <motion.g transform="translate(196 104) rotate(-24) scale(0.2) translate(-100 -590)" {...fadeIn(1.2)}>
          <path d={BARBS} strokeWidth={3} opacity={0.55} />
          <path d={QUILL} strokeWidth={6} />
          <path d={BRONZE} strokeWidth={6} />
          <path d={TEAL} strokeWidth={5} />
          <path d={BLUE} fill="currentColor" stroke="none" />
        </motion.g>

        {STROKES.map((s, i) => (
          <motion.path key={i} d={s.d} strokeWidth={s.width} {...stroke(i)} />
        ))}

        <motion.path d={GARLAND} strokeDasharray="1 5" strokeWidth={2.4} {...fadeIn(1.8)} />
        <motion.circle cx={198} cy={112.5} r={2.4} {...fadeIn(1)} />
        <motion.g fill="currentColor" stroke="none" {...fadeIn(1.6)}>
          <circle cx={300} cy={195} r={1.3} />
          <circle cx={314} cy={196.8} r={1.3} />
          <circle cx={356} cy={202.2} r={1.3} />
        </motion.g>

        <g mask={`url(#${maskId})`}>
          {FOREARMS.map((d, i) => (
            <motion.path key={i} d={d} strokeWidth={i % 3 === 2 ? 1.1 : 1.6} {...stroke(STROKES.length + i)} />
          ))}
        </g>
      </g>
    </svg>
  )
}
