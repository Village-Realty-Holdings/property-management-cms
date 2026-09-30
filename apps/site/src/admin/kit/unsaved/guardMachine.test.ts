import { describe, expect, it } from "vitest"

import {
  idleGuard,
  reduceGuard,
  saveOutcome,
  type GuardState,
  type NavTarget,
} from "./guardMachine"

const to: NavTarget = { kind: "href", href: "/admin/media" }

const prompting: GuardState = { status: "prompting", target: to }
const saving: GuardState = { status: "saving", target: to }

describe("reduceGuard", () => {
  it("lets a clean editor navigate straight away", () => {
    expect(
      reduceGuard(idleGuard, { type: "attempt", target: to, dirty: false })
    ).toEqual({ state: idleGuard, effect: { type: "navigate", target: to } })
  })

  it("asks Save / Discard / Stay when the editor is dirty", () => {
    expect(
      reduceGuard(idleGuard, { type: "attempt", target: to, dirty: true })
    ).toEqual({ state: prompting, effect: null })
  })

  it("ignores a second attempt while a decision is pending", () => {
    const other: NavTarget = { kind: "history", delta: -1 }
    expect(
      reduceGuard(prompting, { type: "attempt", target: other, dirty: true })
        .state
    ).toBe(prompting)
    expect(
      reduceGuard(saving, { type: "attempt", target: other, dirty: true }).state
    ).toBe(saving)
  })

  it("Stay closes the dialog and goes nowhere", () => {
    expect(reduceGuard(prompting, { type: "stay" })).toEqual({
      state: idleGuard,
      effect: null,
    })
  })

  it("Discard runs onDiscard then navigates", () => {
    expect(reduceGuard(prompting, { type: "discard" })).toEqual({
      state: idleGuard,
      effect: { type: "discard", target: to },
    })
  })

  it("Save runs onSave and waits for the outcome", () => {
    expect(reduceGuard(prompting, { type: "save" })).toEqual({
      state: saving,
      effect: { type: "save" },
    })
  })

  it("navigates once the save succeeded", () => {
    expect(reduceGuard(saving, { type: "saved" })).toEqual({
      state: idleGuard,
      effect: { type: "navigate", target: to },
    })
  })

  it("keeps the user on the page, with the error, when the save failed", () => {
    expect(
      reduceGuard(saving, { type: "saveFailed", message: "Title is required" })
    ).toEqual({
      state: { status: "prompting", target: to, error: "Title is required" },
      effect: null,
    })
  })

  it("lets the user retry, discard or stay after a failed save", () => {
    const failed: GuardState = { ...prompting, error: "boom" }
    expect(reduceGuard(failed, { type: "save" }).state).toEqual(saving)
    expect(reduceGuard(failed, { type: "stay" }).state).toEqual(idleGuard)
    expect(reduceGuard(failed, { type: "discard" }).effect).toEqual({
      type: "discard",
      target: to,
    })
  })

  it("cannot cancel a save in flight", () => {
    expect(reduceGuard(saving, { type: "stay" }).state).toBe(saving)
    expect(reduceGuard(saving, { type: "discard" }).state).toBe(saving)
  })

  it("ignores events that do not fit the state", () => {
    expect(reduceGuard(idleGuard, { type: "save" })).toEqual({
      state: idleGuard,
      effect: null,
    })
    expect(reduceGuard(idleGuard, { type: "saved" }).effect).toBeNull()
    expect(reduceGuard(prompting, { type: "saved" }).effect).toBeNull()
  })
})

describe("saveOutcome", () => {
  it("treats no result, or ok, as success", () => {
    expect(saveOutcome(undefined)).toEqual({ type: "saved" })
    expect(saveOutcome({ ok: true, message: "Saved" })).toEqual({
      type: "saved",
    })
    expect(saveOutcome({})).toEqual({ type: "saved" })
  })

  it("treats ok: false as a failure with its message", () => {
    expect(saveOutcome({ ok: false, message: "Nope" })).toEqual({
      type: "saveFailed",
      message: "Nope",
    })
    expect(saveOutcome({ ok: false })).toEqual({
      type: "saveFailed",
      message: "Could not save. Please try again.",
    })
  })
})
