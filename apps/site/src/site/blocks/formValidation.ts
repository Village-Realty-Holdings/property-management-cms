import type { FormBlock } from "../../payload-types"

/** A field a Form can show. */
export type FormFieldName = FormBlock["formFields"][number]

/** What a visitor typed, by input name (the two dates are separate inputs). */
export type FormValues = Partial<
  Record<
    | "name"
    | "email"
    | "phone"
    | "message"
    | "propertyAddress"
    | "checkIn"
    | "checkOut",
    string
  >
>

/** The message under each input that is not right, by input name. */
export type FormErrors = Partial<Record<keyof FormValues, string>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Checks the fields a Form shows, and only those. A name, an email and a
 * message are needed; a phone number, a property address and the dates are
 * optional, but must be sensible when given: a phone number of at least 7
 * digits, and a check-out no earlier than the check-in. Nothing is stored,
 * so this is all the validation there is.
 */
export function validateForm(
  shown: readonly FormFieldName[],
  values: FormValues
): FormErrors {
  const value = (key: keyof FormValues) => values[key]?.trim() ?? ""
  const errors: FormErrors = {}
  const has = (field: FormFieldName) => shown.includes(field)

  if (has("name") && !value("name")) errors.name = "Enter your name."
  if (has("email")) {
    if (!value("email")) errors.email = "Enter your email address."
    else if (!EMAIL.test(value("email")))
      errors.email = "Enter an email address like name@example.com."
  }
  if (has("phone") && value("phone")) {
    const digits = value("phone").replace(/\D/g, "").length
    if (digits < 7 || !/^[\d\s()+.-]+$/.test(value("phone")))
      errors.phone = "Enter a phone number of at least 7 digits."
  }
  if (has("message") && !value("message"))
    errors.message = "Write a short message."
  if (has("dates") && value("checkIn") && value("checkOut")) {
    // ISO dates (what a date input gives) sort as text.
    if (value("checkOut") < value("checkIn"))
      errors.checkOut = "Check-out can't be before check-in."
  }
  return errors
}
