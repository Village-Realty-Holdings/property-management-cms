import type { Browser, Locator } from "playwright-core"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  launchBrowser,
  openSession,
  visit,
  type Session,
} from "../theme/support/browser"
import { ORIGIN } from "../theme/support/env"
import {
  blockPath,
  blockRegion,
  brokenImages,
  carouselControls,
  fillEveryField,
  leftEdges,
  settle,
  toast,
  watchWrites,
  type BlockQuery,
} from "./support/catalogue"
import { faqPageEntries, sameText } from "./support/faq"

/**
 * Phase 4 acceptance: what each Page Block shows and does, from its sample
 * data, per the spec's Block table. (The Rental Blocks are in
 * rentals.e2e.ts.) Every check reads the page as a visitor's browser does:
 * roles, labels, visible text, geometry, and the requests the page makes.
 * The visual-only forms (Search Hero, Newsletter, Form) must neither send
 * anything nor navigate: no request other than GET, and the page stays put.
 */

let browser: Browser

beforeAll(async () => {
  browser = await launchBrowser()
})

afterAll(async () => {
  await browser?.close()
})

type Opened = Session & { region: Locator }

/** Opens a Block's catalogue page and hands its region to `check`. */
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

/** The number of elements `locator` matches that are Lucide icons. */
function lucideIcons(scope: Locator): Locator {
  return scope.locator("svg.lucide")
}

/** Every Lucide icon in `scope` is hidden from assistive technology. */
async function iconsAreDecorative(scope: Locator): Promise<boolean> {
  return lucideIcons(scope).evaluateAll((icons) =>
    icons.every(
      (icon) =>
        icon.getAttribute("aria-hidden") === "true" ||
        icon.closest("[aria-hidden=true]") !== null
    )
  )
}

/** The images in `scope` that have no text alternative. */
function imagesWithoutAlt(scope: Locator): Promise<string[]> {
  return scope
    .locator("img")
    .evaluateAll((images) =>
      images
        .filter((img) => !(img.getAttribute("alt") ?? "").trim())
        .map((img) => (img as HTMLImageElement).src)
    )
}

describe("Hero", () => {
  it("shows an eyebrow line, a heading with a styled accent word, an image, a call to action and a fused trust strip", async () => {
    await withBlock("Hero", {}, async ({ region }) => {
      const heading = region.getByRole("heading", { level: 1 })
      expect(await heading.count()).toBe(1)

      // The eyebrow: text in the Hero before its heading.
      const eyebrow = await heading.evaluate((h1) => {
        const section = h1.closest("section")!
        const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT)
        let text = ""
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (h1.contains(node)) break
          if (
            node.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING
          )
            text += node.textContent ?? ""
        }
        return text.trim()
      })
      expect(eyebrow.length).toBeGreaterThan(0)

      // The accent word: an element inside the heading styled apart.
      const accent = await heading.evaluate((h1) => {
        const own = getComputedStyle(h1)
        return [...h1.querySelectorAll("*")].some((el) => {
          const style = getComputedStyle(el)
          return (
            (el.textContent ?? "").trim().length > 0 &&
            (style.color !== own.color ||
              style.fontStyle !== own.fontStyle ||
              style.fontFamily !== own.fontFamily ||
              style.backgroundImage !== "none" ||
              style.textDecorationLine !== "none")
          )
        })
      })
      expect(accent).toBe(true)

      expect(await region.locator("img").count()).toBeGreaterThan(0)
      expect(await brokenImages(region)).toEqual([])
      expect(await region.getByRole("link").count()).toBeGreaterThan(0)

      // The trust strip is part of the Hero, not a Block of its own.
      const strip = region.getByRole("list").last()
      expect(await strip.getByRole("listitem").count()).toBeGreaterThanOrEqual(
        2
      )
    })
  })
})

describe("Search Hero", () => {
  it("has a labelled booking search: dates, guests and location", async () => {
    await withBlock("Search Hero", {}, async ({ region }) => {
      expect(await region.getByRole("heading", { level: 1 }).count()).toBe(1)
      expect(
        await region.getByLabel(/date|check.?in|arriv/i).count()
      ).toBeGreaterThan(0)
      expect(await region.getByLabel(/guest/i).count()).toBeGreaterThan(0)
      expect(
        await region.getByLabel(/location|where|destination/i).count()
      ).toBeGreaterThan(0)
    })
  })

  it("shows a toast on submit, and nothing else happens", async () => {
    await withBlock("Search Hero", {}, async ({ page, region }) => {
      const before = page.url()
      const watched = watchWrites(page)
      const form = region.locator("form").first()
      await fillEveryField(form)
      await region
        .getByRole("button", { name: /search/i })
        .first()
        .click()

      await toast(page).first().waitFor({ state: "visible", timeout: 5000 })
      expect((await toast(page).first().innerText()).trim()).not.toBe("")
      await settle(page)
      expect(page.url()).toBe(before)
      expect(watched.navigations).toEqual([])
      expect(watched.writes).toEqual([])
    })
  })
})

describe("Rich text", () => {
  it("renders its formatted content as before", async () => {
    await withBlock("Rich text", {}, async ({ region }) => {
      expect(await region.getByRole("heading").count()).toBeGreaterThan(0)
      expect(await region.locator("p").count()).toBeGreaterThan(0)
    })
  })
})

describe("Call to action", () => {
  it("has a heading and a button", async () => {
    await withBlock("Call to action", {}, async ({ region }) => {
      expect(await region.getByRole("heading").count()).toBeGreaterThan(0)
      expect(
        await region.getByRole("link").or(region.getByRole("button")).count()
      ).toBeGreaterThan(0)
    })
  })
})

describe("Steps", () => {
  it("shows 3 to 4 numbered steps, each with a title and text", async () => {
    await withBlock("Steps", {}, async ({ region }) => {
      const list = region.locator("ol").first()
      expect(await list.count()).toBe(1)
      const steps = list.getByRole("listitem")
      const count = await steps.count()
      expect(count).toBeGreaterThanOrEqual(3)
      expect(count).toBeLessThanOrEqual(4)
      for (let i = 0; i < count; i++) {
        const step = steps.nth(i)
        expect(await step.getByRole("heading").count()).toBe(1)
        const title = (await step.getByRole("heading").innerText()).trim()
        const text = (await step.innerText()).replace(title, "").trim()
        expect(text.length, `step ${i + 1} has text`).toBeGreaterThan(3)
      }
    })
  })
})

describe("Features", () => {
  it("shows a grid of Lucide icon, title and text", async () => {
    await withBlock("Features", {}, async ({ region }) => {
      expect(await lucideIcons(region).count()).toBeGreaterThanOrEqual(3)
      expect(await iconsAreDecorative(region)).toBe(true)
      expect(await region.getByRole("heading").count()).toBeGreaterThanOrEqual(
        3
      )
    })
  })
})

describe("Amenities", () => {
  it("as a photo-tile mosaic: labelled photos that load", async () => {
    await withBlock("Amenities", { variant: "mosaic" }, async ({ region }) => {
      expect(await region.locator("img").count()).toBeGreaterThanOrEqual(3)
      expect(await brokenImages(region)).toEqual([])
      expect(await imagesWithoutAlt(region)).toEqual([])
    })
  })

  it("as an icon list: a list of items with Lucide icons", async () => {
    await withBlock("Amenities", { variant: "icons" }, async ({ region }) => {
      const items = region.getByRole("listitem")
      expect(await items.count()).toBeGreaterThanOrEqual(3)
      expect(await lucideIcons(region).count()).toBeGreaterThanOrEqual(3)
      expect(await iconsAreDecorative(region)).toBe(true)
    })
  })

  it("the two variants look different", async () => {
    let mosaic = ""
    let icons = ""
    await withBlock("Amenities", { variant: "mosaic" }, async ({ region }) => {
      mosaic = await region.innerHTML()
    })
    await withBlock("Amenities", { variant: "icons" }, async ({ region }) => {
      icons = await region.innerHTML()
    })
    expect(mosaic).not.toBe(icons)
  })
})

describe("Stats", () => {
  it("shows 3 to 4 figures, each with a label", async () => {
    await withBlock("Stats", {}, async ({ region }) => {
      let items = region.getByRole("listitem")
      if ((await items.count()) === 0) items = region.getByRole("term")
      const count = await items.count()
      expect(count).toBeGreaterThanOrEqual(3)
      expect(count).toBeLessThanOrEqual(4)
      const texts = await items.allInnerTexts()
      for (const text of texts) expect(text).toMatch(/\d/)
      // A figure alone is not a stat: each has a label, a word or more.
      for (const text of texts) expect(text).toMatch(/[a-z]{3,}/i)
    })
  })
})

describe("Image + text", () => {
  async function sides(region: Locator) {
    const image = await region.locator("img").first().boundingBox()
    const heading = await region.getByRole("heading").first().boundingBox()
    return {
      image: (image?.x ?? 0) + (image?.width ?? 0) / 2,
      text: (heading?.x ?? 0) + (heading?.width ?? 0) / 2,
    }
  }

  it("puts the image on the left, or on the right", async () => {
    await withBlock("Image + text", { variant: "left" }, async ({ region }) => {
      const { image, text } = await sides(region)
      expect(image).toBeLessThan(text)
    })
    await withBlock(
      "Image + text",
      { variant: "right" },
      async ({ region }) => {
        const { image, text } = await sides(region)
        expect(image).toBeGreaterThan(text)
      }
    )
  })

  it("has text, an icon list and a caption on the image", async () => {
    await withBlock("Image + text", {}, async ({ region }) => {
      expect(await brokenImages(region)).toEqual([])
      expect(await imagesWithoutAlt(region)).toEqual([])
      const caption = region.locator("figure figcaption").first()
      expect((await caption.innerText()).trim().length).toBeGreaterThan(0)
      const list = region.getByRole("list").first()
      expect(await list.getByRole("listitem").count()).toBeGreaterThanOrEqual(2)
      expect(await lucideIcons(list).count()).toBeGreaterThanOrEqual(2)
      expect(await iconsAreDecorative(region)).toBe(true)
    })
  })
})

describe("Testimonials", () => {
  async function testimonialsHaveRatingsAndRoles(region: Locator) {
    const quotes = region.getByRole("blockquote")
    const count = await quotes.count()
    expect(count).toBeGreaterThanOrEqual(2)
    // A star rating a screen reader can read: "5 out of 5 stars".
    const ratings = region
      .getByRole("img", { name: /out of 5/i })
      .or(region.getByText(/out of 5/i))
    expect(await ratings.count()).toBe(count)
    // Each quote is attributed: a name and a role line.
    const captions = region.locator("figcaption")
    expect(await captions.count()).toBe(count)
    for (const text of await captions.allInnerTexts()) {
      expect(
        text
          .trim()
          .split(/\n|,|·|—|–/)
          .filter((s) => s.trim()).length
      ).toBeGreaterThanOrEqual(2)
    }
  }

  it("as a grid: every quote side by side, with a name, role line and star rating", async () => {
    await withBlock("Testimonials", { variant: "grid" }, async ({ region }) => {
      await testimonialsHaveRatingsAndRoles(region)
      const quotes = region.getByRole("blockquote")
      const first = await quotes.nth(0).boundingBox()
      const second = await quotes.nth(1).boundingBox()
      expect(Math.abs((first?.y ?? 0) - (second?.y ?? 0))).toBeLessThan(8)
      expect(await carouselControls(region).next.count()).toBe(0)
    })
  })

  it("as a carousel: Next moves to the following quotes, by mouse or keyboard", async () => {
    await withBlock(
      "Testimonials",
      { variant: "carousel" },
      async ({ page, region }) => {
        await testimonialsHaveRatingsAndRoles(region)
        const quotes = region.getByRole("blockquote")
        const { next, previous } = carouselControls(region)
        expect(await previous.count()).toBe(1)

        const start = await leftEdges(quotes)
        await next.click()
        await settle(page)
        const moved = await leftEdges(quotes)
        expect(moved).not.toEqual(start)

        await previous.focus()
        await page.keyboard.press("Enter")
        await settle(page)
        expect(await leftEdges(quotes)).toEqual(start)
      }
    )
  })
})

describe("Trust strip", () => {
  it("shows text or stat items", async () => {
    await withBlock("Trust strip", { variant: "items" }, async ({ region }) => {
      const items = region.getByRole("listitem")
      expect(await items.count()).toBeGreaterThanOrEqual(2)
      for (const text of await items.allInnerTexts())
        expect(text.trim().length).toBeGreaterThan(0)
    })
  })

  it("shows partner logos, each named, loaded from the Site", async () => {
    await withBlock("Trust strip", { variant: "logos" }, async ({ region }) => {
      expect(await region.locator("img").count()).toBeGreaterThanOrEqual(3)
      expect(await brokenImages(region)).toEqual([])
      expect(await imagesWithoutAlt(region)).toEqual([])
    })
  })
})

describe("Owner band", () => {
  it("has a pitch, a list of benefits and a call to action", async () => {
    await withBlock("Owner band", {}, async ({ region }) => {
      expect(await region.getByRole("heading").count()).toBeGreaterThan(0)
      const benefits = region.getByRole("list").first()
      expect(
        await benefits.getByRole("listitem").count()
      ).toBeGreaterThanOrEqual(2)
      expect(
        await region.getByRole("link").or(region.getByRole("button")).count()
      ).toBeGreaterThan(0)
    })
  })
})

describe("Newsletter", () => {
  it("has a heading, text and a labelled email field", async () => {
    await withBlock("Newsletter", {}, async ({ region }) => {
      expect(await region.getByRole("heading").count()).toBeGreaterThan(0)
      expect(await region.getByLabel(/email/i).count()).toBe(1)
    })
  })

  it("is visual-only: submitting sends nothing and stays on the page", async () => {
    await withBlock("Newsletter", {}, async ({ page, region }) => {
      const before = page.url()
      const watched = watchWrites(page)
      await region.getByLabel(/email/i).fill("guest@example.com")
      await region
        .getByRole("button", { name: /subscribe|sign ?up|join|submit|send/i })
        .first()
        .click()
      await settle(page)
      expect(page.url()).toBe(before)
      expect(watched.navigations).toEqual([])
      expect(watched.writes).toEqual([])
    })
  })
})

describe("Blog teaser", () => {
  it.each([["avada"], ["warren_beach"]])(
    "shows the %s fixture posts as 3 cards, each linking to its post",
    async (fixtures) => {
      await withBlock("Blog teaser", { fixtures }, async ({ region }) => {
        const cards = region.getByRole("article")
        expect(await cards.count()).toBe(3)
        const hrefs: string[] = []
        for (let i = 0; i < 3; i++) {
          const card = cards.nth(i)
          expect(await card.getByRole("heading").count()).toBeGreaterThan(0)
          const href = await card.getByRole("link").first().getAttribute("href")
          expect(href).toBeTruthy()
          hrefs.push(href!)
        }
        expect(new Set(hrefs).size).toBe(3)
      })
    }
  )
})

describe("Location", () => {
  it("shows the address, text and a map drawn without an embed", async () => {
    await withBlock("Location", {}, async ({ region }) => {
      expect(
        (await region.locator("address").first().innerText()).trim().length
      ).toBeGreaterThan(5)
      // Embed-free: no third-party frame (the catalogue test also checks no
      // request leaves the Site).
      expect(await region.locator("iframe").count()).toBe(0)
      expect(await brokenImages(region)).toEqual([])
      expect(await imagesWithoutAlt(region)).toEqual([])
    })
  })
})

describe("FAQ", () => {
  it("shows questions in an accordion that opens by mouse and keyboard", async () => {
    await withBlock("FAQ", {}, async ({ page, region }) => {
      const questions = region.locator("button[aria-expanded]")
      const count = await questions.count()
      expect(count).toBeGreaterThanOrEqual(2)

      const first = questions.nth(0)
      expect(await first.getAttribute("aria-expanded")).toBe("false")
      await first.click()
      expect(await first.getAttribute("aria-expanded")).toBe("true")
      const panelId = await first.getAttribute("aria-controls")
      expect(panelId).toBeTruthy()
      const panel = page.locator(`[id="${panelId}"]`)
      expect(await panel.isVisible()).toBe(true)
      expect((await panel.innerText()).trim().length).toBeGreaterThan(0)

      const second = questions.nth(1)
      await second.focus()
      await page.keyboard.press("Enter")
      expect(await second.getAttribute("aria-expanded")).toBe("true")
      await page.keyboard.press("Space")
      expect(await second.getAttribute("aria-expanded")).toBe("false")
    })
  })

  it("emits FAQPage JSON-LD in the server's HTML, matching what it shows", async () => {
    const path = await blockPath(browser, "FAQ")
    const html = await (await fetch(`${ORIGIN}${path}`)).text()
    const entries = faqPageEntries(html)
    expect(entries.length).toBeGreaterThanOrEqual(2)

    await withBlock("FAQ", {}, async ({ page, region }) => {
      const questions = region.locator("button[aria-expanded]")
      const shown = (await questions.allInnerTexts()).map((q) => q.trim())
      expect(shown.length).toBe(entries.length)
      for (const [i, entry] of entries.entries()) {
        expect(sameText(entry.question, shown[i]!), entry.question).toBe(true)
        const question = questions.nth(i)
        if ((await question.getAttribute("aria-expanded")) !== "true")
          await question.click()
        const panel = page.locator(
          `[id="${await question.getAttribute("aria-controls")}"]`
        )
        expect(
          sameText(entry.answer, await panel.innerText()),
          `answer to "${entry.question}"`
        ).toBe(true)
      }
    })
  })
})

describe("Form", () => {
  it("offers every field the spec lists, each labelled", async () => {
    await withBlock("Form", {}, async ({ region }) => {
      for (const label of [
        /^(your |full )?name/i,
        /email/i,
        /phone/i,
        /message/i,
        /property address/i,
        /date|arriv|check.?in/i,
      ]) {
        expect(
          await region.getByLabel(label).count(),
          String(label)
        ).toBeGreaterThan(0)
      }
    })
  })

  it("shows a success message on submit and stores nothing", async () => {
    await withBlock("Form", {}, async ({ page, region }) => {
      const before = page.url()
      const watched = watchWrites(page)
      await fillEveryField(region.locator("form").first())
      await region
        .getByRole("button", { name: /send|submit|request|enquire|contact/i })
        .first()
        .click()
      const success = region
        .getByRole("status")
        .or(region.getByText(/thank|received|sent|be in touch/i))
        .first()
      await success.waitFor({ state: "visible", timeout: 5000 })
      await settle(page)
      expect(page.url()).toBe(before)
      expect(watched.navigations).toEqual([])
      expect(watched.writes).toEqual([])
    })
  })
})
