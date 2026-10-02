import { describe, expect, it, vi } from "vitest"

import { deliverGuestFeedback, feedbackEndpoint } from "./guestFeedback"

const feedback = {
  rating: 2,
  message: "Cold shower.",
  consent: true,
  page: "/survey",
  site: "Seaglass",
  siteUrl: "https://seaglass.test",
}

describe("where feedback goes", () => {
  it("is the Workflows platform's run endpoint for the feedback workflow", () => {
    expect(feedbackEndpoint({ WORKFLOWS_URL: "https://flows.test/" })).toBe(
      "https://flows.test/api/run/guest-survey-feedback"
    )
    expect(
      feedbackEndpoint({
        WORKFLOWS_URL: "https://flows.test",
        GUEST_FEEDBACK_WORKFLOW: "nxt feedback",
      })
    ).toBe("https://flows.test/api/run/nxt%20feedback")
  })

  it("is nowhere until an http(s) origin is set", () => {
    for (const WORKFLOWS_URL of [
      undefined,
      "",
      "  ",
      "flows.test",
      "ftp://x",
    ]) {
      expect(feedbackEndpoint({ WORKFLOWS_URL })).toBeNull()
    }
  })
})

describe("delivering feedback", () => {
  const env = { WORKFLOWS_URL: "https://flows.test" }

  it("posts it as JSON and reports that it went", async () => {
    const fetch = vi.fn(async () => new Response("{}", { status: 202 }))
    expect(await deliverGuestFeedback(feedback, { env, fetch })).toEqual({
      ok: true,
    })
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("https://flows.test/api/run/guest-survey-feedback")
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body as string)).toEqual(feedback)
  })

  it("says why it didn't go, without throwing", async () => {
    const never = vi.fn()
    expect(
      await deliverGuestFeedback(feedback, { env: {}, fetch: never })
    ).toEqual({ ok: false, reason: "not-configured" })
    expect(never).not.toHaveBeenCalled()
    expect(
      await deliverGuestFeedback(feedback, {
        env,
        fetch: async () => new Response("no", { status: 400 }),
      })
    ).toEqual({ ok: false, reason: "refused" })
    expect(
      await deliverGuestFeedback(feedback, {
        env,
        fetch: async () => {
          throw new Error("down")
        },
      })
    ).toEqual({ ok: false, reason: "unreachable" })
  })
})
