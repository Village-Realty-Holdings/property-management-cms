"use client"

import { useEffect, useRef, useState } from "react"

import type { Revision, RevisionResult, SaveConflict } from "../staleSave"
import type { StaleSaveDialogProps } from "./StaleSaveDialog"

type Retry = () => Promise<void | { ok?: boolean; message?: string }>

/**
 * The editor's side of the stale-save check. It holds the revision the editor
 * opened (and each save moves it on), sends it as `expected`, and when a save
 * is refused opens <StaleSaveDialog> with a retry behind "Save anyway".
 *
 * The revision lives in a ref, not in the document or the editor state: it is
 * not something the User edits, and must not make the editor dirty.
 */
export function useStaleSave({
  initial,
  dirty,
  discard,
  reload = () => window.location.reload(),
}: {
  /** The revision the editor opened; undefined for a new Page (no check yet). */
  initial: Revision | null | undefined
  dirty: boolean
  /** Drops the unsaved changes (so leaving does not warn). */
  discard: () => void
  /** Reloads the page; injectable for tests. */
  reload?: () => void
}): {
  expected: () => Revision | null | undefined
  /**
   * Call with every guarded save's result. A conflict opens the dialog with
   * `retry` behind Save anyway and returns true; otherwise the new revision is
   * kept and it returns false.
   */
  settle: (result: RevisionResult, retry: Retry) => boolean
  dialog: StaleSaveDialogProps
} {
  const revision = useRef<Revision | null | undefined>(initial)
  const [stale, setStale] = useState<{
    conflict: SaveConflict
    retry: Retry
  } | null>(null)
  const [reloading, setReloading] = useState(false)
  // Callbacks run later, on the latest of these.
  const latest = useRef({ stale, reload })
  useEffect(() => {
    latest.current = { stale, reload }
  })

  // The unsaved-changes guard reads `dirty` from its latest props in an
  // effect, so reloading in the same tick as `discard` would still prompt.
  // Child effects run first: by the time this one sees `dirty` false, the
  // guard has been told.
  useEffect(() => {
    if (reloading && !dirty) latest.current.reload()
  }, [reloading, dirty])

  return {
    expected: () => revision.current,
    settle(result, retry) {
      if (result.conflict) {
        setStale({ conflict: result.conflict, retry })
        return true
      }
      if (result.revision !== undefined) revision.current = result.revision
      return false
    },
    dialog: {
      conflict: stale?.conflict ?? null,
      onReload() {
        discard()
        setReloading(true)
      },
      async onSaveAnyway() {
        const open = latest.current.stale
        if (!open) return
        const result = await open.retry()
        if (result && result.ok === false) return result
        // A retry that hit a newer conflict has already replaced `stale`.
        setStale((now) => (now === open ? null : now))
      },
      onClose: () => setStale(null),
    },
  }
}
