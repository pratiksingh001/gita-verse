/**
 * Draws a verse as a shareable PNG card, entirely in the browser.
 */

export type CardStyle = 'paper' | 'night'
export type CardFormat = 'square' | 'portrait'

export interface CardContent {
  ref: string
  sanskritLines: string[]
  translation: string
  author: string
  hindi: boolean // translation is in Devanagari
}

const WIDTH = 1080
const HEIGHT: Record<CardFormat, number> = { square: 1080, portrait: 1350 }

const PALETTE: Record<CardStyle, { bg: string; ink: string; muted: string; faint: string; line: string; accent: string; glow: string }> = {
  paper: {
    bg: '#FAF7F2',
    ink: '#2B2722',
    muted: '#7A7166',
    faint: '#A89F92',
    line: '#E6DFD3',
    accent: '#A65A22',
    glow: 'rgba(214, 150, 90, 0.16)',
  },
  night: {
    bg: '#14130F',
    ink: '#EAE4D9',
    muted: '#9A9185',
    faint: '#6F675D',
    line: '#2A2823',
    accent: '#D89A5E',
    glow: 'rgba(216, 154, 94, 0.12)',
  },
}

const FONTS = {
  sanskrit: '"Tiro Devanagari Sanskrit", "Noto Serif Devanagari Variable", serif',
  serif: '"Source Serif 4 Variable", Georgia, serif',
  hindi: '"Noto Serif Devanagari Variable", serif',
  sans: '"Inter Variable", system-ui, sans-serif',
  display: '"Cormorant Garamond", Georgia, serif',
}

const PAD = 110 // inner margin for text
const CONTENT_WIDTH = WIDTH - PAD * 2

/** Canvas only uses webfonts that have already loaded, so load them explicitly first. */
async function loadFonts(hindi: boolean) {
  await Promise.all([
    document.fonts.load(`44px ${FONTS.sanskrit}`, 'कर्म'),
    document.fonts.load(`italic 36px ${FONTS.serif}`),
    document.fonts.load(`600 24px ${FONTS.sans}`),
    document.fonts.load(`500 34px ${FONTS.display}`),
    hindi ? document.fonts.load(`34px ${FONTS.hindi}`, 'कर्म') : Promise.resolve(),
  ])
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

function drawLotus(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  // Same shapes as the LotusMark icon (24-unit viewBox).
  ctx.save()
  ctx.translate(cx - size / 2, cy - size / 2)
  ctx.scale(size / 24, size / 24)
  ctx.fillStyle = color
  ctx.fill(new Path2D('M12 3.5c2.2 3 3.2 5.4 3.2 7.6a3.2 3.2 0 0 1-6.4 0c0-2.2 1-4.6 3.2-7.6Z'))
  ctx.globalAlpha = 0.55
  ctx.fill(new Path2D('M4.5 10.5c3 .4 5 1.9 6 4.4-3 .5-5.4-1-6-4.4Zm15 0c-3 .4-5 1.9-6 4.4 3 .5 5.4-1 6-4.4Z'))
  ctx.restore()
}

export async function renderVerseCard(content: CardContent, style: CardStyle, format: CardFormat): Promise<Blob> {
  await loadFonts(content.hindi)
  const height = HEIGHT[format]
  const colors = PALETTE[style]
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  // Background, a soft glow, and a hairline frame.
  ctx.fillStyle = colors.bg
  ctx.fillRect(0, 0, WIDTH, height)
  const glow = ctx.createRadialGradient(WIDTH / 2, height * 0.42, 0, WIDTH / 2, height * 0.42, WIDTH * 0.55)
  glow.addColorStop(0, colors.glow)
  glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, WIDTH, height)
  ctx.strokeStyle = colors.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(44, 44, WIDTH - 88, height - 88, 28)
  ctx.stroke()

  // Header: lotus + "BHAGAVAD GITA · 2.47"
  drawLotus(ctx, WIDTH / 2, 132, 40, colors.accent)
  ctx.fillStyle = colors.accent
  ctx.font = `600 22px ${FONTS.sans}`
  ctx.letterSpacing = '6px'
  ctx.fillText(`BHAGAVAD GITA · ${content.ref}`, WIDTH / 2, 196)
  ctx.letterSpacing = '0px'

  // Footer wordmark.
  ctx.fillStyle = colors.faint
  ctx.font = `500 34px ${FONTS.display}`
  ctx.fillText('Gita Verse', WIDTH / 2, height - 96)

  // Body: shrink the type until Sanskrit, divider and translation fit between header and footer.
  const top = 250
  const bottom = height - 160
  // Font shorthand needs the style before the size: "italic 36px Family".
  const translationFont = (size: number) =>
    content.hindi ? `${size}px ${FONTS.hindi}` : `italic ${size}px ${FONTS.serif}`

  function measure(s: number) {
    const sanskritSize = 46 * s
    ctx.font = `${sanskritSize}px ${FONTS.sanskrit}`
    const sanskritFits = content.sanskritLines.every((l) => ctx.measureText(l).width <= CONTENT_WIDTH)
    const translationSize = 36 * s
    ctx.font = translationFont(translationSize)
    const translationLines = wrap(ctx, content.translation, CONTENT_WIDTH - 40)
    const sanskritLineHeight = sanskritSize * 1.75
    const translationLineHeight = translationSize * 1.55
    const gap = 70 * s
    const total =
      content.sanskritLines.length * sanskritLineHeight + gap * 2 + translationLines.length * translationLineHeight + 60 * s
    return { sanskritSize, sanskritLineHeight, translationSize, translationLineHeight, translationLines, gap, total, sanskritFits }
  }
  let scale = 1
  let layout = measure(scale)
  while ((layout.total > bottom - top || !layout.sanskritFits) && scale > 0.4) {
    scale -= 0.04
    layout = measure(scale)
  }

  let y = top + (bottom - top - layout.total) / 2 + layout.sanskritLineHeight * 0.7

  ctx.fillStyle = colors.ink
  ctx.font = `${layout.sanskritSize}px ${FONTS.sanskrit}`
  for (const line of content.sanskritLines) {
    ctx.fillText(line, WIDTH / 2, y)
    y += layout.sanskritLineHeight
  }

  // Divider with a small diamond.
  y += layout.gap * 0.35
  ctx.strokeStyle = colors.line
  ctx.beginPath()
  ctx.moveTo(WIDTH / 2 - 90, y)
  ctx.lineTo(WIDTH / 2 + 90, y)
  ctx.stroke()
  ctx.fillStyle = colors.accent
  ctx.beginPath()
  ctx.moveTo(WIDTH / 2, y - 6)
  ctx.lineTo(WIDTH / 2 + 6, y)
  ctx.lineTo(WIDTH / 2, y + 6)
  ctx.lineTo(WIDTH / 2 - 6, y)
  ctx.fill()
  y += layout.gap + layout.translationLineHeight * 0.3

  ctx.fillStyle = colors.ink
  ctx.font = translationFont(layout.translationSize)
  for (const line of layout.translationLines) {
    ctx.fillText(line, WIDTH / 2, y)
    y += layout.translationLineHeight
  }

  ctx.fillStyle = colors.muted
  ctx.font = `24px ${FONTS.sans}`
  ctx.fillText(`— ${content.author}`, WIDTH / 2, y + 24 * scale)

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create image'))), 'image/png'),
  )
}
