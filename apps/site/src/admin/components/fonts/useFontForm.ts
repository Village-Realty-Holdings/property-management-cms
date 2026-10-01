"use client"

import { useRef, useState, useTransition, type FormEvent } from "react"

import type { FormState } from "../../formState"
import { notify } from "../../kit"

const FAILED = "Something went wrong. Please try again."

/**
 * Runs a Fonts Server Action from a form: `submit` sends the form's fields,
 * `pending` is true while it runs, and the result is `state`. A success
 * toasts and calls `onSuccess`; a failure stays in `state` for the form to
 * show inline, and the fields keep what the user typed (the form is not
 * reset, which React does to a form given an `action`).
 */
export function useFontForm(
  action: (previous: FormState, data: FormData) => Promise<FormState>,
  onSuccess: () => void
) {
  const [state, setState] = useState<FormState>({})
  const [pending, startTransition] = useTransition()
  const running = useRef(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (running.current) return
    running.current = true
    const data = new FormData(event.currentTarget)
    startTransition(async () => {
      let result: FormState
      try {
        result = await action({}, data)
      } catch {
        // A thrown action error reaches the browser without its message.
        result = { ok: false, message: FAILED }
      }
      running.current = false
      setState(result)
      if (result.ok) {
        notify.success(result.message || "Saved")
        onSuccess()
      }
    })
  }

  return { state, pending, submit, errors: state.fieldErrors ?? {} }
}
