"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { readPresence, touchPresence } from "../actions/presence"
import {
  presenceBody,
  presenceKey,
  RELEASE_PATH,
  type PresenceTarget,
} from "../presence"

export type PresenceView =
  | { status: "unknown" }
  | { status: "yours" }
  | { status: "free" }
  | { status: "other"; name: string; tookOver: boolean }

export const HEARTBEAT_MS = 60_000
/** How long after the editor has loaded its first touch waits. */
export const FIRST_TOUCH_MS = 2_000

/** Lets go of the target. Releases only this User's own rows, so any state is safe. */
function release(target: PresenceTarget) {
  try {
    // No fetch fallback: every browser we support has sendBeacon.
    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(RELEASE_PATH, presenceBody(target))
    }
  } catch {
    // Leaving must never throw; the row expires on its own.
  }
}

/**
 * Who else is editing this Page, Layout or Theme (information only: it never
 * stops a save).
 *
 * The editor touches the target once it has loaded (FIRST_TOUCH_MS after the
 * window's load event), then every minute, and when its tab becomes visible
 * again. The first touch waits because presence only informs, so it must not
 * compete with the editor's own load: Playwright's "network idle", which the
 * browser tests wait for, is lost for good when the canvas frame fetches a
 * late font after going idle while the Admin frame still has a request out
 * (playwright-core 1.63), and an early touch was that request. Waiting also
 * means a StrictMode remount in development claims nothing, so it releases
 * nothing. A mount that never touched sends no release.
 *
 * Payload deletes every row for a target on each write, so a save by anyone
 * clears everyone's hold. Hence:
 *
 *  - `refresh()` touches again at once after this editor's own save.
 *  - An editor that sees "other" only READS on its heartbeat. If it reads
 *    "free" it shows "free" and claims on its next tick, 60 s later, so the
 *    real holder (who re-touches after its own save) wins and a save by the
 *    watcher does not steal the hold.
 *  - "Took over" is shown when an editor that held the target gets "other".
 *
 * Limits: a hidden tab stops its heartbeat (its row expires after five
 * minutes); one person in two tabs sees no banner; an expired session makes
 * the actions answer null, which leaves the view as it was.
 *
 * A null target (a New Page before its first save) does nothing.
 */
export function usePresence(target: PresenceTarget | null): {
  view: PresenceView
  /** Take over: touches with takeOver, and the view becomes "yours". */
  takeOver: () => Promise<void>
  /** After this editor's own successful write: touches now if the view is "yours". */
  refresh: () => void
} {
  const [view, setView] = useState<PresenceView>({ status: "unknown" })
  const viewRef = useRef(view)
  const targetRef = useRef<PresenceTarget | null>(null)
  // Bumped on cleanup and on Take over, so an answer that arrives late (for a
  // target left behind, or from before the User took over) is dropped.
  const generation = useRef(0)
  // The request in flight, if any: a tick that finds one does nothing.
  const inFlight = useRef<object | null>(null)

  // Drops every answer still on its way, and the request that awaits them.
  const forget = useCallback(() => {
    generation.current++
    inFlight.current = null
  }, [])

  const show = useCallback((next: PresenceView) => {
    viewRef.current = next
    setView(next)
  }, [])

  // A different target starts again from what is not known yet.
  const key = target ? presenceKey(target) : null
  const [seenKey, setSeenKey] = useState(key)
  if (seenKey !== key) {
    setSeenKey(key)
    setView({ status: "unknown" })
  }
  useEffect(() => {
    viewRef.current = view
  }, [view])

  const tick = useCallback(async () => {
    const current = targetRef.current
    if (!current || inFlight.current) return
    if (document.visibilityState !== "visible") return
    const mine = generation.current
    const request = {}
    inFlight.current = request
    try {
      const before = viewRef.current
      if (before.status === "other") {
        const seen = await readPresence(current)
        if (!seen || mine !== generation.current) return
        show(
          seen.status === "other"
            ? { ...before, name: seen.name }
            : { status: "free" }
        )
      } else {
        const got = await touchPresence(current)
        if (!got || mine !== generation.current) return
        show(
          got.status === "other"
            ? {
                status: "other",
                name: got.name,
                tookOver: viewRef.current.status === "yours",
              }
            : { status: "yours" }
        )
      }
    } catch {
      // A failed heartbeat leaves the view as it was.
    } finally {
      if (inFlight.current === request) inFlight.current = null
    }
  }, [show])

  useEffect(() => {
    targetRef.current = target
    if (!key) return
    // Leaving releases only what this mount may have claimed: before its first
    // touch there is nothing to let go of.
    let touched = false
    const touch = () => {
      touched = true
      void tick()
    }
    let first: ReturnType<typeof setTimeout> | undefined
    const onLoad = () => {
      first = setTimeout(touch, FIRST_TOUCH_MS)
    }
    if (document.readyState === "complete") onLoad()
    else window.addEventListener("load", onLoad, { once: true })
    const timer = setInterval(touch, HEARTBEAT_MS)
    const onVisible = () => {
      if (document.visibilityState === "visible") touch()
    }
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) touch()
    }
    const onHide = () => {
      if (touched && targetRef.current) release(targetRef.current)
    }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("pageshow", onShow)
    window.addEventListener("pagehide", onHide)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
      window.removeEventListener("load", onLoad)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("pageshow", onShow)
      window.removeEventListener("pagehide", onHide)
      forget()
      onHide()
    }
    // `key` is what `target` says; its object identity does not matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick, forget])

  const takeOver = useCallback(async () => {
    const current = targetRef.current
    if (!current) return
    // A heartbeat already on its way answers from before this.
    forget()
    const mine = generation.current
    try {
      const got = await touchPresence(current, { takeOver: true })
      if (mine !== generation.current) return
      if (got?.status === "yours") show({ status: "yours" })
    } catch {
      // The banner stays; the User can try again.
    }
  }, [show, forget])

  const refresh = useCallback(() => {
    // Not through tick(): a heartbeat in flight must not swallow this one.
    const current = targetRef.current
    if (!current || viewRef.current.status !== "yours") return
    const mine = generation.current
    void touchPresence(current)
      .then((got) => {
        if (!got || mine !== generation.current) return
        if (got.status === "other") {
          show({ status: "other", name: got.name, tookOver: true })
        }
      })
      .catch(() => {})
  }, [show])

  return { view, takeOver, refresh }
}
