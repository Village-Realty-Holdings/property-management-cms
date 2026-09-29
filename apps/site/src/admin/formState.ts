/** What a Server Action returns to its form (useActionState). */
export type FormState = {
  /** A message for the whole form, e.g. "Published". */
  message?: string
  /** Whether `message` reports success or failure. */
  ok?: boolean
  /** Field errors keyed by Payload field path, e.g. "layout.0.heading". */
  fieldErrors?: Record<string, string>
}

export const initialFormState: FormState = {}

type PayloadErrorLike = {
  message?: string
  data?: { errors?: { path?: string; message?: string }[] }
}

/** Turns a Payload error (validation or access) into form state. */
export function formStateFromError(error: unknown): FormState {
  const e = error as PayloadErrorLike
  const errors = e?.data?.errors ?? []
  if (errors.length > 0) {
    return {
      ok: false,
      message: "Some fields need attention.",
      fieldErrors: Object.fromEntries(
        errors
          .filter((err) => err.path)
          .map((err) => [err.path!, err.message ?? "This field is invalid."])
      ),
    }
  }
  return {
    ok: false,
    message: e?.message || "Something went wrong. Please try again.",
  }
}
