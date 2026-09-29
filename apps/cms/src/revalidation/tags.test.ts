import type { CollectionSlug, Payload, PayloadRequest } from "payload"
import { describe, expect, it, vi } from "vitest"

import type { TagsFor } from "./hooks"
import { tagPresets } from "./tags"

/** Runs a preset as the hooks would, with a stub Payload. */
function tagsOf<T>(
  tagsFor: TagsFor<T>,
  doc: Partial<T>,
  previousDoc?: Partial<T>,
  payload: Partial<Payload> = {}
) {
  return tagsFor({
    doc: doc as T,
    previousDoc: previousDoc as T | undefined,
    collection: "properties" as CollectionSlug,
    operation: previousDoc ? "update" : "create",
    payload: payload as Payload,
    req: { payload } as PayloadRequest,
  })
}

describe("tagPresets", () => {
  it("properties: the Property, all Properties, Curated Lists and its Location", () => {
    expect(
      tagsOf(tagPresets.properties, { id: 1, slug: "cabin", location: 7 })
    ).toEqual(["property:cabin", "properties", "curated-lists", "location:7"])
  })

  it("properties: also the previous slug and Location", () => {
    expect(
      tagsOf(
        tagPresets.properties,
        { id: 1, slug: "new", location: { id: 8 } as never },
        { id: 1, slug: "old", location: 7 }
      )
    ).toEqual([
      "property:new",
      "property:old",
      "properties",
      "curated-lists",
      "location:8",
      "location:7",
    ])
  })

  it("properties: skips a missing slug or Location", () => {
    expect(
      tagsOf(tagPresets.properties, { id: 1, slug: null, location: null })
    ).toEqual(["properties", "curated-lists"])
  })

  it("locations: the Location, all Locations and all Properties", () => {
    expect(tagsOf(tagPresets.locations, { id: 3 })).toEqual([
      "location:3",
      "locations",
      "properties",
    ])
  })

  it("pages: the new and old path", () => {
    expect(
      tagsOf(tagPresets.pages, { id: 1, path: "/b" }, { id: 1, path: "/a" })
    ).toEqual(["page:/b", "page:/a", "pages"])
  })

  it("guides and curated lists: by slug", () => {
    expect(tagsOf(tagPresets.guides, { id: 1, slug: "ski" })).toEqual([
      "guide:ski",
      "guides",
    ])
    expect(
      tagsOf(tagPresets["curated-lists"], { id: 1, slug: "pets" })
    ).toEqual(["curated-list:pets", "curated-lists"])
  })

  it("collection-wide presets", () => {
    expect(tagsOf(tagPresets.specials, { id: 1 })).toEqual(["specials"])
    expect(tagsOf(tagPresets.sites, { id: 1 })).toEqual(["site-settings"])
    expect(tagsOf(tagPresets.amenities, { id: 1 })).toEqual([
      "properties",
      "site-settings",
    ])
    expect(tagsOf(tagPresets["property-types"], { id: 1 })).toEqual([
      "properties",
      "site-settings",
    ])
    expect(tagsOf(tagPresets.media, { id: 1 })).toEqual([])
  })

  it("sites: also Pages and Guides when a Variable's value changes", () => {
    const before = {
      id: 1,
      name: "Beach Bums",
      branding: { phone: "555 0100", primaryColor: "#123456" },
    }
    // Phone backs {phone}.
    expect(
      tagsOf(
        tagPresets.sites,
        { ...before, branding: { ...before.branding, phone: "555 0199" } },
        before
      )
    ).toEqual(["site-settings", "pages", "guides"])
    // A Custom Variable, and the Client's website ({client-url}).
    expect(
      tagsOf(
        tagPresets.sites,
        { ...before, customVariables: [{ key: "promo", value: "SUN" }] },
        before
      )
    ).toEqual(["site-settings", "pages", "guides"])
    expect(
      tagsOf(
        tagPresets.sites,
        { ...before, client: { website: "https://client.example/" } },
        before
      )
    ).toEqual(["site-settings", "pages", "guides"])
    // A colour isn't a Variable.
    expect(
      tagsOf(
        tagPresets.sites,
        {
          ...before,
          branding: { ...before.branding, primaryColor: "#654321" },
        },
        before
      )
    ).toEqual(["site-settings"])
  })

  it("reviews: the Property's page, populated or looked up", async () => {
    const findByID = vi
      .fn()
      .mockResolvedValue({ id: 5, slug: "looked-up", location: 9 })
    expect(
      await tagsOf(
        tagPresets.reviews,
        { id: 1, property: 5 },
        {
          id: 1,
          property: { id: 6, slug: "populated", location: { id: 3 } } as never,
        },
        { findByID } as unknown as Partial<Payload>
      )
    ).toEqual([
      "property:looked-up",
      "property:populated",
      "properties",
      "curated-lists",
      "location:9",
      "location:3",
    ])
    expect(findByID).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "properties", id: 5 })
    )
  })

  it("reviews: without a Property, only all Properties and Curated Lists", async () => {
    expect(await tagsOf(tagPresets.reviews, { id: 1, property: null })).toEqual(
      ["properties", "curated-lists"]
    )
  })
})
