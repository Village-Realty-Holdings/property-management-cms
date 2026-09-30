"use client"

import { useEffect } from "react"
import { toast } from "sonner"

/** The part of a form/action result the toast cares about (a `FormState`). */
export type SaveResultLike = { ok?: boolean; message?: string }

/**
 * The toast text for a save result, or null when no toast is due. Only
 * successes toast; a failure is shown inline (`<InlineError>`), where the user
 * can act on it.
 */
export function saveToastMessage(result: SaveResultLike): string | null {
  if (result.ok !== true) return null
  return result.message || "Saved"
}

/**
 * Fire-and-forget confirmations. There is deliberately no `error`: failures
 * are shown inline, next to what failed.
 */
export const notify = {
  /** "Saved", or "Brand saved" when the thing saved is named. */
  saved(what?: string) {
    toast.success(what ? `${what} saved` : "Saved")
  },
  success(message: string) {
    toast.success(message)
  },
  info(message: string) {
    toast.info(message)
  },
}

/**
 * Toasts each successful result of a `useActionState` form. Every action run
 * yields a new state object, so each success toasts exactly once.
 *
 *   const [state, action] = useActionState(saveBrand, initialFormState)
 *   useSaveToast(state)
 */
export function useSaveToast(state: SaveResultLike): void {
  useEffect(() => {
    const message = saveToastMessage(state)
    if (message) toast.success(message)
  }, [state])
}
