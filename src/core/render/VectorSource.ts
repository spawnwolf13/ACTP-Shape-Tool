import type { VectorShapeSource } from '../../state/resources/ResourceRegistry'

const COMMENT_PATTERN = /<!--[\s\S]*?-->/g

/**
 * Parses an uploaded SVG's raw text into its native viewBox + inner markup
 * (paths/groups/etc., no outer <svg> wrapper) — ready to splice straight
 * into an exported <symbol>, preserving the original vector geometry
 * instead of rasterizing it.
 *
 * Every `id` in the markup is namespaced with `prefix` (and every
 * same-document reference to it — `url(#id)`, `href="#id"` — rewritten to
 * match), since multiple independently-uploaded shapes end up sharing one
 * exported <defs> and would otherwise collide. Explicit `fill` (the common
 * case for solid icon SVGs) is stripped from descendants — but `fill="none"`
 * is preserved — so the per-cell tint on the <use> element's own `fill`
 * cascades through correctly instead of being shadowed by the source
 * artwork's original color. <script> elements and `on*` handlers are
 * stripped too: this markup is spliced verbatim into a file the user may
 * reopen as a live SVG document, not just viewed as a raster preview.
 */
export function parseSVGVectorSource(svgText: string, prefix: string): VectorShapeSource | null {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  const root = doc.documentElement
  if (!root || root.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) return null

  const viewBox = resolveViewBox(root)

  root.querySelectorAll('script').forEach((node) => node.remove())
  sanitizeDescendants(root)

  const serializer = new XMLSerializer()
  const markup = Array.from(root.childNodes)
    .map((node) => serializer.serializeToString(node))
    .join('')
    .replace(COMMENT_PATTERN, '')
    .trim()

  if (!markup) return null

  // XML ids can't start with a digit — `prefix` is typically a UUID
  // resourceId, which can, so give it a safe letter lead-in.
  return { innerMarkup: namespaceIds(markup, `vs-${prefix}`), viewBox }
}

/** Decodes an SVG `data:` URL (either `;base64,` or percent-encoded) back to raw SVG text, or null if it isn't one. */
export function decodeSVGDataUrl(dataUrl: string): string | null {
  const match = /^data:image\/svg\+xml(?:;charset=[^,;]+)?(;base64)?,([\s\S]*)$/.exec(dataUrl)
  if (!match) return null
  const [, isBase64, payload] = match
  try {
    return isBase64 ? atob(payload) : decodeURIComponent(payload)
  } catch {
    return null
  }
}

function resolveViewBox(root: Element): string {
  const explicit = root.getAttribute('viewBox')
  if (explicit?.trim()) return explicit.trim()

  const width = parseFloat(root.getAttribute('width') ?? '')
  const height = parseFloat(root.getAttribute('height') ?? '')
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return `0 0 ${width} ${height}`
  }
  return '0 0 100 100'
}

function sanitizeDescendants(root: Element): void {
  root.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      if (/^on/i.test(attr.name)) {
        el.removeAttribute(attr.name)
      } else if (attr.name === 'style' && attr.value) {
        const cleaned = attr.value.replace(/fill\s*:\s*(?!none\b)[^;]+;?/gi, '').trim()
        if (cleaned) el.setAttribute('style', cleaned)
        else el.removeAttribute('style')
      }
    }

    // Recolor explicitly via currentColor rather than relying on bare fill
    // inheritance through <use>/<symbol> — browsers resolve that correctly,
    // but Illustrator's SVG paste parser is inconsistent about it and can
    // render the shape as solid black or an empty group. currentColor
    // resolves from the `color`/`fill` the <use> element sets at instance
    // time (see SVGExporter), so every element gets it explicitly unless
    // it's deliberately unfilled (fill="none" — e.g. an outline icon's stroke path).
    const fill = el.getAttribute('fill')
    if (!fill || fill.trim().toLowerCase() !== 'none') {
      el.setAttribute('fill', 'currentColor')
    }
  })
}

function namespaceIds(markup: string, prefix: string): string {
  const ids = new Set<string>()
  const idPattern = /\sid="([^"]+)"/g
  let match: RegExpExecArray | null
  while ((match = idPattern.exec(markup))) ids.add(match[1])
  if (ids.size === 0) return markup

  let result = markup
  for (const id of ids) {
    const safeId = `${prefix}-${id}`
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result
      .replace(new RegExp(`\\sid="${escaped}"`, 'g'), ` id="${safeId}"`)
      .replace(new RegExp(`url\\(#${escaped}\\)`, 'g'), `url(#${safeId})`)
      .replace(new RegExp(`(href="#)${escaped}(")`, 'g'), `$1${safeId}$2`)
  }
  return result
}
