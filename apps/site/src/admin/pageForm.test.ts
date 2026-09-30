import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { User } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { pageToValues, valuesToPageData, type PageValues } from "./pageForm"
import { fromMarkdown, toMarkdown } from "./richText"

let t: TestPayload
let staff: User & { collection: "users" }

beforeAll(async () => {
  t = await getTestPayload()
  const user = await t.payload.create({
    collection: "users",
    data: { email: "staff@awayday.test", entraOid: "staff" },
  })
  staff = { ...user, collection: "users" }
})

afterAll(() => t?.teardown())

const markdown = [
  "## Our story",
  "",
  "We built our **first cabin** in 1998.",
  "",
  "- Hot tubs",
  "- Wood stoves",
  "",
  "[Contact us](/contact)",
].join("\n")

const values: PageValues = {
  title: "About",
  path: "/about",
  blocks: [
    {
      blockType: "hero",
      heading: "About us",
      subheading: "",
      image: null,
      cta: { label: "Book", href: "/book" },
    },
    { blockType: "richText", markdown },
    {
      blockType: "callToAction",
      heading: "Ready?",
      body: "Call us.",
      button: { label: "Call", href: "tel:+15550100100" },
      style: "inverted",
    },
  ],
  seo: { title: "", description: "About Pine Lodge", image: null },
}

describe("the Admin's Page form", () => {
  it("saves form values as a Page and reads them back unchanged", async () => {
    const { payload } = t
    const data = await valuesToPageData(values, (md) =>
      fromMarkdown(payload, md)
    )
    const page = await payload.create({
      collection: "pages",
      data: { ...data, _status: "published" },
      overrideAccess: false,
      user: staff,
    })

    const back = await pageToValues(page, (content) =>
      toMarkdown(payload, content)
    )
    expect(back.title).toBe("About")
    expect(back.seo).toEqual({
      title: "",
      description: "About Pine Lodge",
      image: null,
    })
    expect(back.blocks.map((block) => block.blockType)).toEqual([
      "hero",
      "richText",
      "callToAction",
    ])
    expect(back.blocks[0]).toMatchObject({
      heading: "About us",
      cta: { label: "Book", href: "/book" },
    })
    expect(back.blocks[2]).toMatchObject({
      style: "inverted",
      button: { href: "tel:+15550100100" },
    })

    const text =
      back.blocks[1]!.blockType === "richText" ? back.blocks[1]!.markdown : ""
    expect(text).toContain("## Our story")
    expect(text).toContain("**first cabin**")
    expect(text).toMatch(/- Hot tubs/)
    expect(text).toContain("[Contact us](/contact)")
  })
})
