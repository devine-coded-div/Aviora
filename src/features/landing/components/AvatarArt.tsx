import { useId } from 'react'
import { PIXEL_GRID, PIXEL_PALETTE } from '../pixel-portrait'
import type { AvatarArtStyle } from '../types'

/**
 * Hand-drawn SVG portraits of one invented person in each art style.
 * They illustrate the styles on the landing page; they are not AI output.
 */
export interface AvatarArtProps {
  variant: AvatarArtStyle
  /** Accessible description. Omit when the surrounding UI already describes the image. */
  label?: string
  className?: string
}

export function AvatarArt({ variant, label, className }: AvatarArtProps) {
  const uid = useId().replace(/:/g, '')
  const a11y = label
    ? ({ role: 'img', 'aria-label': label } as const)
    : ({ 'aria-hidden': true } as const)

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
      shapeRendering={variant === 'pixel' ? 'crispEdges' : 'geometricPrecision'}
      {...a11y}
    >
      {variant === 'cartoon' && <Cartoon />}
      {variant === 'anime' && <Anime uid={uid} />}
      {variant === 'realistic' && <Realistic uid={uid} />}
      {variant === 'illustration' && <Illustration />}
      {variant === 'pixel' && <Pixel />}
    </svg>
  )
}

const ink = '#18181b'

function Cartoon() {
  const skin = '#f5c9a5'
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <rect width="200" height="200" fill="#fde68a" />
      <path
        d="M28 206 C36 160 70 146 100 146 C130 146 164 160 172 206 Z"
        fill="#3b82f6"
        stroke={ink}
        strokeWidth="4"
      />
      <rect x="86" y="126" width="28" height="26" fill={skin} stroke={ink} strokeWidth="4" />
      <circle cx="57" cy="100" r="9" fill={skin} stroke={ink} strokeWidth="4" />
      <circle cx="143" cy="100" r="9" fill={skin} stroke={ink} strokeWidth="4" />
      <ellipse cx="100" cy="96" rx="44" ry="47" fill={skin} stroke={ink} strokeWidth="4" />
      <path
        d="M54 94 C48 52 76 36 102 38 C132 40 154 58 146 96 C140 78 126 66 102 66 C82 66 66 76 54 94 Z"
        fill="#7c2d12"
        stroke={ink}
        strokeWidth="4"
      />
      <path d="M72 84 q10 -6 20 0 M108 84 q10 -6 20 0" fill="none" stroke={ink} strokeWidth="4" />
      <ellipse cx="82" cy="100" rx="9" ry="10.5" fill="#fff" stroke={ink} strokeWidth="3" />
      <ellipse cx="118" cy="100" rx="9" ry="10.5" fill="#fff" stroke={ink} strokeWidth="3" />
      <circle cx="84" cy="102" r="5" fill={ink} />
      <circle cx="120" cy="102" r="5" fill={ink} />
      <circle cx="85.5" cy="100" r="1.6" fill="#fff" />
      <circle cx="121.5" cy="100" r="1.6" fill="#fff" />
      <path d="M100 106 q-5 9 2 11" fill="none" stroke={ink} strokeWidth="3" />
      <ellipse cx="72" cy="116" rx="7" ry="4" fill="#fb7185" opacity="0.55" />
      <ellipse cx="128" cy="116" rx="7" ry="4" fill="#fb7185" opacity="0.55" />
      <path d="M86 122 Q100 138 114 122 Z" fill="#7f1d1d" stroke={ink} strokeWidth="3.5" />
    </g>
  )
}

function Anime({ uid }: { uid: string }) {
  const bg = `anime-bg-${uid}`
  const skin = '#fde3d0'
  const hair = '#1e293b'
  return (
    <g>
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#fbcfe8" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#${bg})`} />
      <path d="M44 150 C40 90 58 40 100 36 C142 40 160 90 156 150 Z" fill={hair} />
      <path d="M30 206 C38 166 70 152 100 152 C130 152 162 166 170 206 Z" fill="#312e81" />
      <path d="M82 152 L100 176 L118 152 Z" fill="#f8fafc" />
      <rect x="89" y="128" width="22" height="28" fill="#f1c7ad" />
      <path
        d="M58 88 C58 60 78 48 100 48 C122 48 142 60 142 88 C142 116 124 138 100 146 C76 138 58 116 58 88 Z"
        fill={skin}
      />
      <path
        d="M52 98 C46 56 70 32 100 32 C132 32 156 56 148 100 L140 80 L132 98 L124 68 L112 92 L104 62 L92 92 L82 66 L74 96 L66 76 L60 102 Z"
        fill={hair}
      />
      <path
        d="M86 46 q14 -6 30 4"
        fill="none"
        stroke="#475569"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M72 88 l18 -3 M110 85 l18 3" stroke={hair} strokeWidth="2.5" strokeLinecap="round" />
      {[82, 118].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx} cy="104" rx="9.5" ry="12.5" fill="#4c1d95" />
          <ellipse cx={cx} cy="107" rx="6.5" ry="8" fill="#8b5cf6" />
          <circle cx={cx - 3} cy="99" r="3.2" fill="#fff" />
          <circle cx={cx + 3.5} cy="110" r="1.5" fill="#fff" />
          <path
            d={`M${cx - 12} 94 q12 -7 24 0`}
            fill="none"
            stroke={hair}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </g>
      ))}
      <path d="M101 114 l-2 6" stroke="#e0a58a" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M94 128 q6 5 12 0"
        fill="none"
        stroke="#9f4a4a"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M68 118 l6 -3 M72 121 l6 -3 M122 115 l6 3 M126 118 l6 3"
        stroke="#f9a8b4"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>
  )
}

function Realistic({ uid }: { uid: string }) {
  const bg = `real-bg-${uid}`
  const skin = `real-skin-${uid}`
  const hair = `real-hair-${uid}`
  return (
    <g>
      <defs>
        <radialGradient id={bg} cx="0.5" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#6b6b73" />
          <stop offset="1" stopColor="#1f1f23" />
        </radialGradient>
        <radialGradient id={skin} cx="0.45" cy="0.4" r="0.65">
          <stop offset="0" stopColor="#ecc2a0" />
          <stop offset="0.7" stopColor="#d49a74" />
          <stop offset="1" stopColor="#b77b57" />
        </radialGradient>
        <linearGradient id={hair} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a3424" />
          <stop offset="1" stopColor="#1c120b" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#${bg})`} />
      <path d="M26 206 C34 164 68 150 100 150 C132 150 166 164 174 206 Z" fill="#334155" />
      <path d="M78 150 Q100 170 122 150" fill="none" stroke="#1e293b" strokeWidth="3" />
      <rect x="86" y="124" width="28" height="32" rx="6" fill="#c08562" />
      <ellipse cx="100" cy="132" rx="16" ry="6" fill="#8d5a3d" opacity="0.5" />
      <ellipse cx="60" cy="102" rx="6" ry="10" fill="#c78a64" />
      <ellipse cx="140" cy="102" rx="6" ry="10" fill="#c78a64" />
      <ellipse cx="100" cy="96" rx="40" ry="48" fill={`url(#${skin})`} />
      <path
        d="M58 92 C54 52 80 40 104 42 C130 44 148 60 142 92 C138 72 126 62 112 62 C96 64 80 58 70 66 C62 72 60 82 58 92 Z"
        fill={`url(#${hair})`}
      />
      <path d="M72 86 q11 -6 22 -1 l0 3 q-11 -4 -22 1 Z" fill="#2b1d14" />
      <path d="M106 85 q11 -5 22 1 l0 3 q-11 -5 -22 -1 Z" fill="#2b1d14" />
      {[83, 117].map((cx) => (
        <g key={cx}>
          <path d={`M${cx - 12} 99 q12 -9 24 0 q-12 8 -24 0 Z`} fill="#f4efe9" />
          <circle cx={cx} cy="99" r="5" fill="#5b3a29" />
          <circle cx={cx} cy="99" r="2.3" fill="#111" />
          <circle cx={cx + 1.6} cy="97.6" r="1" fill="#fff" opacity="0.9" />
          <path d={`M${cx - 12} 99 q12 -9 24 0`} fill="none" stroke="#3b2618" strokeWidth="1.6" />
        </g>
      ))}
      <path
        d="M100 102 q-2 12 -6 17 q6 3 12 0"
        fill="none"
        stroke="#a8704f"
        strokeWidth="2"
        opacity="0.8"
        strokeLinecap="round"
      />
      <path d="M88 129 q12 -5 24 0 q-12 8 -24 0 Z" fill="#b5645a" />
      <path d="M88 129 q12 2 24 0" fill="none" stroke="#8e463e" strokeWidth="1.2" />
    </g>
  )
}

function Illustration() {
  const skin = '#f2b48c'
  return (
    <g>
      <rect width="200" height="200" fill="#0f766e" />
      <circle cx="160" cy="44" r="22" fill="#fbbf24" opacity="0.9" />
      <rect x="50" y="64" width="100" height="96" rx="20" fill="#111827" />
      <path d="M30 206 C36 166 68 152 100 152 C132 152 164 166 170 206 Z" fill="#f97316" />
      <rect x="88" y="126" width="24" height="30" fill="#e09b72" />
      <ellipse cx="100" cy="98" rx="38" ry="44" fill={skin} />
      <path
        d="M58 98 C56 56 82 44 104 46 C128 48 146 64 142 96 C122 92 96 80 84 62 C78 78 68 90 58 98 Z"
        fill="#111827"
      />
      <circle cx="84" cy="104" r="4" fill="#111827" />
      <circle cx="116" cy="104" r="4" fill="#111827" />
      <circle cx="76" cy="118" r="7" fill="#f87171" opacity="0.35" />
      <circle cx="124" cy="118" r="7" fill="#f87171" opacity="0.35" />
      <path
        d="M92 124 q8 6 16 0"
        fill="none"
        stroke="#111827"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="62" y="172" width="20" height="6" rx="3" fill="#fed7aa" />
    </g>
  )
}

function Pixel() {
  const cell = 200 / 16
  return (
    <g>
      {PIXEL_GRID.flatMap((row, y) =>
        [...row].map((key, x) => (
          <rect
            key={`${x}-${y}`}
            x={x * cell}
            y={y * cell}
            width={cell + 0.5}
            height={cell + 0.5}
            fill={PIXEL_PALETTE[key] ?? '#000'}
          />
        )),
      )}
    </g>
  )
}
