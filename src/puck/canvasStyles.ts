/**
 * The visual editor's canvas must look like the public page, but the public
 * stylesheet (Tailwind with preflight, theme tokens) cannot be loaded into the
 * admin document: preflight overrides Payload's layered admin CSS. So the
 * canvas iframe gets the public page's own stylesheets instead, found by
 * fetching a public page once per view load and reading its
 * <link rel="stylesheet">, <style> tags and the <html> class (next/font
 * variables).
 *
 * The tenant theme global renders as an inline <style> in the page head, so
 * the canvas also picks up per-tenant colours and fonts this way.
 */
export type CanvasStyles = { links: string[]; inline: string[]; htmlClass: string }

export const emptyCanvasStyles: CanvasStyles = { links: [], inline: [], htmlClass: '' }

export function parseCanvasStyles(html: string, origin: string): CanvasStyles {
  const links = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)]
    .map((m) => /href=["']([^"']+)["']/i.exec(m[0])?.[1])
    .filter((href): href is string => Boolean(href))
    .map((href) => (href.startsWith('/') ? `${origin}${href}` : href))
  const inline = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).filter((css) => css.trim())
  const htmlClass = /<html\b[^>]*\bclass=["']([^"']*)["']/i.exec(html)?.[1] ?? ''
  return { links: [...new Set(links)], inline, htmlClass }
}

/**
 * Tries each path in turn and keeps the first response that carries any
 * stylesheet. The page's own URL is the best source; a bare not-found (for
 * example "/" on a site with no home page) renders without the layout.
 */
export async function fetchCanvasStyles(origin: string, paths: string[], headers?: HeadersInit): Promise<CanvasStyles> {
  for (const path of paths) {
    try {
      const res = await fetch(`${origin}${path}`, { cache: 'no-store', headers: { accept: 'text/html', ...headers } })
      if (!res.headers.get('content-type')?.includes('text/html')) continue
      const styles = parseCanvasStyles(await res.text(), origin)
      if (styles.links.length > 0 || styles.inline.length > 0) return styles
    } catch {
      /* try the next path */
    }
  }
  return emptyCanvasStyles
}
