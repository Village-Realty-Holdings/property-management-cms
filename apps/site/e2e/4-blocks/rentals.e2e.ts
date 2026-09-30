import type { Browser, Locator, Page } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  axeViolations,
  launchBrowser,
  openSession,
  visit,
  type Session,
} from "../theme/support/browser"
import {
  blockPath,
  blockRegion,
  brokenImages,
  carouselControls,
  leftEdges,
  settle,
  type BlockQuery,
} from "./support/catalogue"
import {
  AVADA_RENTALS,
  WARREN_BEACH_RENTALS,
  isSorted,
  matching,
  normaliseName,
  rentalNamed,
  sleepingAtLeast,
  sleepsOnCard,
  type ExpectedRental,
} from "./support/fixtures"

/**
 * Phase 4 acceptance: the Rental Blocks select from fixtures correctly, and
 * a Site with no fixtures renders them empty, with a friendly message.
 *
 * The expected selections come from the brand research's
 * `rentals.fixture.json` (./support/fixtures.ts), not from the Site's own
 * fixture modules, so the Site's selection is checked against an
 * independent copy of the data. The catalogue's `fixtures` parameter picks
 * the Site whose fixtures a Block reads (see ./support/catalogue.ts); the
 * scratch Site the tests run on has none of its own.
 *
 * A Rental card is an `<article>` headed by the Rental's name, and says how
 * many it sleeps ("Sleeps 12"), which must match the fixture.
 */

let browser: Browser

beforeAll(async () => {
  browser = await launchBrowser()
})

afterAll(async () => {
  await browser?.close()
})

type Opened = Session & { region: Locator }

async function withBlock(
  name: string,
  query: BlockQuery,
  check: (opened: Opened) => Promise<void>
): Promise<void> {
  const session = await openSession(browser)
  try {
    const response = await visit(
      session.page,
      await blockPath(browser, name, query)
    )
    expect(response?.status()).toBe(200)
    await check({ ...session, region: blockRegion(session.page) })
    expect(session.log.pageErrors).toEqual([])
  } finally {
    await session.context.close()
  }
}

type Card = { name: string; text: string }

/** The Rental cards the Block shows now, in order. */
async function cards(region: Locator): Promise<Card[]> {
  const articles = region.getByRole("article")
  const found: Card[] = []
  for (let i = 0; i < (await articles.count()); i++) {
    const article = articles.nth(i)
    const name = (await article.getByRole("heading").first().innerText())
      .replace(/\s+/g, " ")
      .trim()
    found.push({ name, text: await article.innerText() })
  }
  return found
}

/**
 * Each card names a Rental of `fixtures`, once, and says it sleeps as many
 * as the fixture does. Returns the sorted names.
 */
function checkCards(
  shown: readonly Card[],
  fixtures: readonly ExpectedRental[]
): string[] {
  const names: string[] = []
  for (const card of shown) {
    const rental = rentalNamed(fixtures, card.name)
    expect(rental, `"${card.name}" is a fixture Rental`).toBeDefined()
    expect(sleepsOnCard(card.text), `sleeps on "${card.name}"`).toBe(
      rental!.sleeps
    )
    names.push(rental!.name)
  }
  expect(new Set(names).size, "no Rental twice").toBe(names.length)
  return names.sort()
}

/** The Rental grid's pagination control, if it shows one. */
function nextPage(region: Locator): Locator {
  const nav = region.getByRole("navigation")
  return nav
    .getByRole("link", { name: /next/i })
    .or(nav.getByRole("button", { name: /next/i }))
    .first()
}

async function canGoOn(next: Locator): Promise<boolean> {
  if ((await next.count()) === 0) return false
  return next.evaluate(
    (el) =>
      !(el as HTMLButtonElement).disabled &&
      el.getAttribute("aria-disabled") !== "true"
  )
}

/** The names on the cards shown now, as one string to tell pages apart. */
async function cardKey(region: Locator): Promise<string> {
  return (await cards(region)).map((card) => card.name).join("|")
}

/** Every card on every page of the grid, walking its pagination. */
async function everyPage(page: Page, region: Locator): Promise<Card[]> {
  const all: Card[] = [...(await cards(region))]
  for (let pages = 1; pages < 20; pages++) {
    const next = nextPage(region)
    if (!(await canGoOn(next))) break
    const before = await cardKey(region)
    await next.click()
    // The next page arrives in place or as a new page load.
    const deadline = Date.now() + 10_000
    while ((await cardKey(region)) === before) {
      if (Date.now() > deadline) throw new Error("Next did not change page")
      await page.waitForTimeout(200)
    }
    all.push(...(await cards(region)))
  }
  return all
}

/** A filter chip, whether a toggle button, a checkbox or a radio. */
function chip(region: Locator, name: RegExp): Locator {
  return region
    .getByRole("button", { name })
    .or(region.getByRole("checkbox", { name }))
    .or(region.getByRole("radio", { name }))
    .or(region.getByRole("switch", { name }))
    .first()
}

function isOn(control: Locator): Promise<boolean> {
  return control.evaluate(
    (el) =>
      el.getAttribute("aria-pressed") === "true" ||
      el.getAttribute("aria-checked") === "true" ||
      (el as HTMLInputElement).checked === true
  )
}

/** Picks the first sort option matching `option` in the grid's Sort control. */
async function sortBy(page: Page, region: Locator, option: RegExp) {
  const control = region.getByRole("combobox", { name: /sort/i }).first()
  const native = await control.evaluate((el) => el.tagName === "SELECT")
  if (native) {
    const labels = await control.evaluate((el) =>
      [...(el as HTMLSelectElement).options].map((o) => o.label)
    )
    const label = labels.find((l) => option.test(l))
    expect(label, `a sort option matching ${option}`).toBeDefined()
    await control.selectOption({ label: label! })
  } else {
    await control.click()
    await page.getByRole("option", { name: option }).first().click()
  }
  await settle(page)
}

/** The Block shows no cards, and says so in words. */
async function expectFriendlyEmpty(region: Locator) {
  expect(await region.getByRole("article").count()).toBe(0)
  const heading = await region.getByRole("heading").first().innerText()
  const rest = (await region.innerText()).replace(heading, "").trim()
  expect(rest.length, "a message instead of cards").toBeGreaterThan(10)
}

describe("with no fixtures", () => {
  it.each([["Featured rentals"], ["Large-group rentals"], ["Rental grid"]])(
    "%s renders empty with a friendly message, and passes axe",
    async (name) => {
      await withBlock(name, {}, async ({ page, region }) => {
        await expectFriendlyEmpty(region)
        expect(await axeViolations(page)).toEqual([])
      })
    }
  )
})

describe("Featured rentals", () => {
  it.each([[3], [5]])(
    "as a grid, shows exactly %i of the Site's Rentals as cards with their photos",
    async (count) => {
      await withBlock(
        "Featured rentals",
        { fixtures: "avada", variant: "grid", count },
        async ({ region }) => {
          const shown = await cards(region)
          expect(shown).toHaveLength(count)
          checkCards(shown, AVADA_RENTALS)
          expect(
            await region.getByRole("article").locator("img").count()
          ).toBeGreaterThanOrEqual(count)
          expect(await brokenImages(region)).toEqual([])
        }
      )
    }
  )

  it("reads each Site's own fixtures", async () => {
    await withBlock(
      "Featured rentals",
      { fixtures: "warren_beach", variant: "grid", count: 4 },
      async ({ region }) => {
        const shown = await cards(region)
        expect(shown).toHaveLength(4)
        checkCards(shown, WARREN_BEACH_RENTALS)
      }
    )
  })

  it("as a carousel, pages through the cards by mouse and keyboard", async () => {
    await withBlock(
      "Featured rentals",
      { fixtures: "avada", variant: "carousel", count: 6 },
      async ({ page, region }) => {
        const shown = await cards(region)
        expect(shown).toHaveLength(6)
        checkCards(shown, AVADA_RENTALS)

        const articles = region.getByRole("article")
        const { next, previous } = carouselControls(region)
        const start = await leftEdges(articles)
        await next.click()
        await settle(page)
        expect(await leftEdges(articles)).not.toEqual(start)

        await previous.focus()
        await page.keyboard.press("Enter")
        // The carousel eases to its slide and takes a moment to come to rest.
        await expect
          .poll(() => leftEdges(articles), { timeout: 5_000 })
          .toEqual(start)
        expect(await axeViolations(page)).toEqual([])
      }
    )
  })
})

describe("Large-group rentals", () => {
  it.each([
    ["warren_beach", 16, WARREN_BEACH_RENTALS],
    ["warren_beach", 19, WARREN_BEACH_RENTALS],
    ["avada", 12, AVADA_RENTALS],
  ] as const)(
    "with %s's fixtures, shows every Rental that sleeps at least %i",
    async (fixtures, minSleeps, rentals) => {
      await withBlock(
        "Large-group rentals",
        { fixtures, minSleeps },
        async ({ region }) => {
          const names = checkCards(await cards(region), rentals)
          expect(names).toEqual(sleepingAtLeast(rentals, minSleeps))
        }
      )
    }
  )

  it("shows the friendly empty message when no Rental is that large", async () => {
    await withBlock(
      "Large-group rentals",
      { fixtures: "avada", minSleeps: 99 },
      async ({ region }) => {
        await expectFriendlyEmpty(region)
      }
    )
  })
})

describe("Rental grid", () => {
  const all = matching(AVADA_RENTALS, {})

  it("pages through every Rental once, with simple pagination", async () => {
    await withBlock(
      "Rental grid",
      { fixtures: "avada" },
      async ({ page, region }) => {
        const first = await cards(region)
        expect(first.length).toBeGreaterThan(0)
        expect(first.length, "more than one page of 12").toBeLessThan(
          all.length
        )
        expect(await region.getByRole("navigation").count()).toBeGreaterThan(0)
        const names = checkCards(await everyPage(page, region), AVADA_RENTALS)
        expect(names).toEqual(all)
        // No map and no availability: the grid is fixtures only.
        expect(await region.locator("iframe").count()).toBe(0)
      }
    )
  })

  it("filters by pets", async () => {
    await withBlock(
      "Rental grid",
      { fixtures: "avada" },
      async ({ page, region }) => {
        const pets = chip(region, /pet/i)
        await pets.click()
        await settle(page)
        expect(await isOn(chip(region, /pet/i))).toBe(true)
        const names = checkCards(await everyPage(page, region), AVADA_RENTALS)
        expect(names).toEqual(matching(AVADA_RENTALS, { pets: true }))
      }
    )
  })

  it("filters by location, one chip per town", async () => {
    await withBlock(
      "Rental grid",
      { fixtures: "avada" },
      async ({ page, region }) => {
        // "GATLINBURG, TN" and "Gatlinburg, TN" in the research are one town.
        for (const town of ["Sevierville", "Gatlinburg", "Pigeon Forge"]) {
          const chips = region
            .getByRole("button", { name: new RegExp(town, "i") })
            .or(region.getByRole("checkbox", { name: new RegExp(town, "i") }))
            .or(region.getByRole("radio", { name: new RegExp(town, "i") }))
          expect(await chips.count(), `one ${town} chip`).toBe(1)
        }
        await chip(region, /gatlinburg/i).click()
        await settle(page)
        const names = checkCards(await everyPage(page, region), AVADA_RENTALS)
        expect(names).toEqual(
          matching(AVADA_RENTALS, { location: "Gatlinburg" })
        )
      }
    )
  })

  it("combines filters: pets in Sevierville", async () => {
    await withBlock(
      "Rental grid",
      { fixtures: "avada" },
      async ({ page, region }) => {
        await chip(region, /pet/i).click()
        await settle(page)
        await chip(region, /sevierville/i).click()
        await settle(page)
        const names = checkCards(await everyPage(page, region), AVADA_RENTALS)
        expect(names).toEqual(
          matching(AVADA_RENTALS, { pets: true, location: "Sevierville" })
        )
      }
    )
  })

  it("filters by bedrooms", async () => {
    await withBlock(
      "Rental grid",
      { fixtures: "avada" },
      async ({ page, region }) => {
        // "4", "4+" or "4 bedrooms": exactly four, or four and more.
        await chip(region, /^\s*4\s*\+?\s*(bed(room)?s?|br)?\s*$/i).click()
        await settle(page)
        const names = checkCards(await everyPage(page, region), AVADA_RENTALS)
        expect(names.length).toBeGreaterThan(0)
        const atLeastFour = matching(AVADA_RENTALS, { minBeds: 4 })
        for (const name of names) expect(atLeastFour).toContain(name)
        for (const name of matching(AVADA_RENTALS, { beds: 4 }))
          expect(names).toContain(name)
      }
    )
  })

  it("toggles a chip from the keyboard", async () => {
    await withBlock(
      "Rental grid",
      { fixtures: "avada" },
      async ({ page, region }) => {
        await chip(region, /pet/i).focus()
        await page.keyboard.press("Space")
        await settle(page)
        expect(await isOn(chip(region, /pet/i))).toBe(true)
        const shown = (await cards(region)).map((card) =>
          normaliseName(card.name)
        )
        const pets = matching(AVADA_RENTALS, { pets: true }).map(normaliseName)
        for (const name of shown) expect(pets).toContain(name)
      }
    )
  })

  it("sorts by how many a Rental sleeps, across pages", async () => {
    await withBlock(
      "Rental grid",
      { fixtures: "avada" },
      async ({ page, region }) => {
        await sortBy(page, region, /sleep|guest|size/i)
        const shown = await everyPage(page, region)
        const names = checkCards(shown, AVADA_RENTALS)
        expect(names).toEqual(all)
        const sleeps = shown.map((card) => sleepsOnCard(card.text) ?? 0)
        expect(isSorted(sleeps), `sleeps in order: ${sleeps}`).toBe(true)
      }
    )
  })

  it("passes axe with a filter on", async () => {
    await withBlock(
      "Rental grid",
      { fixtures: "avada" },
      async ({ page, region }) => {
        await chip(region, /pet/i).click()
        await settle(page)
        expect(await axeViolations(page)).toEqual([])
      }
    )
  })
})
