"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import {
  idleGuard,
  reduceGuard,
  SAVE_FAILED_MESSAGE,
  saveOutcome,
  type GuardEffect,
  type GuardEvent,
  type GuardState,
  type NavTarget,
  type SaveResult,
} from "./guardMachine"
import { proceedTo, registerNavigationGuard } from "./navigationGuard"

export type UseUnsavedChangesGuardOptions = {
  /** Whether the editor has changes that are not saved yet. */
  dirty: boolean
  /**
   * Saves the editor. Resolve with a FormState-like `{ ok: false, message }`
   * (or throw) to report a failure: the user then stays on the page and the
   * message is shown in the dialog.
   */
  onSave: () => SaveResult | Promise<SaveResult>
  /** Throws the changes away (reset the form) before leaving. Optional. */
  onDiscard?: () => void | Promise<void>
}

/** Props for `<UnsavedChangesDialog>`; the hook returns them ready to spread. */
export type UnsavedChangesDialogState = {
  open: boolean
  /** A save started from the dialog is in flight. */
  saving: boolean
  /** Why the last save from the dialog failed. */
  error?: string
  onSave: () => Promise<void>
  onDiscard: () => Promise<void>
  onStay: () => void
}

/** `useRouter()` for editors: navigation asks first while the editor is dirty. */
export type GuardedRouter = {
  push: (href: string) => void
  replace: (href: string) => void
  back: () => void
  forward: () => void
}

/**
 * The unsaved-changes guard, built once for every editor (Page, Layout, Theme,
 * Brand, SEO). While `dirty`:
 *  - link clicks, back/forward and `router.push/replace/back/forward` of the
 *    returned guarded router open a Save / Discard / Stay dialog (render it
 *    with `<UnsavedChangesDialog>`);
 *  - closing or reloading the tab shows the browser's own warning.
 * Most editors want `<UnsavedChangesGuard>`, which wraps this hook and the
 * dialog. Call the hook directly to get the guarded router as well.
 */
export function useUnsavedChangesGuard(
  options: UseUnsavedChangesGuardOptions
): {
  dialog: UnsavedChangesDialogState
  router: GuardedRouter
} {
  const nextRouter = useRouter()
  const [state, setState] = useState<GuardState>(idleGuard)
  const [runner] = useState(() => createGuardRunner(setState))
  const { dispatch, attempt } = runner

  // The runner always acts on the editor's latest props.
  useEffect(() => {
    runner.update({ ...options, nextRouter })
  })

  useEffect(
    () =>
      registerNavigationGuard({
        isDirty: runner.isDirty,
        onAttempt: attempt,
      }),
    [runner, attempt]
  )

  const dialog = useMemo<UnsavedChangesDialogState>(
    () => ({
      open: state.status !== "idle",
      saving: state.status === "saving",
      error: state.status === "prompting" ? state.error : undefined,
      onSave: async () => dispatch({ type: "save" }),
      onDiscard: async () => dispatch({ type: "discard" }),
      onStay: () => dispatch({ type: "stay" }),
    }),
    [state, dispatch]
  )

  const router = useMemo<GuardedRouter>(
    () => ({
      push: (href) => attempt({ kind: "href", href }),
      replace: (href) => attempt({ kind: "href", href, replace: true }),
      back: () => attempt({ kind: "history", delta: -1 }),
      forward: () => attempt({ kind: "history", delta: 1 }),
    }),
    [attempt]
  )

  return { dialog, router }
}

type Latest = UseUnsavedChangesGuardOptions & {
  nextRouter: ReturnType<typeof useRouter>
}

/**
 * Runs the decision state machine and carries out its effects. Created once
 * per editor; `update` hands it the latest props after every render.
 */
function createGuardRunner(onState: (state: GuardState) => void) {
  let state: GuardState = idleGuard
  let latest: Latest | undefined

  function update(next: Latest): void {
    latest = next
  }

  function isDirty(): boolean {
    return latest?.dirty ?? false
  }

  function dispatch(event: GuardEvent): void {
    const result = reduceGuard(state, event)
    state = result.state
    onState(state)
    if (result.effect) void run(result.effect)
  }

  function attempt(target: NavTarget): void {
    dispatch({ type: "attempt", target, dirty: isDirty() })
  }

  async function run(effect: NonNullable<GuardEffect>): Promise<void> {
    if (!latest) return
    const { onSave, onDiscard, nextRouter } = latest
    const go = (target: NavTarget) =>
      proceedTo(target, (href, replace) =>
        replace ? nextRouter.replace(href) : nextRouter.push(href)
      )
    switch (effect.type) {
      case "navigate":
        return go(effect.target)
      case "discard":
        await onDiscard?.()
        return go(effect.target)
      case "save":
        try {
          dispatch(saveOutcome(await onSave()))
        } catch (error) {
          dispatch({
            type: "saveFailed",
            message:
              error instanceof Error && error.message
                ? error.message
                : SAVE_FAILED_MESSAGE,
          })
        }
    }
  }

  return { dispatch, attempt, update, isDirty }
}
