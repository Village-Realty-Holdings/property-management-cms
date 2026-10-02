import type { GuestSurveyBlock } from "../payload-types"

/**
 * The Guest feedback survey's rules, with no browser and no server in them, so the
 * Block's form and the route that receives it check an answer the same way.
 */

/** What each number of stars is called. */
export const RATING_LABELS = ["Poor", "Fair", "Good", "Great", "Excellent"]

/** "4 stars – Great", as a screen reader hears a star. */
export const ratingName = (rating: number) =>
  `${rating} ${rating === 1 ? "star" : "stars"} – ${RATING_LABELS[rating - 1]}`

export const isRating = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 1 &&
  value <= 5

/** Where a rating leads: a request for a review, or the feedback form. */
export function pathFor(
  rating: number,
  reviewFrom: GuestSurveyBlock["reviewFrom"] | null | undefined
): "positive" | "negative" {
  return rating >= Number(reviewFrom ?? "4") ? "positive" : "negative"
}

/** An optional field the feedback form can show. */
export type FeedbackField = NonNullable<
  GuestSurveyBlock["negative"]["formFields"]
>[number]

export const FEEDBACK_FIELDS: readonly FeedbackField[] = [
  "name",
  "email",
  "phone",
  "reservation",
  "property",
  "checkIn",
]

/** What a guest typed, by input name. */
export type FeedbackValues = { message: string } & Partial<
  Record<FeedbackField, string>
>

export type FeedbackErrors = Partial<Record<keyof FeedbackValues, string>>

export const MESSAGE_MAX = 2000
const SHORT_MAX = 200
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * What is wrong with a guest's answers, by input name. Only the message is
 * needed. The rest may be empty, but must be sensible when given.
 */
export function validateFeedback(values: FeedbackValues): FeedbackErrors {
  const value = (key: keyof FeedbackValues) => values[key]?.trim() ?? ""
  const errors: FeedbackErrors = {}
  if (!value("message")) errors.message = "Tell us what happened."
  else if (value("message").length > MESSAGE_MAX) {
    errors.message = `Keep your message to ${MESSAGE_MAX} characters or fewer.`
  }
  if (value("email") && !EMAIL.test(value("email"))) {
    errors.email = "Enter an email address like name@example.com."
  }
  if (value("phone")) {
    const digits = value("phone").replace(/\D/g, "").length
    if (digits < 7 || !/^[\d\s()+.-]+$/.test(value("phone"))) {
      errors.phone = "Enter a phone number of at least 7 digits."
    }
  }
  if (value("checkIn") && !DATE.test(value("checkIn"))) {
    errors.checkIn = "Enter the date as year, month and day."
  }
  for (const key of ["name", "reservation", "property"] as const) {
    if (value(key).length > SHORT_MAX) {
      errors[key] = `Keep this to ${SHORT_MAX} characters or fewer.`
    }
  }
  return errors
}

/** A guest's feedback as the Site sends it on. */
export type GuestFeedback = FeedbackValues & {
  rating: number
  /** Whether the guest ticked "okay to contact me". */
  consent: boolean
  /** The Page the survey is on, as a path. */
  page: string
}

type Parsed =
  | { ok: true; feedback: GuestFeedback }
  | { ok: false; errors: FeedbackErrors; message: string }

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "")

/** Checks feedback that arrived from a browser, and returns it cleaned. */
export function parseGuestFeedback(input: unknown): Parsed {
  const raw = (input && typeof input === "object" ? input : {}) as Record<
    string,
    unknown
  >
  if (!isRating(raw.rating)) {
    return { ok: false, errors: {}, message: "Choose a rating first." }
  }
  const values: FeedbackValues = { message: text(raw.message) }
  for (const key of FEEDBACK_FIELDS) {
    if (text(raw[key])) values[key] = text(raw[key])
  }
  const errors = validateFeedback(values)
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, message: "Some answers need attention." }
  }
  const page = text(raw.page)
  return {
    ok: true,
    feedback: {
      ...values,
      rating: raw.rating,
      consent: raw.consent === true,
      page: page.startsWith("/") ? page.slice(0, SHORT_MAX) : "/",
    },
  }
}

/**
 * `text` with "{phone}" cut out as its own part, so the Block can draw the
 * number as a link. A sentence that needs the number is dropped when the
 * Block has none.
 */
export function phoneParts(
  value: string | null | undefined,
  phone: string | null | undefined
): string[] {
  const words = value?.trim() ?? ""
  if (!words.includes("{phone}")) return words ? [words] : []
  if (phone?.trim()) return words.split(/(\{phone\})/)
  const kept = words
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !sentence.includes("{phone}"))
    .join(" ")
  return kept ? [kept] : []
}
