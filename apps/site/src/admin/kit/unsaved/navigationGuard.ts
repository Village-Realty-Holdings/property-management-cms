/**
 * The DOM side of the unsaved-changes guard. One set of window/document
 * listeners serves whichever editor has registered a guard; nothing here knows
 * about React (see useUnsavedChangesGuard for that).
 *
 * What is intercepted while the registered guard is dirty:
 *  - Link clicks: a capture-phase click listener stops the click before the
 *    router's own handler sees it.
 *  - Back / forward: history entries are stamped with an index, so the size of
 *    a traversal is known. A popstate listener that runs before the router's
 *    keeps the router from seeing it and steps the history back to where the
 *    user was. (It must be registered first; see `install`.)
 *  - Closing or reloading the tab: a `beforeunload` warning.
 * Programmatic `router.push()` cannot be caught from outside; editors use the
 * guarded router from `useUnsavedChangesGuard` for that.
 */
import type { NavTarget } from "./guardMachine"
import {
  interceptedHref,
  shouldWarnOnUnload,
  traversalDelta,
  type ClickInfo,
} from "./interception"

export type GuardRegistration = {
  isDirty: () => boolean
  /** An intercepted navigation that needs a decision from the user. */
  onAttempt: (target: NavTarget) => void
}

const INDEX_KEY = "__adminKitHistoryIndex"
/** How long a "let this one through" flag lives if the browser never fires. */
const FLAG_TTL_MS = 1000

const guards: GuardRegistration[] = []
let retainers = 0
let uninstall: (() => void) | null = null

let currentIndex: number | undefined
let bypassPopstate = false
let bypassTimer: ReturnType<typeof setTimeout> | undefined
let reverting: { to: number | undefined } | null = null
let revertTimer: ReturnType<typeof setTimeout> | undefined
let unloadWarningSuspended = false
let unloadTimer: ReturnType<typeof setTimeout> | undefined

/** The index stamped on the current history entry (undefined until tracked). */
export function currentHistoryIndex(): number | undefined {
  return currentIndex
}

/**
 * Registers the guard for the editor on screen. The most recent registration
 * decides. Returns the function that removes it.
 */
export function registerNavigationGuard(guard: GuardRegistration): () => void {
  guards.push(guard)
  const release = retainNavigationRuntime()
  let done = false
  return () => {
    if (done) return
    done = true
    const at = guards.indexOf(guard)
    if (at >= 0) guards.splice(at, 1)
    release()
  }
}

/**
 * Keeps history numbering alive without any guard, so that traversals are
 * already understood when a guard appears. Mounted once by the Admin's host.
 * Returns the release function; listeners go away with the last release.
 */
export function retainNavigationRuntime(): () => void {
  if (typeof window === "undefined") return () => {}
  if (retainers++ === 0) uninstall = install()
  let done = false
  return () => {
    if (done) return
    done = true
    if (--retainers === 0) {
      uninstall?.()
      uninstall = null
    }
  }
}

/**
 * Carries out a navigation the user has approved (or that was never blocked).
 * `navigate` is the router's push/replace, used for `href` targets.
 */
export function proceedTo(
  target: NavTarget,
  navigate: (href: string, replace: boolean) => void
): void {
  suspendUnloadWarning()
  if (target.kind === "href") {
    navigate(target.href, target.replace === true)
    return
  }
  bypassPopstate = true
  clearTimeout(bypassTimer)
  bypassTimer = setTimeout(() => (bypassPopstate = false), FLAG_TTL_MS)
  window.history.go(target.delta)
}

function suspendUnloadWarning() {
  unloadWarningSuspended = true
  clearTimeout(unloadTimer)
  unloadTimer = setTimeout(() => (unloadWarningSuspended = false), 2000)
}

function activeGuard(): GuardRegistration | undefined {
  const guard = guards[guards.length - 1]
  return guard?.isDirty() ? guard : undefined
}

function readIndex(state: unknown): number | undefined {
  if (typeof state !== "object" || state === null) return undefined
  const value = (state as Record<string, unknown>)[INDEX_KEY]
  return typeof value === "number" ? value : undefined
}

/**
 * The state with our index added. Entries whose state is null (or a primitive)
 * are left alone: Next treats a null state as "not ours, ignore" and a state
 * without `__NA` as "reload the page", so we must not invent one. Such entries
 * simply stay untracked (see `traversalDelta`).
 */
function withIndex(state: unknown, index: number): unknown {
  if (typeof state === "object" && state !== null) {
    return { ...state, [INDEX_KEY]: index }
  }
  return state
}

function install(): () => void {
  const history = window.history
  const originalPush = history.pushState
  const originalReplace = history.replaceState
  let active = true

  currentIndex = readIndex(history.state)
  if (currentIndex === undefined) {
    currentIndex = 0
    originalReplace.call(
      history,
      withIndex(history.state, 0),
      "",
      window.location.href
    )
  }

  const push: History["pushState"] = function (data, unused, url) {
    if (!active) return originalPush.call(history, data, unused, url)
    const next = (currentIndex ?? 0) + 1
    originalPush.call(history, withIndex(data, next), unused, url)
    currentIndex = next
  }
  const replace: History["replaceState"] = function (data, unused, url) {
    if (!active) return originalReplace.call(history, data, unused, url)
    originalReplace.call(
      history,
      withIndex(data, currentIndex ?? 0),
      unused,
      url
    )
  }
  history.pushState = push
  history.replaceState = replace

  const onClick = (event: MouseEvent) => {
    const guard = activeGuard()
    if (!guard) return
    const href = interceptedHref(clickInfo(event), window.location.href)
    if (!href) return
    event.preventDefault()
    event.stopPropagation()
    guard.onAttempt({ kind: "href", href })
  }

  const onPopState = (event: PopStateEvent) => {
    const index = readIndex(event.state)

    if (reverting && (reverting.to === undefined || index === reverting.to)) {
      // Our own step back to where the user was: the router never hears of it.
      reverting = null
      clearTimeout(revertTimer)
      event.stopImmediatePropagation()
      return
    }
    if (bypassPopstate) {
      bypassPopstate = false
      clearTimeout(bypassTimer)
      currentIndex = index
      return
    }
    const guard = activeGuard()
    if (!guard) {
      currentIndex = index
      return
    }
    const delta = traversalDelta(currentIndex, index)
    event.stopImmediatePropagation()
    reverting = { to: currentIndex }
    clearTimeout(revertTimer)
    revertTimer = setTimeout(() => (reverting = null), FLAG_TTL_MS)
    history.go(-delta)
    guard.onAttempt({ kind: "history", delta })
  }

  const onBeforeUnload = (event: BeforeUnloadEvent) => {
    if (unloadWarningSuspended) return
    const dirty = guards[guards.length - 1]?.isDirty() ?? false
    if (!shouldWarnOnUnload(dirty)) return
    event.preventDefault()
    // Older browsers only show the prompt when returnValue is set.
    event.returnValue = ""
  }

  document.addEventListener("click", onClick, true)
  // Window listeners run in registration order, so this only keeps the router
  // from hearing a held-back traversal because it is registered first:
  // <AdminKitHost> installs the runtime in an effect, and effects of children
  // run before the effect of the app router above them, which is where Next
  // adds its own popstate listener.
  window.addEventListener("popstate", onPopState)
  window.addEventListener("beforeunload", onBeforeUnload)

  return () => {
    active = false
    document.removeEventListener("click", onClick, true)
    window.removeEventListener("popstate", onPopState)
    window.removeEventListener("beforeunload", onBeforeUnload)
    if (history.pushState === push) history.pushState = originalPush
    if (history.replaceState === replace) history.replaceState = originalReplace
    reverting = null
    bypassPopstate = false
    unloadWarningSuspended = false
    currentIndex = undefined
  }
}

function clickInfo(event: MouseEvent): ClickInfo {
  const target = event.target
  const anchor =
    target instanceof Element ? target.closest<HTMLElement>("a[href]") : null
  return {
    button: event.button,
    metaKey: event.metaKey,
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    altKey: event.altKey,
    defaultPrevented: event.defaultPrevented,
    anchor:
      anchor instanceof HTMLAnchorElement
        ? {
            href: anchor.href,
            target: anchor.getAttribute("target"),
            download: anchor.hasAttribute("download"),
          }
        : null,
  }
}
