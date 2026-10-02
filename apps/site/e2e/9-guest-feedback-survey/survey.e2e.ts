import type { Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { Doc } from "../3-layouts/support/api"
import {
  accessibilityProblems,
  closeHarness,
  openHarness,
  scrollsSideways,
  type Harness,
} from "../3-layouts/support/site"
import { visit } from "../theme/support/browser"
import { ORIGIN } from "../theme/support/env"

/**
 * Guest feedback survey acceptance: the Block, as a guest meets it on a Published
 * Page.
 *
 * - The rating is five stars under the Page's h1. A click chooses and moves
 *   on; from the keyboard the arrows choose and Enter moves on.
 * - 4 or 5 stars are asked for a review at the Block's link, and can skip it.
 * - 1 to 3 stars get the feedback form. It needs a message, and says so.
 * - Sent feedback is answered with thanks. Feedback that can't be sent (no
 *   Workflows platform is configured here) is answered with the Not sent
 *   step, which keeps the answers and offers to try again.
 * - The route refuses answers that are wrong, and drops a script's.
 * - Every step passes WCAG 2.2 AA and reflows at 320 CSS pixels.
 * - The Site adds the Guest feedback survey Page Template, with its Survey Layout.
 */

const RUN = Date.now()
const PATH = `/e2e-survey-${RUN}`
const REVIEW = "https://example.com/review"

let h: Harness
let doc: Doc
/** The Page Templates and Layouts the Site had before this spec. */
let had: { pages: Set<number>; layouts: Set<number> }

const TEMPLATES =
  "/api/pages?where[isTemplate][equals]=true&draft=true&limit=100&depth=0"
const LAYOUTS = "/api/layouts?limit=100&depth=0"

async function ids(path: string): Promise<number[]> {
  const found = (await (
    await h.staff.context.request.get(`${ORIGIN}${path}`)
  ).json()) as { docs: Doc[] }
  return found.docs.map((item) => item.id)
}

beforeAll(async () => {
  h = await openHarness()
  had = {
    pages: new Set(await ids(TEMPLATES)),
    layouts: new Set(await ids(LAYOUTS)),
  }
  const made = await h.staff.context.request.post(
    `${ORIGIN}/api/pages?draft=false`,
    {
      data: {
        title: `E2E survey ${RUN}`,
        path: PATH,
        _status: "published",
        blocks: [
          {
            blockType: "guestSurvey",
            heading: "How was your stay with us?",
            intro: "This takes about ten seconds.",
            reviewFrom: "4",
            phone: "+1 555 010 0100",
            positive: {
              heading: "We’re so glad you enjoyed your stay.",
              text: "Would you share it on Google?",
              reviewUrl: REVIEW,
              buttonLabel: "Leave a Google review",
              laterLabel: "Maybe later",
            },
            thanks: { heading: "Thanks for staying with us.", text: "" },
            negative: {
              heading: "We’re sorry your stay wasn’t what you expected.",
              text: "Tell us what happened.",
              messageLabel: "How could we have improved your stay?",
              formFields: ["name", "email"],
              consentLabel: "It’s okay to contact me about this.",
              submitLabel: "Send feedback",
            },
            success: {
              heading: "Thank you. Our team has your feedback.",
              text: "Prefer to talk now? Call us at {phone}.",
            },
            failure: {
              heading: "We couldn’t send your feedback.",
              text: "Your answers are still here. Try again, or call {phone}.",
            },
            background: "default",
          },
        ],
      },
    }
  )
  expect(made.ok(), await made.text()).toBe(true)
  doc = ((await made.json()) as { doc: Doc }).doc
  h.api.track("page", doc.id)
})

afterAll(async () => {
  if (h && had) {
    // The starters this spec added, and the Layouts that came with them.
    for (const id of await ids(TEMPLATES)) {
      if (!had.pages.has(id)) h.api.track("page", id)
    }
    for (const id of await ids(LAYOUTS)) {
      if (!had.layouts.has(id)) h.api.track("layout", id)
    }
  }
  await closeHarness(h)
})

const h1 = (page: Page) => page.getByRole("heading", { level: 1 })
const star = (page: Page, name: string) => page.getByRole("radio", { name })

describe("the Guest feedback survey, as a guest", () => {
  it("starts with five stars under the Page's h1", async () => {
    const { page } = h.visitor
    await visit(page, PATH)
    expect(await h1(page).textContent()).toBe("How was your stay with us?")
    expect(
      await page
        .getByRole("radiogroup", { name: "How was your stay with us?" })
        .getByRole("radio")
        .count()
    ).toBe(5)
    expect(await accessibilityProblems(page)).toBe("")
  })

  it("asks a 5-star guest for a review, who can skip it", async () => {
    const { page } = h.visitor
    await visit(page, PATH)
    await page.getByText("5 stars – Excellent").click({ force: true })
    await h1(page).filter({ hasText: "so glad" }).waitFor()
    expect(
      await page
        .getByRole("link", { name: "Leave a Google review" })
        .getAttribute("href")
    ).toBe(REVIEW)
    expect(await accessibilityProblems(page)).toBe("")
    await page.getByRole("button", { name: "Maybe later" }).click()
    await h1(page).filter({ hasText: "Thanks for staying" }).waitFor()
    expect(await accessibilityProblems(page)).toBe("")
  })

  it("from the keyboard, chooses with the arrows and moves on with Enter", async () => {
    const { page } = h.visitor
    await visit(page, PATH)
    await star(page, "1 star – Poor").focus()
    await page.keyboard.press("ArrowRight")
    await page.getByText("Press Enter to continue").first().waitFor()
    expect(await h1(page).textContent()).toBe("How was your stay with us?")
    await page.keyboard.press("Enter")
    await h1(page).filter({ hasText: "We’re sorry" }).waitFor()
    // The step starts at its heading.
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe(
      "H1"
    )
    await page.getByRole("button", { name: "Change rating" }).click()
    expect(await star(page, "2 stars – Fair").isChecked()).toBe(true)
  })

  it("needs a message, then says it could not be sent and keeps the answers", async () => {
    const { page } = h.visitor
    await visit(page, PATH)
    await page.getByText("2 stars – Fair").click({ force: true })
    await h1(page).filter({ hasText: "We’re sorry" }).waitFor()
    expect(
      await page
        .getByRole("textbox")
        .evaluateAll((els) => els.map((el) => el.getAttribute("name")))
    ).toEqual(["message", "name", "email"])
    expect(await accessibilityProblems(page)).toBe("")

    await page.getByRole("button", { name: "Send feedback" }).click()
    await page
      .getByRole("alert")
      .filter({ hasText: "Please fix the highlighted field" })
      .waitFor()
    expect(await accessibilityProblems(page)).toBe("")

    await page
      .getByLabel("How could we have improved your stay?")
      .fill("The heating was off.")
    await page.getByRole("button", { name: "Send feedback" }).click()
    // No Workflows platform is configured for the acceptance Site.
    await h1(page).filter({ hasText: "couldn’t send" }).waitFor()
    expect(
      await page
        .getByRole("link", { name: "+1 555 010 0100" })
        .getAttribute("href")
    ).toBe("tel:+15550100100")
    expect(await accessibilityProblems(page)).toBe("")

    // Trying again sends the same answers; this time they arrive.
    let sent: unknown
    await page.route("**/api/guest-feedback", async (route) => {
      sent = route.request().postDataJSON()
      await route.fulfill({ json: { ok: true } })
    })
    await page.getByRole("button", { name: "Try again" }).click()
    await h1(page).filter({ hasText: "Thank you." }).waitFor()
    expect(sent).toMatchObject({
      rating: 2,
      message: "The heating was off.",
      consent: false,
      page: PATH,
    })
    expect(await accessibilityProblems(page)).toBe("")
    await page.unroute("**/api/guest-feedback")
  })

  it("reflows at 320 CSS pixels", async () => {
    const { page } = h.visitor
    await page.setViewportSize({ width: 320, height: 720 })
    try {
      await visit(page, PATH)
      expect(await scrollsSideways(page)).toBe(false)
      await page.getByText("1 star – Poor").click({ force: true })
      await h1(page).filter({ hasText: "We’re sorry" }).waitFor()
      expect(await scrollsSideways(page)).toBe(false)
    } finally {
      await page.setViewportSize({ width: 1280, height: 900 })
    }
  })
})

describe("the route that receives feedback", () => {
  const post = (data: unknown) =>
    h.visitor.context.request.post(`${ORIGIN}/api/guest-feedback`, { data })

  it("refuses answers that are wrong, with the reason", async () => {
    const response = await post({ rating: 2, message: "" })
    expect(response.status()).toBe(400)
    expect(await response.json()).toMatchObject({
      ok: false,
      errors: { message: "Tell us what happened." },
    })
    expect((await post({ rating: 9, message: "Hi" })).status()).toBe(400)
  })

  it("answers a script that fills the trap as sent, and sends nothing", async () => {
    const response = await post({ rating: 1, message: "Buy", website: "x" })
    expect(response.status()).toBe(200)
  })

  it("says so when the feedback could not be passed on", async () => {
    expect((await post({ rating: 1, message: "Hi" })).status()).toBe(502)
  })
})

describe("the Guest feedback survey Page Template", () => {
  it("is added with the starters, with its Survey Layout", async () => {
    const { page } = h.staff
    await visit(page, "/admin/pages/templates")
    const add = page.getByRole("button", { name: "Add starter templates" })
    if ((await add.count()) > 0) {
      await add.first().click()
      await page.getByText("Guest feedback survey template").first().waitFor()
    }
    expect(
      await page.getByText("Guest feedback survey template").count()
    ).toBeGreaterThan(0)
    const layouts = (await (
      await h.staff.context.request.get(
        `${ORIGIN}/api/layouts?where[name][equals]=Survey%20Layout&depth=0`
      )
    ).json()) as { docs: Doc[] }
    expect(layouts.docs).toHaveLength(1)
  })
})
