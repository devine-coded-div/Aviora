/**
 * Credit packs. Prices are defined only here, on the server; clients pick a pack by id and the
 * order amount is always taken from this table. Amounts are in paise (₹1 = 100 paise).
 * Placeholder prices — set real ones before launch.
 */
export const CURRENCY = 'INR'

export const PACKS = [
  { id: 'starter', name: 'Starter', credits: 10, amount: 9_900 },
  { id: 'creator', name: 'Creator', credits: 30, amount: 24_900 },
  { id: 'pro', name: 'Pro', credits: 100, amount: 69_900 },
] as const

export type Pack = (typeof PACKS)[number]

export function findPack(id: unknown): Pack | undefined {
  return PACKS.find((p) => p.id === id)
}

/** Credits per generation, by style. */
export const CREDITS_PER_GENERATION = 1
