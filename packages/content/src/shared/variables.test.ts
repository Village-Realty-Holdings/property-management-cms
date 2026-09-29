import { describe, expect, it } from "vitest"

import {
  builtInVariables,
  collectVariableIssues,
  findVariableIssues,
  resolveVariables,
  resolveVariablesDeep,
  validateVariableKey,
  variablesChanged,
  variableValuesFrom,
} from "./variables"

const site = {
  name: "Beach Bums",
  domain: "www.beachbums.example",
  client: {
    name: "Forever Vacation Rentals",
    website: "https://forever.example/",
  },
  branding: { phone: "(888) 575-2775", email: "", address: null },
  customVariables: [
    { key: "wifi-password", value: "sandcastle" },
    { key: "phone", value: "shadowed" },
    { key: "Bad Key", value: "ignored" },
  ],
}
const values = variableValuesFrom(site)

const text = (value: string) => ({ type: "text", text: value, format: 0 })
const richText = (...runs: string[]) => ({
  root: {
    type: "root",
    children: [{ type: "paragraph", children: runs.map(text) }],
  },
})

describe("variableValuesFrom", () => {
  it("has every built-in, empty when not set", () => {
    expect(Object.keys(values)).toEqual(
      expect.arrayContaining([...builtInVariables])
    )
    expect(values).toMatchObject({
      site: "Beach Bums",
      client: "Forever Vacation Rentals",
      "client-url": "https://forever.example/",
      phone: "(888) 575-2775",
      email: "",
      domain: "www.beachbums.example",
      address: "",
    })
  })

  it("adds Custom Variables, never over a built-in or with a bad key", () => {
    expect(values["wifi-password"]).toBe("sandcastle")
    expect(values.phone).toBe("(888) 575-2775")
    expect(values["Bad Key"]).toBeUndefined()
  })
})

describe("resolveVariables", () => {
  it("replaces built-ins and Custom Variables", () => {
    expect(resolveVariables("{site} Joins {client}!", values)).toBe(
      "Beach Bums Joins Forever Vacation Rentals!"
    )
    expect(resolveVariables("tel:{phone}", values)).toBe("tel:(888) 575-2775")
    expect(resolveVariables("Wi-Fi: {wifi-password}", values)).toBe(
      "Wi-Fi: sandcastle"
    )
  })

  it("renders an empty Variable as empty", () => {
    expect(resolveVariables("Email [{email}]", values)).toBe("Email []")
  })

  it("leaves unknown names as typed", () => {
    expect(resolveVariables("Mail {emial}", values)).toBe("Mail {emial}")
  })

  it("doesn't resolve a Variable split across text runs", () => {
    const doc = resolveVariablesDeep(richText("Call {ph", "one} now"), values)
    const runs = doc.root.children[0]!.children.map((run) => run.text)
    expect(runs).toEqual(["Call {ph", "one} now"])
  })

  it("resolves every string in Blocks and rich text, as a copy", () => {
    const page = {
      layout: [
        {
          blockType: "announcement",
          headline: "{site} Joins {client}!",
          cta: { label: "Visit {client}", href: "{client-url}" },
          intro: richText("Welcome to ", "{client}", "."),
        },
      ],
      seo: { title: "{site} | {client}", description: null },
    }
    const resolved = resolveVariablesDeep(page, values)
    expect(resolved.layout[0]!.headline).toBe(
      "Beach Bums Joins Forever Vacation Rentals!"
    )
    expect(resolved.layout[0]!.cta.href).toBe("https://forever.example/")
    expect(resolved.layout[0]!.intro.root.children[0]!.children[1]!.text).toBe(
      "Forever Vacation Rentals"
    )
    expect(resolved.seo).toEqual({
      title: "Beach Bums | Forever Vacation Rentals",
      description: null,
    })
    expect(page.layout[0]!.headline).toBe("{site} Joins {client}!")
  })
})

describe("findVariableIssues", () => {
  it("reports unknown names and empty values", () => {
    expect(findVariableIssues("{emial} or {email} or {site}", values)).toEqual([
      { kind: "unknown", name: "emial" },
      { kind: "empty", name: "email" },
    ])
  })

  it("reports braces that aren't a Variable as literal braces", () => {
    expect(findVariableIssues("Call {ph", values)).toEqual([
      { kind: "literalBraces", text: "Call {ph" },
    ])
    expect(findVariableIssues("no braces", values)).toEqual([])
  })
})

describe("collectVariableIssues", () => {
  it("gives each issue its field path; rich text reports its field", () => {
    const issues = collectVariableIssues(
      {
        layout: [
          { headline: "{site}", intro: richText("Hi {emial}", "{ph", "one}") },
        ],
        seo: { title: "{nope}" },
      },
      values
    )
    expect(issues).toEqual([
      { kind: "unknown", name: "emial", path: "layout.0.intro" },
      { kind: "literalBraces", text: "{ph", path: "layout.0.intro" },
      { kind: "literalBraces", text: "one}", path: "layout.0.intro" },
      { kind: "unknown", name: "nope", path: "seo.title" },
    ])
  })
})

describe("variables helpers", () => {
  it("validates Custom Variable keys", () => {
    expect(validateVariableKey("wifi-password")).toBe(true)
    expect(validateVariableKey("WiFi")).toMatch(/lowercase/)
    expect(validateVariableKey("phone")).toMatch(/built-in/)
    expect(validateVariableKey("promo", ["promo"])).toMatch(/already/)
  })

  it("tells when a Site Settings change touches a Variable", () => {
    expect(variablesChanged(values, variableValuesFrom(site))).toBe(false)
    expect(
      variablesChanged(
        values,
        variableValuesFrom({ ...site, branding: { phone: "555" } })
      )
    ).toBe(true)
  })
})
