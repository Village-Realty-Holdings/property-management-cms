import type {
  SubmissionInput,
  SubmissionKind,
} from "@workspace/content/queries"

/**
 * Form fields and their server-side checks, shared by the forms (field names,
 * the state they render) and the `submit` Server Action (the checks). Pure:
 * no React, no Next, no I/O.
 */

export type { SubmissionKind }

export const submissionKinds: readonly SubmissionKind[] = [
  "inquiry",
  "ownerLead",
  "contact",
]

export const isSubmissionKind = (value: unknown): value is SubmissionKind =>
  submissionKinds.includes(value as SubmissionKind)

/** Every input name a form can send (besides the honeypot). */
export type FieldName =
  | "name"
  | "email"
  | "phone"
  | "message"
  | "arrival"
  | "departure"
  | "guests"
  | "property"
  | "propertyLocation"
  | "bedrooms"

const fieldsByKind: Record<SubmissionKind, readonly FieldName[]> = {
  contact: ["name", "email", "phone", "message"],
  inquiry: [
    "name",
    "email",
    "phone",
    "arrival",
    "departure",
    "guests",
    "message",
    "property",
  ],
  ownerLead: [
    "name",
    "email",
    "phone",
    "propertyLocation",
    "bedrooms",
    "message",
  ],
}

/** The honeypot input's name: hidden from people, filled in by bots. */
export const HONEYPOT = "website"

export type FieldErrors = Partial<Record<FieldName, string>>

/** What a form renders after the `submit` Server Action runs. */
export type FormState = {
  status: "idle" | "invalid" | "failed" | "sent"
  /** Per-field errors (status "invalid"). */
  errors: FieldErrors
  /** A message for the whole form (status "invalid" or "failed"). */
  message?: string
  /** What was entered, so the fields keep it after a failed send. */
  values: Partial<Record<FieldName, string>>
}

export const initialFormState: FormState = {
  status: "idle",
  errors: {},
  values: {},
}

/** The fields a form of `kind` sends, trimmed; other names are dropped. */
export function readFields(
  kind: SubmissionKind,
  get: (name: string) => unknown
): Partial<Record<FieldName, string>> {
  const values: Partial<Record<FieldName, string>> = {}
  for (const name of fieldsByKind[kind]) {
    const raw = get(name)
    if (typeof raw === "string" && raw.trim() !== "") values[name] = raw.trim()
  }
  return values
}

/**
 * A validated Submission. The Property's slug (what `?property=` named) is in
 * `payload.propertySlug`; the Server Action resolves it to `propertyId`.
 */
export type ValidSubmission = Omit<
  SubmissionInput,
  "propertyId" | "sourceUrl" | "website"
>

export type Validation =
  | { ok: true; submission: ValidSubmission }
  | { ok: false; errors: FieldErrors }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^\+?[\d\s().-]+$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** A well-formed Property slug (as in `?property=<slug>`). */
export const isPropertySlug = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 200 && SLUG.test(value)

const LIMITS = {
  name: 120,
  email: 254,
  phone: 40,
  message: 5000,
  propertyLocation: 300,
}

/** A real calendar date in YYYY-MM-DD, else null. */
function parseDate(value: string): Date | null {
  if (!ISO_DATE.test(value)) return null
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
    ? null
    : date
}

/** A whole number in [min, max], else null. */
function parseCount(value: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(value)) return null
  const n = Number(value)
  return n >= min && n <= max ? n : null
}

const tooLong = (label: string, max: number) =>
  `${label} can be at most ${max} characters.`

/** The Property an inquiry names, as far as validation needs it. */
export type PropertyLimits = { name: string; sleeps: number | null }

/**
 * Checks what a form of `kind` sent. `today` (YYYY-MM-DD, UTC) bounds the
 * arrival date; a day's slack allows for guests behind UTC. `property`, when
 * the inquiry's Property is known, caps the guests at what it sleeps.
 */
export function validateSubmission(
  kind: SubmissionKind,
  values: Partial<Record<FieldName, string>>,
  today: string,
  property?: PropertyLimits | null
): Validation {
  const errors: FieldErrors = {}
  const { name, email, phone, message } = values

  if (!name) errors.name = "Enter your name."
  else if (name.length > LIMITS.name) errors.name = tooLong("Name", LIMITS.name)

  if (!email) errors.email = "Enter your email address."
  else if (email.length > LIMITS.email || !EMAIL.test(email)) {
    errors.email = "Enter an email address like name@example.com."
  }

  if (phone) {
    const digits = phone.replace(/\D/g, "").length
    if (phone.length > LIMITS.phone || !PHONE.test(phone) || digits < 6) {
      errors.phone = "Enter a phone number, e.g. +1 555 010 0100."
    }
  }

  if (!message && kind === "contact") errors.message = "Enter your message."
  else if (message && message.length > LIMITS.message) {
    errors.message = tooLong("Your message", LIMITS.message)
  }

  let propertySlug: string | undefined
  const submission: ValidSubmission = {
    kind,
    name,
    email,
    phone,
    message,
    payload: {},
  }

  if (kind === "inquiry") {
    const arrival = values.arrival ? parseDate(values.arrival) : null
    const departure = values.departure ? parseDate(values.departure) : null
    const earliest = new Date(`${today}T00:00:00Z`)
    earliest.setUTCDate(earliest.getUTCDate() - 1)

    if (values.arrival && !arrival) errors.arrival = "Enter a valid date."
    else if (arrival && arrival < earliest) {
      errors.arrival = "Choose an arrival date from today on."
    } else if (!values.arrival && values.departure) {
      errors.arrival = "Add your arrival date too."
    }

    if (values.departure && !departure) errors.departure = "Enter a valid date."
    else if (!values.departure && values.arrival) {
      errors.departure = "Add your departure date too."
    } else if (arrival && departure && departure <= arrival) {
      errors.departure = "Choose a departure date after your arrival."
    }

    let guests: number | null = null
    if (values.guests) {
      guests = parseCount(values.guests, 1, 99)
      if (guests === null) {
        errors.guests = "Enter a number of guests from 1 to 99."
      } else if (property?.sleeps != null && guests > property.sleeps) {
        errors.guests = `This home sleeps up to ${property.sleeps}.`
      }
    }

    submission.arrival = arrival ? values.arrival : undefined
    submission.departure = departure ? values.departure : undefined
    submission.guests = guests ?? undefined
    // An unknown or malformed slug is dropped, not an error: the guest can
    // still send the inquiry.
    if (isPropertySlug(values.property)) propertySlug = values.property
  }

  if (kind === "ownerLead") {
    const location = values.propertyLocation
    if (!location) {
      errors.propertyLocation = "Tell us where your property is."
    } else if (location.length > LIMITS.propertyLocation) {
      errors.propertyLocation = tooLong("Address", LIMITS.propertyLocation)
    }
    let bedrooms: number | null = null
    if (values.bedrooms) {
      bedrooms = parseCount(values.bedrooms, 0, 50)
      if (bedrooms === null) {
        errors.bedrooms = "Enter a number of bedrooms from 0 to 50."
      }
    }
    submission.payload = {
      propertyLocation: location,
      ...(bedrooms !== null && { bedrooms }),
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  // The fields as entered, for the Forwarding Destinations (ADR-0014).
  submission.payload = {
    ...Object.fromEntries(
      Object.entries(values).filter(([key]) => key !== "property")
    ),
    ...submission.payload,
    ...(submission.guests !== undefined && { guests: submission.guests }),
    ...(propertySlug && { propertySlug }),
  }
  return { ok: true, submission }
}

/**
 * The form field a CMS field error belongs to, e.g. "email" or "payload" →
 * undefined (shown for the whole form).
 */
export function fieldForCmsPath(
  kind: SubmissionKind,
  path: string
): FieldName | undefined {
  const name = path === "property" ? undefined : path
  return fieldsByKind[kind].find((field) => field === name)
}
