/**
 * Pure predicates the navigation guard uses to decide what to intercept.
 * The DOM plumbing that feeds them lives in navigationGuard.ts.
 */

/** What a click event tells us, as plain data. */
export type ClickInfo = {
  button: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  defaultPrevented: boolean
  /** The link the click landed on (`href` resolved to absolute), if any. */
  anchor: { href: string; target: string | null; download: boolean } | null
}

/**
 * The in-app route (`/path?query#hash`) a click would navigate to, or null
 * when the guard must leave the click alone: not a plain left click on a link,
 * opens elsewhere (new tab/window, download, other origin or protocol), or does
 * not change the page (same path and query, e.g. a `#hash` jump).
 */
export function interceptedHref(
  click: ClickInfo,
  currentHref: string
): string | null {
  const { anchor } = click
  if (!anchor || click.defaultPrevented || click.button !== 0) return null
  if (click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) {
    return null
  }
  if (anchor.download) return null
  if (anchor.target && anchor.target !== "_self") return null

  let next: URL
  let current: URL
  try {
    next = new URL(anchor.href)
    current = new URL(currentHref)
  } catch {
    return null
  }
  if (next.protocol !== "http:" && next.protocol !== "https:") return null
  if (next.origin !== current.origin) return null
  if (next.pathname === current.pathname && next.search === current.search) {
    return null
  }
  return `${next.pathname}${next.search}${next.hash}`
}

/** Whether closing or reloading the tab should show the browser's warning. */
export function shouldWarnOnUnload(dirty: boolean): boolean {
  return dirty
}

/**
 * How many history entries a back/forward moved, from the index we stamp on
 * each entry. An entry without an index (made before tracking started) counts
 * as one step back, the common case. Never 0.
 */
export function traversalDelta(
  from: number | undefined,
  to: number | undefined
): number {
  if (from === undefined || to === undefined || from === to) return -1
  return to - from
}
