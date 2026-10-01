/**
 * The unsaved-changes decision, as a pure state machine.
 *
 * A navigation attempt on a clean editor goes straight through. On a dirty
 * editor the user is asked Save / Discard / Stay. A failed save keeps the user
 * on the page with the error shown, and they may retry, discard or stay.
 */

/** Where the user is trying to go. */
export type NavTarget =
  /** A route inside the Admin (link click or guarded router push/replace). */
  | { kind: "href"; href: string; replace?: boolean }
  /** A history traversal (back / forward button), `delta` entries away. */
  | { kind: "history"; delta: number }

export type GuardState =
  | { status: "idle" }
  | { status: "prompting"; target: NavTarget; error?: string }
  | { status: "saving"; target: NavTarget }

export type GuardEvent =
  | { type: "attempt"; target: NavTarget; dirty: boolean }
  | { type: "stay" }
  | { type: "discard" }
  | { type: "save" }
  | { type: "saved" }
  | { type: "saveFailed"; message: string }

/** What the caller must do as a result of an event. */
export type GuardEffect =
  | { type: "navigate"; target: NavTarget }
  | { type: "discard"; target: NavTarget }
  | { type: "save" }
  | null

export const idleGuard: GuardState = { status: "idle" }

export function reduceGuard(
  state: GuardState,
  event: GuardEvent
): { state: GuardState; effect: GuardEffect } {
  const unchanged = { state, effect: null }
  switch (event.type) {
    case "attempt":
      if (state.status !== "idle") return unchanged
      return event.dirty
        ? {
            state: { status: "prompting", target: event.target },
            effect: null,
          }
        : { state, effect: { type: "navigate", target: event.target } }
    case "stay":
      return state.status === "prompting"
        ? { state: idleGuard, effect: null }
        : unchanged
    case "discard":
      return state.status === "prompting"
        ? {
            state: idleGuard,
            effect: { type: "discard", target: state.target },
          }
        : unchanged
    case "save":
      return state.status === "prompting"
        ? {
            state: { status: "saving", target: state.target },
            effect: { type: "save" },
          }
        : unchanged
    case "saved":
      return state.status === "saving"
        ? {
            state: idleGuard,
            effect: { type: "navigate", target: state.target },
          }
        : unchanged
    case "saveFailed":
      return state.status === "saving"
        ? {
            state: {
              status: "prompting",
              target: state.target,
              error: event.message,
            },
            effect: null,
          }
        : unchanged
  }
}

/**
 * What an editor's save returns: nothing, or a result shaped like a
 * FormState (`ok: false` is a failure). Throwing is a failure too.
 */
export type SaveResult = void | { ok?: boolean; message?: string }

export const SAVE_FAILED_MESSAGE = "Could not save. Please try again."

/** Turns a save result into the event that ends the `saving` state. */
export function saveOutcome(
  result: SaveResult
): Extract<GuardEvent, { type: "saved" | "saveFailed" }> {
  if (result && result.ok === false) {
    return {
      type: "saveFailed",
      message: result.message || SAVE_FAILED_MESSAGE,
    }
  }
  return { type: "saved" }
}
