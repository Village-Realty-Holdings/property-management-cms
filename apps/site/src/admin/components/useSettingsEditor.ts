"use client"

import { useState } from "react"

import { isDirty, useSaveToast, useStaleSave } from "../kit"
import type { FormState } from "../formState"
import type { SaveResult } from "../settingsSave"
import type { Revision, SaveGuard } from "../staleSave"

/**
 * The state of a settings editor (Brand, SEO): the values being edited, the
 * last saved baseline, and the save. `dirty` feeds the unsaved-changes guard,
 * and `submit` is what both the Save button and the guard's dialog call.
 * Successes toast; failures stay in `state` for the form to show inline.
 */
export function useSettingsEditor<V>({
  initial,
  revision,
  save,
}: {
  initial: V
  /** The revision the form opened, for the stale-save check. */
  revision?: Revision | null
  save: (values: V, guard: SaveGuard) => Promise<SaveResult<V>>
}) {
  const [values, setValues] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [state, setState] = useState<FormState>({})
  const [pending, setPending] = useState(false)

  useSaveToast(state)

  const dirty = isDirty(saved, values)
  const stale = useStaleSave({
    initial: revision,
    dirty,
    discard: () => setValues(saved),
  })

  async function submit(force = false): Promise<FormState> {
    const submitted = values
    setPending(true)
    let result: SaveResult<V>
    try {
      result = await save(submitted, {
        expected: stale.expected(),
        ...(force ? { force: true } : {}),
      })
    } catch {
      result = {
        ok: false,
        message: "Could not save. Check your connection and try again.",
      }
    }
    setPending(false)
    stale.settle(result, () => submit(true))
    setState(result)
    if (result.ok && result.values) {
      const stored = result.values
      setSaved(stored)
      // Show what was stored (trimmed text), unless typing carried on meanwhile.
      setValues((current) => (isDirty(submitted, current) ? current : stored))
    }
    return result
  }

  return {
    values,
    setValues,
    state,
    fieldErrors: state.fieldErrors ?? {},
    pending,
    dirty,
    submit,
    staleDialog: stale.dialog,
  }
}
