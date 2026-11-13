import axe from 'axe-core'

/**
 * Run axe-core against the rendered document and return readable violations.
 * Colour contrast is skipped because jsdom has no layout or computed colours; it is
 * checked manually against the design tokens instead.
 */
export async function axeViolations(root: Element = document.body): Promise<string[]> {
  const results = await axe.run(root, {
    rules: { 'color-contrast': { enabled: false } },
  })
  return results.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`,
  )
}
