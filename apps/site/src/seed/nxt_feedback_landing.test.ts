import type { Payload } from "payload"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { FetchLike } from "../fonts/googleFonts"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { CLASSIC } from "../theme"
import { readLiveTheme } from "../theme/record"
import { runSeed } from "./index"
import { seed as nxtFeedbackLanding } from "./nxt_feedback_landing"
import { createSeeder, seedUser } from "./upsert"

// Integration test: a real Payload on a throwaway database, a fake fetch
// standing in for Google Fonts.

/** The first bytes of a WOFF2 file, as Payload's type detection reads them. */
const WOFF2 = Buffer.from([0x77, 0x4f, 0x46, 0x32, 0x00, 0x01, 0x00, 0x00])

/** A fetch that serves any family's CSS and files, like Google does. */
const googleFetch: FetchLike = async (input) => {
  const url = String(input)
  if (url.startsWith("https://fonts.googleapis.com/css2")) {
    const family = /family=([^:&]+)/.exec(url)![1]!.replaceAll("+", " ")
    const weights = /wght@([\d;]+)/.exec(url)![1]!.split(";").map(Number)
    const slug = family.toLowerCase().replaceAll(" ", "")
    return new Response(
      weights
        .map(
          (weight) => `/* latin */
@font-face {
  font-family: '${family}';
  font-style: normal;
  font-weight: ${weight};
  src: url(https://fonts.gstatic.com/s/${slug}/v1/${slug}-${weight}.woff2) format('woff2');
}
`
        )
        .join("")
    )
  }
  const file = /-(\d+)\.woff2$/.exec(url)
  if (file) return new Response(Buffer.concat([WOFF2, Buffer.from(file[1]!)]))
  return new Response("Not found", { status: 404 })
}

let t: TestPayload
let payload: Payload

beforeAll(async () => {
  t = await getTestPayload()
  payload = t.payload
})

afterAll(async () => {
  try {
    // A Font the live Theme uses can't be deleted: put Classic back first.
    const seeder = createSeeder(payload, await seedUser(payload))
    await seeder.theme(CLASSIC.inputs)
    for (const collection of ["media", "fonts", "font-files"] as const) {
      await payload.delete({ collection, where: { id: { exists: true } } })
    }
  } finally {
    await t?.teardown()
  }
})

const run = () =>
  runSeed(payload, { module: nxtFeedbackLanding, fetch: googleFetch })

describe("the NXT feedback landing seed", () => {
  it("creates the Site: one Published Home Page with the Guest feedback survey, in NXT's look", async () => {
    await run()

    const brand = await payload.findGlobal({ slug: "brand", depth: 1 })
    expect(brand.name).toBe("NXT Vacation")
    expect(brand.contact?.phone).toBe("(619) 357-6854")
    expect(brand.logo).toMatchObject({ mimeType: "image/png" })

    const seo = await payload.findGlobal({ slug: "seo", depth: 0 })
    expect(seo).toMatchObject({
      titlePattern: "%s | {name}",
      allowIndexing: false,
    })
    expect(seo.favicon).toBeTruthy()

    const theme = await readLiveTheme(payload)
    expect(theme.inputs).toMatchObject({
      primary: "#0e1a24",
      accent: "#e9ea72",
      text: "#0e1a24",
      buttonCorners: "square",
      buttonLetters: "uppercase",
      buttonText: "auto",
    })
    expect(theme.inputs.headingFont).toMatch(/^font:\d+$/)
    expect(theme.inputs.bodyFont).toMatch(/^font:\d+$/)
    expect(theme.inputs.bodyFont).not.toBe(theme.inputs.headingFont)

    const pages = await payload.find({
      collection: "pages",
      overrideAccess: false,
      user: null,
      depth: 0,
    })
    expect(pages.docs.map((page) => [page.path, page.title])).toEqual([
      ["/", "How was your stay?"],
    ])
    expect(pages.docs[0]!.blocks).toMatchObject([
      {
        blockType: "guestSurvey",
        heading: "How was your stay with NXT?",
        background: "dark",
        reviewFrom: "4",
        phone: "(619) 357-6854",
        negative: {
          formFields: ["name", "email"],
          consentLabel: "It’s okay for NXT to contact me about this.",
        },
        thanks: { heading: "Thanks for staying with NXT." },
      },
    ])
  })

  it("wears a Layout with the logo in the centre above, and the copyright, privacy policy and phone number below", async () => {
    const { docs } = await payload.find({
      collection: "layouts",
      where: { isDefault: { equals: true } },
      depth: 0,
    })
    expect(docs).toHaveLength(1)
    expect(docs[0]!.header).toMatchObject([
      {
        blockType: "container",
        justify: "centre",
        children: [{ blockType: "logo", size: "xlarge" }],
      },
    ])
    expect(docs[0]!.footer).toMatchObject([
      {
        blockType: "container",
        justify: "centre",
        children: [
          {
            blockType: "legalBar",
            text: "© {year} {name}",
            links: [
              {
                label: "Privacy Policy",
                link: { url: "https://www.nxtvacation.com/privacy/" },
              },
              {
                label: "(619) 357-6854",
                link: { url: "tel:+16193576854" },
              },
            ],
          },
        ],
      },
    ])
  })

  it("changes nothing on a second run", async () => {
    const report = await run()
    expect(report.map((entry) => entry.action)).toEqual(
      report.map(() => "unchanged")
    )
  })
})
