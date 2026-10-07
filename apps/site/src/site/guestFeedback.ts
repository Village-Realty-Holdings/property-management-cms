import type { GuestFeedback } from "./guestSurvey"

/**
 * Sends a guest's feedback to the guest care team. The Site does not send
 * email itself: it starts a workflow on the Awayday Workflows platform, which
 * does (its `POST /api/run/<workflow>` queues a run and answers 202). Where
 * that is comes from the server's environment, never from the Page:
 *
 *   WORKFLOWS_URL            the platform's origin
 *   GUEST_FEEDBACK_WORKFLOW  the workflow's id (default: guest-feedback-survey)
 *   WORKFLOWS_API_KEY        the workflow's key, sent as `x-api-key`, when it
 *                            asks for one
 */

export const DEFAULT_WORKFLOW = "guest-feedback-survey"

/** How long the platform has to answer before the guest is told to retry. */
const TIMEOUT_MS = 8000

export type FeedbackDelivery = {
  env: Record<string, string | undefined>
  fetch: typeof fetch
}

export type Delivered =
  | { ok: true }
  | { ok: false; reason: "not-configured" | "refused" | "unreachable" }

/** The run endpoint the feedback goes to, or null when none is configured. */
export function feedbackEndpoint(env: FeedbackDelivery["env"]): string | null {
  const origin = env.WORKFLOWS_URL?.trim().replace(/\/+$/, "")
  if (!origin || !/^https?:\/\//.test(origin)) return null
  const workflow = env.GUEST_FEEDBACK_WORKFLOW?.trim() || DEFAULT_WORKFLOW
  return `${origin}/api/run/${encodeURIComponent(workflow)}`
}

/** JSON, with the workflow's API key when one is configured. */
function feedbackHeaders(env: FeedbackDelivery["env"]): HeadersInit {
  const key = env.WORKFLOWS_API_KEY?.trim()
  return {
    "content-type": "application/json",
    ...(key ? { "x-api-key": key } : {}),
  }
}

export async function deliverGuestFeedback(
  feedback: GuestFeedback & { site: string; siteUrl: string | null },
  { env, fetch }: FeedbackDelivery
): Promise<Delivered> {
  const endpoint = feedbackEndpoint(env)
  if (!endpoint) return { ok: false, reason: "not-configured" }
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: feedbackHeaders(env),
      body: JSON.stringify(feedback),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    return response.ok ? { ok: true } : { ok: false, reason: "refused" }
  } catch {
    return { ok: false, reason: "unreachable" }
  }
}
