import { flameTongues, pixelLayout, type PixelLayout } from '../layout'
import type { FrameSettings } from '../types'

export interface SourceImage {
  image: CanvasImageSource
  width: number
  height: number
}

const TAU = Math.PI * 2

/**
 * Draw the avatar (photo + frame) onto a square canvas of `size` pixels.
 *
 * Deterministic: output depends only on the arguments — no randomness (flames use a fixed
 * seed), no time, no device pixel ratio. All geometry comes from `pixelLayout`, which is
 * proportional to `size`, so a 400 px preview and a 1080 px export line up exactly.
 */
export function drawAvatar(
  ctx: CanvasRenderingContext2D,
  size: number,
  settings: FrameSettings,
  source: SourceImage | null,
): void {
  const layout = pixelLayout(settings, size)
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  ctx.clearRect(0, 0, size, size)

  ctx.fillStyle = settings.background
  ctx.fillRect(0, 0, size, size)

  drawPhoto(ctx, layout, source)
  if (settings.kind === 'dark') drawVignette(ctx, layout, settings.effect)

  ctx.globalAlpha = settings.opacity
  switch (settings.kind) {
    case 'none':
      break
    case 'solid':
    case 'minimal':
      ring(ctx, layout)
      ctx.fillStyle = settings.color
      ctx.fill()
      break
    case 'gradient':
      drawGradientRing(ctx, layout, settings)
      break
    case 'dark':
      drawDarkRing(ctx, layout, settings)
      break
    case 'neon':
      drawNeonRing(ctx, layout, settings, size)
      break
    case 'flame':
      drawFlames(ctx, layout, settings)
      break
  }
  ctx.restore()
}

function drawPhoto(ctx: CanvasRenderingContext2D, l: PixelLayout, source: SourceImage | null) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(l.center, l.center, l.photo, 0, TAU)
  ctx.closePath()
  ctx.clip()
  const d = l.photo * 2
  const x = l.center - l.photo
  if (source && source.width > 0 && source.height > 0) {
    // Cover-fit: centre-crop non-square sources.
    const side = Math.min(source.width, source.height)
    const sx = (source.width - side) / 2
    const sy = (source.height - side) / 2
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source.image, sx, sy, side, side, x, x, d, d)
  } else {
    ctx.fillStyle = '#27272a'
    ctx.fillRect(x, x, d, d)
  }
  ctx.restore()
}

/** Annulus path between the ring radii (even-odd via reversed inner arc). */
function ring(
  ctx: CanvasRenderingContext2D,
  l: PixelLayout,
  inner = l.ringInner,
  outer = l.ringOuter,
) {
  ctx.beginPath()
  ctx.arc(l.center, l.center, outer, 0, TAU, false)
  ctx.arc(l.center, l.center, inner, 0, TAU, true)
  ctx.closePath()
}

function drawGradientRing(ctx: CanvasRenderingContext2D, l: PixelLayout, s: FrameSettings) {
  const a = (s.angle * Math.PI) / 180
  const dx = Math.cos(a) * l.ringOuter
  const dy = Math.sin(a) * l.ringOuter
  const g = ctx.createLinearGradient(l.center - dx, l.center - dy, l.center + dx, l.center + dy)
  g.addColorStop(0, s.color)
  g.addColorStop(1, s.color2)
  ring(ctx, l)
  ctx.fillStyle = g
  ctx.fill()
}

function drawDarkRing(ctx: CanvasRenderingContext2D, l: PixelLayout, s: FrameSettings) {
  ring(ctx, l)
  ctx.fillStyle = s.color
  ctx.fill()
  // Bevel: light from the top, shade at the bottom.
  const g = ctx.createLinearGradient(
    l.center,
    l.center - l.ringOuter,
    l.center,
    l.center + l.ringOuter,
  )
  g.addColorStop(0, 'rgba(255,255,255,0.14)')
  g.addColorStop(1, 'rgba(0,0,0,0.4)')
  ring(ctx, l)
  ctx.fillStyle = g
  ctx.fill()
}

function drawVignette(ctx: CanvasRenderingContext2D, l: PixelLayout, strength: number) {
  if (strength <= 0) return
  const g = ctx.createRadialGradient(
    l.center,
    l.center,
    l.photo * 0.55,
    l.center,
    l.center,
    l.photo,
  )
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, `rgba(0,0,0,${(0.85 * strength).toFixed(3)})`)
  ctx.beginPath()
  ctx.arc(l.center, l.center, l.photo, 0, TAU)
  ctx.closePath()
  ctx.fillStyle = g
  ctx.fill()
}

function drawNeonRing(
  ctx: CanvasRenderingContext2D,
  l: PixelLayout,
  s: FrameSettings,
  size: number,
) {
  const radius = (l.ringInner + l.ringOuter) / 2
  const width = l.ringOuter - l.ringInner
  ctx.save()
  ctx.lineWidth = width
  ctx.strokeStyle = s.color
  ctx.shadowColor = s.color
  // A Gaussian blur's visible extent is ~1.5× shadowBlur; keep it inside the reserved reach.
  ctx.shadowBlur = s.effect > 0 ? (l.effectReach / 1.5) * 0.9 : 0
  const passes = s.effect > 0 ? 2 : 1
  for (let i = 0; i < passes; i++) {
    ctx.beginPath()
    ctx.arc(l.center, l.center, radius, 0, TAU)
    ctx.stroke()
  }
  ctx.restore()
  // Bright core of the tube.
  ctx.save()
  ctx.globalAlpha *= 0.85
  ctx.lineWidth = Math.max(width * 0.35, size * 0.002)
  ctx.strokeStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(l.center, l.center, radius, 0, TAU)
  ctx.stroke()
  ctx.restore()
}

function tonguePath(
  ctx: CanvasRenderingContext2D,
  l: PixelLayout,
  baseRadius: number,
  reach: number,
  t: { angle: number; halfWidth: number; height: number; lean: number },
  scale: number,
) {
  const c = l.center
  const tipR = baseRadius + reach * t.height * scale
  const halfW = t.halfWidth * scale
  const at = (r: number, a: number) => [c + Math.cos(a) * r, c + Math.sin(a) * r] as const
  const [lx, ly] = at(baseRadius, t.angle - halfW)
  const [rx, ry] = at(baseRadius, t.angle + halfW)
  const [tx, ty] = at(tipR, t.angle + t.lean)
  const midR = baseRadius + (tipR - baseRadius) * 0.45
  const [c1x, c1y] = at(midR, t.angle - halfW * 1.1)
  const [c2x, c2y] = at(midR, t.angle + halfW * 1.1)
  ctx.moveTo(lx, ly)
  ctx.quadraticCurveTo(c1x, c1y, tx, ty)
  ctx.quadraticCurveTo(c2x, c2y, rx, ry)
  ctx.closePath()
}

function drawFlames(ctx: CanvasRenderingContext2D, l: PixelLayout, s: FrameSettings) {
  const tongues = flameTongues()
  const base = l.ringOuter - (l.ringOuter - l.ringInner) / 2
  // Tongues start at mid-ring, so they never reach past ringOuter + reach (≤ the safe circle).
  const reach = l.effectReach + (l.ringOuter - base)
  const layers = [
    { scale: 1, from: s.color2, to: s.color2, alpha: [0.95, 0] as const },
    { scale: 0.6, from: s.color, to: s.color2, alpha: [1, 0] as const },
  ]
  for (const layer of layers) {
    const g = ctx.createRadialGradient(
      l.center,
      l.center,
      base,
      l.center,
      l.center,
      base + reach * layer.scale,
    )
    g.addColorStop(0, withAlpha(layer.from, layer.alpha[0]))
    g.addColorStop(1, withAlpha(layer.to, layer.alpha[1]))
    ctx.beginPath()
    for (const tongue of tongues) tonguePath(ctx, l, base, reach, tongue, layer.scale)
    ctx.fillStyle = g
    ctx.fill()
  }
  // Glowing base ring.
  const g = ctx.createRadialGradient(
    l.center,
    l.center,
    l.ringInner,
    l.center,
    l.center,
    l.ringOuter,
  )
  g.addColorStop(0, s.color)
  g.addColorStop(1, s.color2)
  ring(ctx, l)
  ctx.fillStyle = g
  ctx.fill()
}

/** `#rrggbb` + alpha → `rgba()`. */
export function withAlpha(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}
