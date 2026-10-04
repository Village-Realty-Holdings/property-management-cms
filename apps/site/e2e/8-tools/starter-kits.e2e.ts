import pg from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  accessibilityProblems,
  closeHarness,
  openHarness,
  type Harness,
} from "../3-layouts/support/site"
import { visit } from "../theme/support/browser"
import { databaseUrl, ORIGIN, SCHEMA } from "../theme/support/env"

/**
 * Tools acceptance: Starter Kits.
 *
 * - The screen follows the one page-header pattern, shows its five steps and
 *   passes WCAG 2.2 AA on each.
 * - A step with a missing answer says so and stays.
 * - Choosing a kit asks the kit's own question and suggests its Theme.
 * - The review says what will change before anything is written, and that a
 *   Page already at a path is not replaced.
 * - Setting up saves the Brand and adds the kit's Home Page as a Draft, with
 *   the answers in its text, unless a Page is already there.
 */

const SCREEN = "/admin/tools/starter-kits"
const NAME = `E2E Lodge ${Date.now()}`

type Json = Record<string, unknown>
type Found = { docs: (Json & { id: number })[] }

let h: Harness
let brand: Json
let hadHome: boolean
/** A Saved Theme of the Site's Theme, so the list has one marked "Live now". */
let savedTheme: number | undefined

const get = async <T>(path: string): Promise<T> =>
  (await h.user.context.request.get(`${ORIGIN}${path}`)).json() as Promise<T>

const homePages = () =>
  get<Found>("/api/pages?where[path][equals]=/&draft=true&depth=0")

beforeAll(async () => {
  h = await openHarness()
  brand = await get<Json>("/api/globals/brand?depth=0")
  hadHome = (await homePages()).docs.length > 0
  // Earlier specs may leave a Theme that matches no built-in one.
  const theme = await get<Json>("/api/globals/theme?depth=0")
  if (theme.id) {
    const record = ["id", "createdAt", "updatedAt", "globalType"]
    const own = [...record, "updatedBy", "changeSummary", "note"]
    const made = await h.user.context.request.post(
      `${ORIGIN}/api/saved-themes`,
      {
        data: {
          name: NAME,
          inputs: Object.fromEntries(
            Object.entries(theme).filter(([key]) => !own.includes(key))
          ),
        },
      }
    )
    expect(made.ok(), await made.text()).toBe(true)
    savedTheme = ((await made.json()) as { doc: { id: number } }).doc.id
  }
})

afterAll(async () => {
  if (h) {
    const request = h.user.context.request
    // The Brand as it was, and the Home Page and Layout the kit added.
    if (brand.id) {
      await request.post(`${ORIGIN}/api/globals/brand`, {
        data: {
          name: brand.name,
          tagline: brand.tagline ?? null,
          contact: brand.contact ?? {},
        },
      })
    } else {
      // Nobody had saved the Brand, and a saved Brand can't lose its name
      // again through the API: take the record away, as it was.
      const client = new pg.Client({ connectionString: databaseUrl() })
      await client.connect()
      try {
        await client.query(`DELETE FROM "${SCHEMA}"."brand"`)
      } finally {
        await client.end()
      }
    }
    if (savedTheme) {
      await request.delete(`${ORIGIN}/api/saved-themes/${savedTheme}`)
    }
    if (!hadHome) {
      for (const page of (await homePages()).docs) {
        await request.delete(`${ORIGIN}/api/pages/${page.id}`)
      }
      const layouts = await get<Found>(
        "/api/layouts?where[name][equals]=Tuck-in%20Layout&depth=0"
      )
      for (const layout of layouts.docs) h.api.track("layout", layout.id)
    }
  }
  await closeHarness(h)
})

describe("Starter Kits", () => {
  it("follows the page-header pattern, shows its steps and passes WCAG 2.2 AA", async () => {
    const { page } = h.user
    await visit(page, SCREEN)
    expect(
      await page
        .getByRole("heading", { level: 1, name: "Starter Kits" })
        .count()
    ).toBe(1)
    const steps = page.getByRole("navigation", { name: "Steps" })
    expect(await steps.getByRole("listitem").allTextContents()).toEqual([
      "1. Kit",
      "2. Brand",
      "3. SEO",
      "4. Theme",
      "5. Review",
    ])
    expect(await steps.locator('[aria-current="step"]').textContent()).toBe(
      "1. Kit"
    )
    expect(await accessibilityProblems(page)).toBe("")
  })

  it("walks the steps, reviews, then sets the Site up", async () => {
    const { page } = h.user
    await visit(page, SCREEN)
    const next = page.getByRole("button", { name: "Next" })

    await next.click()
    await page.getByText("Choose a Starter Kit.").waitFor()
    await page.getByRole("radio", { name: "Tuck-in" }).click()
    await page.getByLabel("Company joining").fill("E2E Lakeside Stays")
    await next.click()

    const name = page.getByLabel("Site name")
    await name.waitFor()
    await name.fill("")
    await next.click()
    await page.getByText("Enter the Site name.").waitFor()
    await name.fill(NAME)
    expect(await accessibilityProblems(page)).toBe("")
    await next.click()

    await page.getByLabel("Title pattern").waitFor()
    expect(await accessibilityProblems(page)).toBe("")
    await next.click()

    // The kit's Theme is suggested; the Theme the Site wears changes nothing.
    const themes = page.getByRole("radiogroup", { name: "Theme" })
    await themes.waitFor()
    expect(
      await themes.getByRole("radio", { name: "Classic" }).isChecked()
    ).toBe(true)
    await themes
      .locator("div")
      .filter({ hasText: "Live now" })
      .getByRole("radio")
      .first()
      .click()
    expect(await accessibilityProblems(page)).toBe("")
    await next.click()

    const review = page.getByRole("list", { name: "What will change" })
    await review.waitFor()
    const lines = (await review.getByRole("listitem").allTextContents()).join(
      "\n"
    )
    expect(lines).toContain(NAME)
    expect(lines).toContain("The Theme stays")
    expect(lines).toContain(
      hadHome
        ? "is not added"
        : "The Page “Home” at the Site's root (/) is added as a Draft"
    )
    expect(await accessibilityProblems(page)).toBe("")
    // Nothing is written by the review.
    expect((await get<Json>("/api/globals/brand?depth=0")).name ?? null).toBe(
      brand.name ?? null
    )

    await page.getByRole("button", { name: "Set up Site" }).click()
    await page
      .getByRole("heading", {
        name: "Your Site is set up from the Tuck-in kit.",
      })
      .waitFor()
    expect((await get<Json>("/api/globals/brand?depth=0")).name).toBe(NAME)
    if (!hadHome) {
      const [home] = (await homePages()).docs
      expect(home?._status).toBe("draft")
      expect(JSON.stringify(home?.blocks)).toContain(
        `E2E Lakeside Stays Joins ${NAME}!`
      )
      await page.getByRole("link", { name: "Open the Page" }).waitFor()
    }
    expect(await accessibilityProblems(page)).toBe("")
  })
})
