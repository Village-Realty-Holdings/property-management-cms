import type { SubmissionInput, SubmissionResult } from "../types"
import { ContentRequestError, type FieldError } from "./client"
import type { QueryContext } from "./context"

/**
 * The CMS rejected a Submission (HTTP 400): a required field missing, an
 * invalid email, a filled-in honeypot… `errors` names each field.
 */
export class SubmissionError extends Error {
  readonly errors: FieldError[]

  constructor(message: string, errors: FieldError[]) {
    super(message)
    this.name = "SubmissionError"
    this.errors = errors
  }
}

/**
 * A relationship value as the CMS accepts it: Postgres IDs are numbers, and
 * Payload rejects a numeric ID sent as a string ("7"). Other IDs pass as-is.
 */
const relationId = (id: string | undefined) =>
  id !== undefined && /^\d+$/.test(id) ? Number(id) : id

const stringFrom = (payload: Record<string, unknown>, key: string) =>
  typeof payload[key] === "string" ? (payload[key] as string) : undefined

/**
 * Stores a Submission for the Site (ADR-0014). The CMS sets its Site from the
 * reader key and forwards it. `name`/`email` fall back to the same keys in
 * `payload`. Throws `SubmissionError` when the CMS rejects the data.
 */
export async function submit(
  ctx: QueryContext,
  input: SubmissionInput
): Promise<SubmissionResult> {
  const payload = input.payload ?? {}
  const data: Record<string, unknown> = {
    kind: input.kind,
    name: input.name ?? stringFrom(payload, "name"),
    email: input.email ?? stringFrom(payload, "email"),
    phone: input.phone ?? stringFrom(payload, "phone"),
    message: input.message ?? stringFrom(payload, "message"),
    property: relationId(input.propertyId),
    arrival: input.arrival,
    departure: input.departure,
    guests: input.guests,
    sourceUrl: input.sourceUrl,
    payload,
    website: input.website,
  }
  for (const key of Object.keys(data)) {
    if (data[key] === undefined) delete data[key]
  }

  try {
    const response = await ctx.client.create<{ doc?: { id: string | number } }>(
      "submissions",
      data,
      { depth: 0 }
    )
    if (response.doc?.id === undefined) {
      throw new Error("The CMS did not return the new Submission")
    }
    return { id: String(response.doc.id) }
  } catch (error) {
    if (error instanceof ContentRequestError && error.status === 400) {
      throw new SubmissionError(error.message, error.errors)
    }
    throw error
  }
}
