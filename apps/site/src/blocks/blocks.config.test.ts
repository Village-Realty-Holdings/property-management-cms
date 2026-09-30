import type { Block, Field } from "payload"
import { describe, expect, it } from "vitest"

import { backgrounds } from "../fields/background"
import { iconNames } from "../site/blocks/icons"
import { CallToAction } from "./CallToAction"
import { pageBlocks } from "."

const bySlug = (slug: string): Block => {
  const block = pageBlocks.find((b) => b.slug === slug)
  if (!block) throw new Error(`no Block ${slug}`)
  return block
}

/** The field named `path` ("items.title" reaches into an array or group). */
function field(fields: Field[], path: string): Field {
  const [head, ...rest] = path.split(".")
  const found = fields
    .flatMap((f) => (f.type === "row" ? f.fields : [f]))
    .find((f) => "name" in f && f.name === head)
  if (!found) throw new Error(`no field ${head}`)
  if (rest.length === 0) return found
  if (!("fields" in found)) throw new Error(`${head} has no fields`)
  return field(found.fields, rest.join("."))
}

/** A field's config, loosely typed: the tests read options the union hides. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>

const loose = (fields: Field[], path: string) =>
  field(fields, path) as unknown as Loose

const isRequired = (fields: Field[], path: string) =>
  !!loose(fields, path).required

const optionValues = (config: Loose): string[] =>
  (config.options as Array<string | { value: string }>).map((o) =>
    typeof o === "string" ? o : o.value
  )

describe("the Page Blocks", () => {
  it("offers the Phase 4 schema Blocks, in the order of the spec's table", () => {
    const slugs = pageBlocks.map((b) => b.slug)
    const wanted = [
      "hero",
      "searchHero",
      "richText",
      "callToAction",
      "featuredRentals",
      "largeGroupRentals",
      "rentalGrid",
      "steps",
      "features",
      "amenities",
      "stats",
      "imageText",
      "testimonials",
      "trustStrip",
      "ownerBand",
      "newsletter",
      "blogTeaser",
      "location",
      "faq",
      "form",
    ]
    expect(slugs.filter((s) => wanted.includes(s))).toEqual(wanted)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it("names each one, with an interface for the generated types", () => {
    for (const block of pageBlocks) {
      expect(block.interfaceName, block.slug).toMatch(/Block$/)
      expect(block.labels, block.slug).toBeTruthy()
    }
  })
})

describe("Hero", () => {
  it("gains an eyebrow, an accent word and an optional fused trust strip", () => {
    const { fields } = bySlug("hero")
    expect(field(fields, "eyebrow").type).toBe("text")
    expect(field(fields, "accentWord").type).toBe("text")
    expect(isRequired(fields, "heading")).toBe(true)
    expect(field(fields, "trustStrip").type).toBe("array")
    expect(isRequired(fields, "trustStrip")).toBe(false)
    expect(isRequired(fields, "trustStrip.text")).toBe(true)
    expect(field(fields, "trustStrip.stat").type).toBe("text")
  })
})

describe("Search Hero", () => {
  it("is a Hero: eyebrow, heading, accent word, subheading, image", () => {
    const { fields } = bySlug("searchHero")
    for (const name of ["eyebrow", "accentWord", "subheading", "image"])
      expect(field(fields, name), name).toBeTruthy()
    expect(isRequired(fields, "heading")).toBe(true)
  })

  it("labels its button, and takes no background (it sits on its photo)", () => {
    const { fields } = bySlug("searchHero")
    expect(isRequired(fields, "searchLabel")).toBe(true)
    expect(loose(fields, "searchLabel").defaultValue).toBe("Search")
    expect(fields.some((f) => "name" in f && f.name === "background")).toBe(
      false
    )
  })
})

describe("Call to action", () => {
  it("offers a Dark surface style next to Primary, Secondary and Inverted", () => {
    const style = loose(CallToAction.fields, "style")
    expect(optionValues(style)).toEqual([
      "primary",
      "secondary",
      "inverted",
      "dark",
    ])
    expect(style.options.at(-1).label).toBe("Dark surface")
  })
})

describe.each([
  ["steps", "steps", 3, 4, ["title", "text"]],
  ["stats", "stats", 3, 4, ["value", "label"]],
] as const)("%s", (slug, list, min, max, required) => {
  it(`takes ${min} to ${max} ${list}, each with ${required.join(" and ")}`, () => {
    const { fields } = bySlug(slug)
    const array = loose(fields, list)
    expect(array.type).toBe("array")
    expect(array.minRows).toBe(min)
    expect(array.maxRows).toBe(max)
    expect(array.required).toBe(true)
    for (const name of required) {
      expect(isRequired(fields, `${list}.${name}`), name).toBe(true)
    }
  })

  it("starts with enough rows to be valid", () => {
    const array = loose(bySlug(slug).fields, list)
    expect(array.defaultValue.length).toBeGreaterThanOrEqual(min)
    expect(array.defaultValue.length).toBeLessThanOrEqual(max)
  })

  it("takes a background", () => {
    expect(field(bySlug(slug).fields, "background")).toBeTruthy()
  })
})

describe("Features", () => {
  it("is a grid of icon, title and text", () => {
    const { fields } = bySlug("features")
    const array = loose(fields, "features")
    expect(array.required).toBe(true)
    expect(array.minRows).toBeGreaterThanOrEqual(1)
    expect(array.maxRows).toBeGreaterThanOrEqual(6)
    expect(array.defaultValue.length).toBeGreaterThanOrEqual(array.minRows)
    expect(isRequired(fields, "features.title")).toBe(true)
    expect(isRequired(fields, "features.text")).toBe(true)
    expect(field(fields, "features.icon").type).toBe("text")
    expect(isRequired(fields, "features.icon")).toBe(true)
  })

  it("defaults to icons on the curated list", () => {
    const array = loose(bySlug("features").fields, "features")
    for (const row of array.defaultValue as Array<{ icon: string }>)
      expect(iconNames).toContain(row.icon)
  })
})

describe("Amenities", () => {
  it("is a photo-tile mosaic or an icon list, starting as an icon list", () => {
    const { fields } = bySlug("amenities")
    const variant = loose(fields, "variant")
    expect(optionValues(variant)).toEqual(["mosaic", "icons"])
    expect(variant.defaultValue).toBe("icons")
    expect(variant.required).toBe(true)
  })

  it("has items with a label, a photo for the mosaic and an icon for the list", () => {
    const { fields } = bySlug("amenities")
    const items = loose(fields, "items")
    expect(items.minRows).toBeGreaterThanOrEqual(3)
    expect(items.defaultValue.length).toBeGreaterThanOrEqual(items.minRows)
    expect(isRequired(fields, "items.label")).toBe(true)
    expect(loose(fields, "items.image").relationTo).toBe("media")
    expect(field(fields, "items.icon").type).toBe("text")
  })

  it("shows the photo only for the mosaic and the icon only for the list", () => {
    const { fields } = bySlug("amenities")
    const image = loose(fields, "items.image").admin.condition
    const icon = loose(fields, "items.icon").admin.condition
    const mosaic = { blockData: { variant: "mosaic" } }
    const icons = { blockData: { variant: "icons" } }
    expect(image({}, {}, mosaic)).toBe(true)
    expect(image({}, {}, icons)).toBe(false)
    expect(icon({}, {}, icons)).toBe(true)
    expect(icon({}, {}, mosaic)).toBe(false)
  })
})

describe("Image + text", () => {
  it("has an image on the left or right, text, an optional icon list and an optional caption", () => {
    const { fields } = bySlug("imageText")
    const side = loose(fields, "imageSide")
    expect(optionValues(side)).toEqual(["left", "right"])
    expect(side.defaultValue).toBe("left")
    expect(isRequired(fields, "heading")).toBe(true)
    expect(field(fields, "text").type).toBe("textarea")
    expect(loose(fields, "image").relationTo).toBe("media")
    expect(field(fields, "caption").type).toBe("text")
    expect(isRequired(fields, "caption")).toBe(false)
    const points = loose(fields, "points")
    expect(points.type).toBe("array")
    expect(points.required).toBeFalsy()
    expect(isRequired(fields, "points.text")).toBe(true)
    expect(field(fields, "points.icon").type).toBe("text")
    expect(field(fields, "background")).toBeTruthy()
  })
})

describe("Trust strip", () => {
  it("is text or stat items, or partner logos, starting with items", () => {
    const { fields } = bySlug("trustStrip")
    const variant = loose(fields, "variant")
    expect(optionValues(variant)).toEqual(["items", "logos"])
    expect(variant.defaultValue).toBe("items")
    expect(isRequired(fields, "items.text")).toBe(true)
    expect(field(fields, "items.stat").type).toBe("text")
    expect(isRequired(fields, "items.stat")).toBe(false)
    expect(isRequired(fields, "logos.name")).toBe(true)
    expect(loose(fields, "logos.image").relationTo).toBe("media")
    expect(isRequired(fields, "logos.image")).toBe(true)
    expect(field(fields, "background")).toBeTruthy()
  })

  it("starts its items with enough rows, and asks for at least two of either list", () => {
    const { fields } = bySlug("trustStrip")
    const items = loose(fields, "items")
    expect(items.required).toBe(true)
    expect(items.minRows).toBeGreaterThanOrEqual(2)
    expect(items.defaultValue.length).toBeGreaterThanOrEqual(items.minRows)
    expect(loose(fields, "logos").minRows).toBeGreaterThanOrEqual(2)
  })

  it("needs two logos only when it shows logos", () => {
    const { validate } = loose(bySlug("trustStrip").fields, "logos")
    const two = [{}, {}]
    expect(validate(undefined, { siblingData: { variant: "items" } })).toBe(
      true
    )
    expect(validate(undefined, { siblingData: { variant: "logos" } })).toMatch(
      /at least 2/
    )
    expect(validate([{}], { siblingData: { variant: "logos" } })).toMatch(
      /at least 2/
    )
    expect(validate(two, { siblingData: { variant: "logos" } })).toBe(true)
  })

  it("lists its items only for the items variant, logos only for logos", () => {
    const { fields } = bySlug("trustStrip")
    const items = loose(fields, "items").admin.condition
    const logos = loose(fields, "logos").admin.condition
    expect(items({ variant: "items" }, { variant: "items" })).toBe(true)
    expect(items({}, { variant: "logos" })).toBe(false)
    expect(logos({}, { variant: "logos" })).toBe(true)
    expect(logos({}, { variant: "items" })).toBe(false)
  })
})

describe("the background field on the new Blocks", () => {
  it("is the shared one", () => {
    for (const slug of [
      "steps",
      "features",
      "amenities",
      "stats",
      "imageText",
      "trustStrip",
      "featuredRentals",
      "largeGroupRentals",
      "rentalGrid",
      "testimonials",
      "ownerBand",
      "newsletter",
      "blogTeaser",
      "location",
      "faq",
      "form",
    ]) {
      const background = loose(bySlug(slug).fields, "background")
      expect(optionValues(background), slug).toEqual([...backgrounds])
    }
  })
})

describe("Featured rentals", () => {
  it("has a heading, a count of 1 to 12 starting at 3, and a carousel or grid layout starting as a grid", () => {
    const { fields } = bySlug("featuredRentals")
    expect(isRequired(fields, "heading")).toBe(true)
    const count = loose(fields, "count")
    expect(count.type).toBe("number")
    expect(count.required).toBe(true)
    expect(count.min).toBe(1)
    expect(count.max).toBe(12)
    expect(count.defaultValue).toBe(3)
    const variant = loose(fields, "variant")
    expect(optionValues(variant)).toEqual(["carousel", "grid"])
    expect(variant.defaultValue).toBe("grid")
    expect(variant.required).toBe(true)
  })
})

describe("Large-group rentals", () => {
  it("has a heading and a minimum sleeps of at least 2", () => {
    const { fields } = bySlug("largeGroupRentals")
    expect(isRequired(fields, "heading")).toBe(true)
    const minSleeps = loose(fields, "minSleeps")
    expect(minSleeps.type).toBe("number")
    expect(minSleeps.required).toBe(true)
    expect(minSleeps.min).toBeGreaterThanOrEqual(2)
    expect(minSleeps.defaultValue).toBeGreaterThanOrEqual(minSleeps.min)
  })
})

describe("Rental grid", () => {
  it("has a heading and a page size of 3 to 24 starting at 6", () => {
    const { fields } = bySlug("rentalGrid")
    expect(isRequired(fields, "heading")).toBe(true)
    const pageSize = loose(fields, "pageSize")
    expect(pageSize.type).toBe("number")
    expect(pageSize.required).toBe(true)
    expect(pageSize.min).toBe(3)
    expect(pageSize.max).toBe(24)
    expect(pageSize.defaultValue).toBe(6)
  })
})

describe("Testimonials", () => {
  it("has quotes with a name, a role line and a 1 to 5 star rating", () => {
    const { fields } = bySlug("testimonials")
    const quotes = loose(fields, "testimonials")
    expect(quotes.type).toBe("array")
    expect(quotes.required).toBe(true)
    expect(quotes.minRows).toBeGreaterThanOrEqual(2)
    expect(quotes.maxRows).toBeGreaterThanOrEqual(6)
    expect(quotes.defaultValue.length).toBeGreaterThanOrEqual(quotes.minRows)
    for (const name of ["quote", "name", "role", "rating"])
      expect(isRequired(fields, `testimonials.${name}`), name).toBe(true)
    expect(field(fields, "testimonials.quote").type).toBe("textarea")
    const rating = loose(fields, "testimonials.rating")
    expect(rating.type).toBe("number")
    expect(rating.min).toBe(1)
    expect(rating.max).toBe(5)
    expect(rating.defaultValue).toBe(5)
  })

  it("is a carousel or a grid, starting as a carousel", () => {
    const variant = loose(bySlug("testimonials").fields, "variant")
    expect(optionValues(variant)).toEqual(["carousel", "grid"])
    expect(variant.defaultValue).toBe("carousel")
    expect(variant.required).toBe(true)
  })

  it("starts its rows with ratings in range", () => {
    const quotes = loose(bySlug("testimonials").fields, "testimonials")
    for (const row of quotes.defaultValue as Array<{ rating: number }>) {
      expect(row.rating).toBeGreaterThanOrEqual(1)
      expect(row.rating).toBeLessThanOrEqual(5)
    }
  })
})

describe("Owner band", () => {
  it("has a pitch, a list of benefits and a call to action", () => {
    const { fields } = bySlug("ownerBand")
    expect(isRequired(fields, "heading")).toBe(true)
    expect(field(fields, "pitch").type).toBe("textarea")
    const benefits = loose(fields, "benefits")
    expect(benefits.required).toBe(true)
    expect(benefits.minRows).toBeGreaterThanOrEqual(2)
    expect(benefits.defaultValue.length).toBeGreaterThanOrEqual(
      benefits.minRows
    )
    expect(isRequired(fields, "benefits.text")).toBe(true)
    expect(field(fields, "cta.label").type).toBe("text")
    expect(field(fields, "cta.href").type).toBe("text")
  })

  it("sits on the Dark surface unless told otherwise", () => {
    const background = loose(bySlug("ownerBand").fields, "background")
    expect(background.defaultValue).toBe("dark")
  })
})

describe("Newsletter", () => {
  it("is offered on a Page, with its heading, text, placeholder and button label", () => {
    const { fields } = bySlug("newsletter")
    expect(isRequired(fields, "heading")).toBe(true)
    expect(field(fields, "text").type).toBe("textarea")
    expect(loose(fields, "emailPlaceholder").defaultValue).toBeTruthy()
    expect(isRequired(fields, "buttonLabel")).toBe(true)
  })
})

describe("Blog teaser", () => {
  it("has a heading and an optional link to all posts", () => {
    const { fields } = bySlug("blogTeaser")
    expect(isRequired(fields, "heading")).toBe(true)
    expect(field(fields, "allPostsLink.label").type).toBe("text")
    expect(field(fields, "allPostsLink.href").type).toBe("text")
    expect(isRequired(fields, "allPostsLink.href")).toBe(false)
  })
})

describe("Location", () => {
  it("has an address, text and a map card or a map image, starting as the card", () => {
    const { fields } = bySlug("location")
    expect(isRequired(fields, "heading")).toBe(true)
    expect(field(fields, "address").type).toBe("textarea")
    expect(isRequired(fields, "address")).toBe(true)
    expect(field(fields, "text").type).toBe("textarea")
    const map = loose(fields, "map")
    expect(optionValues(map)).toEqual(["card", "image"])
    expect(map.defaultValue).toBe("card")
    expect(loose(fields, "mapImage").relationTo).toBe("media")
  })

  it("shows the map image field, and asks for one, only for the image map", () => {
    const { fields } = bySlug("location")
    const image = loose(fields, "mapImage")
    expect(image.admin.condition({}, { map: "image" })).toBe(true)
    expect(image.admin.condition({}, { map: "card" })).toBe(false)
    expect(image.validate(undefined, { siblingData: { map: "card" } })).toBe(
      true
    )
    expect(
      image.validate(undefined, { siblingData: { map: "image" } })
    ).toMatch(/image/i)
    expect(image.validate(3, { siblingData: { map: "image" } })).toBe(true)
  })
})

describe("FAQ", () => {
  it("has question and answer pairs, each one required", () => {
    const { fields } = bySlug("faq")
    expect(isRequired(fields, "heading")).toBe(true)
    const questions = loose(fields, "questions")
    expect(questions.type).toBe("array")
    expect(questions.required).toBe(true)
    expect(questions.minRows).toBeGreaterThanOrEqual(2)
    expect(questions.defaultValue.length).toBeGreaterThanOrEqual(
      questions.minRows
    )
    expect(isRequired(fields, "questions.question")).toBe(true)
    expect(field(fields, "questions.answer").type).toBe("textarea")
    expect(isRequired(fields, "questions.answer")).toBe(true)
  })
})

describe("Form", () => {
  it("offers the spec's six fields to choose from, at least one picked", () => {
    const { fields } = bySlug("form")
    const chosen = loose(fields, "formFields")
    expect(chosen.type).toBe("select")
    expect(chosen.hasMany).toBe(true)
    expect(chosen.required).toBe(true)
    expect(optionValues(chosen)).toEqual([
      "name",
      "email",
      "phone",
      "message",
      "propertyAddress",
      "dates",
    ])
    expect(chosen.defaultValue.length).toBeGreaterThan(0)
    for (const value of chosen.defaultValue)
      expect(optionValues(chosen)).toContain(value)
  })

  it("has a heading, an intro, a submit label and a success message", () => {
    const { fields } = bySlug("form")
    expect(isRequired(fields, "heading")).toBe(true)
    expect(field(fields, "intro").type).toBe("textarea")
    expect(isRequired(fields, "submitLabel")).toBe(true)
    expect(loose(fields, "submitLabel").defaultValue).toBeTruthy()
    expect(isRequired(fields, "successMessage")).toBe(true)
    expect(loose(fields, "successMessage").defaultValue).toBeTruthy()
  })
})
