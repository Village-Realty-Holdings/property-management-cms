"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { isDirty } from "./dirty"

/**
 * Tracks whether an editor's `value` differs from what was last saved. The
 * value on first render is the saved baseline.
 *
 *   const { dirty, markSaved } = useDirtyState(values)
 *   // after a successful save:
 *   markSaved()              // the current values are now the saved ones
 *   markSaved(serverValues)  // or: what the server actually stored
 */
export function useDirtyState<T>(value: T): {
  dirty: boolean
  markSaved: (saved?: T) => void
} {
  const [baseline, setBaseline] = useState(value)
  const latest = useRef(value)
  useEffect(() => {
    latest.current = value
  })
  const markSaved = useCallback(
    (saved?: T) => setBaseline(saved === undefined ? latest.current : saved),
    []
  )
  return { dirty: isDirty(baseline, value), markSaved }
}
