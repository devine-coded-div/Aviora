/**
 * Style ids the API accepts. Must match the frontend catalog (src/features/styles/catalog.ts);
 * a test enforces that. Real providers map these ids to their own prompts/models.
 */
export const STYLE_IDS = [
  'cartoon-bold',
  'cartoon-comic',
  'anime-classic',
  'anime-pastel',
  'realistic-studio',
  'realistic-film',
  'flat-vector',
  'editorial',
  'pixel-8bit',
  'pixel-16bit',
] as const

export type StyleId = (typeof STYLE_IDS)[number]

/** Premium styles always cost a credit. Must match `premium: true` in the frontend catalog. */
export const PREMIUM_STYLE_IDS: ReadonlySet<string> = new Set([
  'cartoon-comic',
  'anime-pastel',
  'realistic-studio',
  'realistic-film',
  'pixel-8bit',
  'pixel-16bit',
])

export function isStyleId(value: unknown): value is StyleId {
  return typeof value === 'string' && (STYLE_IDS as readonly string[]).includes(value)
}
