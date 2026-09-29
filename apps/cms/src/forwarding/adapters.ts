import { createHmac } from "node:crypto"

import type { Payload } from "payload"

import type { Destination, ForwardedSubmission } from "./types"

/** How long a webhook destination gets to answer. */
const WEBHOOK_TIMEOUT_MS = 10_000

/** Hex HMAC-SHA256 of `body`: the webhook's `X-Signature` header. */
export function signBody(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex")
}

/**
 * Sends one Submission to one destination. Resolves when the destination
 * accepted it; rejects with a readable error otherwise.
 */
export async function send(
  payload: Payload,
  destination: Destination,
  submission: ForwardedSubmission
): Promise<void> {
  if (destination.type === "webhook") {
    return sendWebhook(destination, submission)
  }
  return sendEmail(payload, destination, submission)
}

async function sendWebhook(
  destination: Destination,
  submission: ForwardedSubmission
): Promise<void> {
  if (!destination.url) throw new Error("Webhook destination has no URL")
  const body = JSON.stringify(submission)
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "property-management-cms/forwarding",
  }
  if (destination.secret) {
    headers["X-Signature"] = signBody(body, destination.secret)
  }
  let response: Response
  try {
    response = await fetch(destination.url, {
      method: "POST",
      headers,
      body,
      redirect: "error",
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    })
  } catch (error) {
    throw new Error(
      `Webhook ${hostOf(destination.url)} unreachable: ${messageOf(error)}`
    )
  }
  // Drain the body so the connection is released.
  await response.arrayBuffer().catch(() => undefined)
  if (!response.ok) {
    throw new Error(
      `Webhook ${hostOf(destination.url)} answered ${response.status}`
    )
  }
}

async function sendEmail(
  payload: Payload,
  destination: Destination,
  submission: ForwardedSubmission
): Promise<void> {
  if (!destination.emailTo) throw new Error("Email destination has no address")
  // Without an email adapter configured, Payload logs the message instead.
  await payload.sendEmail({
    to: destination.emailTo,
    replyTo: submission.email || undefined,
    subject: `New ${KIND_LABELS[submission.kind]} from ${submission.site.name}`,
    text: emailText(submission),
  })
}

const KIND_LABELS: Record<ForwardedSubmission["kind"], string> = {
  inquiry: "Inquiry",
  ownerLead: "Owner Lead",
  contact: "contact Submission",
}

function emailText(submission: ForwardedSubmission): string {
  const lines: [string, unknown][] = [
    ["Name", submission.name],
    ["Email", submission.email],
    ["Phone", submission.phone],
    ["Property", submission.property?.feedId ?? submission.property?.id],
    ["Arrival", submission.arrival],
    ["Departure", submission.departure],
    ["Guests", submission.guests],
    ["Sent from", submission.sourceUrl],
  ]
  const extra =
    submission.payload &&
    typeof submission.payload === "object" &&
    Object.keys(submission.payload).length > 0
      ? `\n\nOther fields:\n${JSON.stringify(submission.payload, null, 2)}`
      : ""
  return [
    ...lines
      .filter(
        ([, value]) => value !== null && value !== undefined && value !== ""
      )
      .map(([label, value]) => `${label}: ${String(value)}`),
    "",
    submission.message ?? "",
  ]
    .join("\n")
    .concat(extra)
    .trim()
}

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return "(invalid URL)"
  }
}

export function messageOf(error: unknown): string {
  if (error instanceof Error) {
    const cause = (error as { cause?: unknown }).cause
    return cause instanceof Error
      ? `${error.message} (${cause.message})`
      : error.message
  }
  return String(error)
}
