import { describe, expect, it } from "vitest"

import {
  brandToValues,
  brandValuesToData,
  emptyBrand,
  parseBrandValues,
} from "./brandForm"

const valid = {
  ...emptyBrand,
  name: "Warren Beach",
  tagline: "Sand between your toes",
  logo: 4,
  phone: "+1 555 010 0100",
  email: "hello@warren.test",
  address: "1 Beach Road",
  social: [{ platform: "instagram", url: "https://instagram.com/warren" }],
}

describe("parseBrandValues", () => {
  it("accepts a complete Brand and trims text", () => {
    const result = parseBrandValues({
      ...valid,
      name: "  Warren Beach ",
      phone: " +1 555 010 0100 ",
    })
    expect(result).toEqual({ ok: true, values: valid })
  })

  it("requires a Site name", () => {
    const result = parseBrandValues({ ...valid, name: "   " })
    expect(result).toEqual({
      ok: false,
      fieldErrors: { name: "Enter the Site name." },
    })
  })

  it("accepts a Brand with only the name", () => {
    const result = parseBrandValues({ ...emptyBrand, name: "Avada" })
    expect(result.ok).toBe(true)
  })

  it("rejects an email that is not an address", () => {
    const result = parseBrandValues({ ...valid, email: "not-an-email" })
    expect(result).toEqual({
      ok: false,
      fieldErrors: { "contact.email": "Enter a valid email address." },
    })
  })

  it("keys social link errors by row, so the form can show them at the field", () => {
    const result = parseBrandValues({
      ...valid,
      social: [
        { platform: "instagram", url: "https://instagram.com/ok" },
        { platform: "x", url: "javascript:alert(1)" },
        { platform: "facebook", url: "" },
        { platform: "myspace", url: "https://myspace.test" },
      ],
    })
    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        "social.1.url": "Enter an http(s) URL, like https://example.com.",
        "social.2.url": "Enter an http(s) URL, like https://example.com.",
        "social.3.platform": "Choose a platform.",
      },
    })
  })

  it("treats a malformed submission as an error, not a crash", () => {
    expect(parseBrandValues(null)).toMatchObject({ ok: false })
    expect(parseBrandValues("nope")).toMatchObject({ ok: false })
    expect(parseBrandValues({ name: 5, social: "x", logo: "7" })).toMatchObject(
      { ok: false }
    )
  })
})

describe("brand values and stored data", () => {
  it("round-trips through the stored shape", () => {
    const data = brandValuesToData(valid)
    expect(data).toEqual({
      name: "Warren Beach",
      tagline: "Sand between your toes",
      logo: 4,
      contact: {
        phone: "+1 555 010 0100",
        email: "hello@warren.test",
        address: "1 Beach Road",
      },
      social: [{ platform: "instagram", url: "https://instagram.com/warren" }],
    })
    expect(brandToValues({ id: 1, ...data })).toEqual(valid)
  })

  it("stores empty optional text as null and reads a missing Brand as empty", () => {
    expect(brandValuesToData({ ...emptyBrand, name: "A" })).toMatchObject({
      tagline: null,
      logo: null,
      contact: { phone: null, email: null, address: null },
      social: [],
    })
    expect(
      brandToValues({ id: 1, name: undefined as unknown as string })
    ).toEqual(emptyBrand)
  })

  it("reads a populated logo as its Media id", () => {
    const values = brandToValues({
      id: 1,
      name: "A",
      logo: { id: 9 } as never,
    })
    expect(values.logo).toBe(9)
  })
})
