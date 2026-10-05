import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { User } from "../payload-types"
import { getTestPayload, type TestPayload } from "../test/getTestPayload"
import { HARBOUR } from "../theme/presets"
import { readLiveTheme } from "../theme/record"
import {
  applyKitAs,
  loadKitDefaults,
  reviewKitAs,
  type KitAnswers,
} from "./starterKits"

let t: TestPayload
let asUser: { overrideAccess: false; user: User & { collection: "users" } }

beforeAll(async () => {
  t = await getTestPayload()
  const user = await t.payload.create({
    collection: "users",
    data: { email: "staff@awayday.test", registryUserId: 368570 },
  })
  asUser = { overrideAccess: false, user: { ...user, collection: "users" } }
})

afterAll(async () => {
  await t?.teardown()
})

const answers = (over: Partial<KitAnswers> = {}): KitAnswers => ({
  kit: "tuck-in",
  brand: {
    name: "Pine Creek Lodge",
    tagline: "Cabins in the pines",
    logo: null,
    phone: "+1 555 010 0100",
    email: "",
  },
  seo: { titlePattern: "%s · {name}", description: "Cabins.", favicon: null },
  theme: "preset:harbour",
  details: { company: "Lakeside Stays" },
  ...over,
})

const pageAt = async (path: string) =>
  (
    await t.payload.find({
      collection: "pages",
      where: { path: { equals: path } },
      draft: true,
      depth: 0,
      ...asUser,
    })
  ).docs[0]

describe("a Starter Kit's form", () => {
  it("starts from the Site's Brand and SEO", async () => {
    expect(await loadKitDefaults(t.payload, asUser)).toEqual({
      brand: { name: "", tagline: "", logo: null, phone: "", email: "" },
      seo: { titlePattern: "%s · {name}", description: "", favicon: null },
    })
  })

  it("refuses answers that wouldn't save, and writes nothing", async () => {
    const bad = answers({
      brand: { ...answers().brand, name: " ", email: "not-an-email" },
      seo: { ...answers().seo, titlePattern: "no token" },
      theme: "preset:nope",
    })
    for (const run of [reviewKitAs, applyKitAs]) {
      const result = await run(t.payload, asUser, bad)
      expect(result).toMatchObject({
        ok: false,
        message: "Some answers need attention.",
        fieldErrors: {
          "brand.name": "Enter the Site name.",
          "brand.email": expect.any(String),
          "seo.titlePattern": expect.any(String),
          theme: "Choose a Theme.",
        },
      })
    }
    expect(
      (await applyKitAs(t.payload, asUser, answers({ kit: "nope" }))).message
    ).toBe("Choose a Starter Kit.")
    expect(await pageAt("/")).toBeUndefined()
    expect((await readLiveTheme(t.payload)).source).toBe("default")
  })
})

describe("the Tuck-in kit on a new Site", () => {
  it("reviews what it will do before doing it", async () => {
    const review = await reviewKitAs(t.payload, asUser, answers())
    expect(review).toEqual({
      ok: true,
      steps: [
        {
          kind: "Brand",
          text: "The Brand is saved as “Pine Creek Lodge”, on the Site straight away.",
        },
        { kind: "SEO", text: "The SEO defaults are saved." },
        {
          kind: "Theme",
          text: "The Theme “Harbour” replaces your Site's Theme straight away. The one you have now stays in the Theme's history.",
          warning: true,
        },
        { kind: "Layout", text: "“Tuck-in Layout” is added." },
        {
          kind: "Page",
          text: "The Page “Home” at the Site's root (/) is added as a Draft, for you to edit and publish.",
        },
      ],
    })
    expect(await pageAt("/")).toBeUndefined()
  })

  it("saves the Brand, SEO and Theme, and adds the Layout and the Home Page as a Draft", async () => {
    const result = await applyKitAs(t.payload, asUser, answers())
    expect(result.ok).toBe(true)
    expect(result.message).toBe("Your Site is set up from the Tuck-in kit.")
    expect(result.outcomes.map((o) => [o.kind, o.ok])).toEqual([
      ["Brand", true],
      ["SEO", true],
      ["Theme", true],
      ["Page", true],
    ])

    const brand = await t.payload.findGlobal({ slug: "brand", depth: 0 })
    expect(brand.name).toBe("Pine Creek Lodge")
    expect(brand.contact?.phone).toBe("+1 555 010 0100")
    const seo = await t.payload.findGlobal({ slug: "seo", depth: 0 })
    expect(seo.titlePattern).toBe("%s · {name}")
    expect((await readLiveTheme(t.payload)).inputs).toEqual(HARBOUR.inputs)

    const home = await pageAt("/")
    expect(home).toMatchObject({ title: "Home", _status: "draft" })
    expect(home?.isTemplate).toBeFalsy()
    const layout = await t.payload.findByID({
      collection: "layouts",
      id: (home!.layout as { layout: number }).layout,
      depth: 0,
      ...asUser,
    })
    expect(layout.name).toBe("Tuck-in Layout")
    expect(result.outcomes.at(-1)?.href).toBe(`/admin/pages/${home!.id}`)

    // The announcement names the company, the brand and its phone number.
    const words = JSON.stringify(home!.blocks)
    expect(words).toContain("Lakeside Stays Joins Pine Creek Lodge!")
    expect(words).toContain("Reach us at +1 555 010 0100.")
    expect(words).not.toContain("[Company]")
    expect(words).not.toContain("[Our Brand]")

    // Visitors don't see it until it is published.
    const live = await t.payload.find({
      collection: "pages",
      where: { path: { equals: "/" } },
      overrideAccess: false,
      user: null,
    })
    expect(live.docs).toEqual([])
  })
})

describe("a kit on a Site that already has content", () => {
  it("warns about what it replaces and never replaces a Page", async () => {
    const again = answers({
      kit: "rental-site",
      brand: { ...answers().brand, name: "Pine Creek Rentals" },
      theme: "preset:meadow",
    })
    const review = await reviewKitAs(t.payload, asUser, again)
    expect(review.ok && review.steps.filter((s) => s.warning)).toEqual([
      {
        kind: "Brand",
        text: "The Site's name changes from “Pine Creek Lodge” to “Pine Creek Rentals”, on the Site straight away.",
        warning: true,
      },
      expect.objectContaining({ kind: "Theme" }),
      {
        kind: "Page",
        text: "The Page “Home” at the Site's root (/) is not added: “Home” is already there, and stays as it is.",
        warning: true,
      },
    ])

    const before = await pageAt("/")
    const result = await applyKitAs(t.payload, asUser, again)
    expect(result.ok).toBe(true)
    expect(result.outcomes.at(-1)).toEqual({
      kind: "Page",
      ok: true,
      text: "The Page “Home” at the Site's root (/) was not added: “Home” is already there.",
    })
    const after = await pageAt("/")
    expect(after?.updatedAt).toBe(before?.updatedAt)
    expect(JSON.stringify(after?.blocks)).toContain("Lakeside Stays")
  })

  it("sees a Published Page at the path while its Draft tries another", async () => {
    const about = await t.payload.create({
      collection: "pages",
      data: { title: "Taken", path: "/taken", _status: "published" },
      ...asUser,
    })
    await t.payload.update({
      collection: "pages",
      id: about.id,
      data: { path: "/moved", _status: "draft" },
      draft: true,
      ...asUser,
    })
    const { STARTER_KITS } = await import("../starterKits")
    const kit = STARTER_KITS.find((k) => k.id === "rental-site")!
    const home = kit.pages[0]!
    const path = home.path
    home.path = "/taken"
    try {
      const review = await reviewKitAs(
        t.payload,
        asUser,
        answers({ kit: "rental-site", theme: "preset:meadow" })
      )
      expect(
        review.ok && review.steps.find((s) => s.kind === "Page")?.text
      ).toContain("is not added: “Taken” is already there")
    } finally {
      home.path = path
    }
  })

  it("leaves alone what the answers don't change", async () => {
    const live = (await readLiveTheme(t.payload)).savedAt
    const same = {
      ...(await loadKitDefaults(t.payload, asUser)),
      kit: "rental-site",
      theme: "preset:meadow",
      details: {},
    }
    const review = await reviewKitAs(t.payload, asUser, same)
    expect(review.ok && review.steps.slice(0, 3).map((s) => s.text)).toEqual([
      "The Brand stays as it is.",
      "SEO stays as it is.",
      "The Theme stays “Meadow”.",
    ])
    const result = await applyKitAs(t.payload, asUser, same)
    expect(result.outcomes.map((o) => o.kind)).toEqual(["Page"])
    expect((await readLiveTheme(t.payload)).savedAt).toBe(live)
  })
})

describe("a kit's placeholders", () => {
  it("stay in the text when an answer is left empty", async () => {
    await t.payload.delete({
      collection: "pages",
      where: { path: { equals: "/" } },
      ...asUser,
    })
    const result = await applyKitAs(
      t.payload,
      asUser,
      answers({
        brand: { ...answers().brand, name: "Pine Creek Rentals", phone: "" },
        theme: "preset:meadow",
        details: {},
      })
    )
    expect(result.ok).toBe(true)
    const words = JSON.stringify((await pageAt("/"))?.blocks)
    expect(words).toContain("[Company] Joins Pine Creek Rentals!")
    expect(words).toContain("Reach us at [phone number].")
  })
})
