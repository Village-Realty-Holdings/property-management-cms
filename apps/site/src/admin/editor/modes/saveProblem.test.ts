import { describe, expect, it } from "vitest"

import type { PageDocument } from "../state"
import { fieldErrorFor, saveProblemLines } from "./saveProblem"

const doc: PageDocument = {
  kind: "page",
  title: "Home",
  path: "/",
  layout: { mode: "default" },
  blocks: [
    { id: "a", blockType: "hero", heading: "" } as never,
    { id: "b", blockType: "callToAction", heading: "" } as never,
    { id: "c", blockType: "searchHero" } as never,
  ],
  seo: { title: "", description: "", image: null },
}

describe("saveProblemLines", () => {
  it("says what went wrong when there are no fields to point at", () => {
    expect(saveProblemLines({ message: "Something went wrong." }, doc)).toEqual(
      ["Something went wrong."]
    )
  })

  it("names the Block and the field of each field error", () => {
    expect(
      saveProblemLines(
        {
          message: "Some fields need attention.",
          fieldErrors: {
            "blocks.0.heading": "This field is required.",
            "blocks.1.button.href": "Enter a link.",
            "blocks.2.heading": "Too short.",
          },
        },
        doc
      )
    ).toEqual([
      "Some fields need attention.",
      "Hero, heading: This field is required.",
      "Call to action, button href: Enter a link.",
      "Search hero, heading: Too short.",
    ])
  })

  it("names the Page's own fields", () => {
    expect(
      saveProblemLines(
        {
          message: "Some fields need attention.",
          fieldErrors: {
            path: "Another Page uses this path.",
            "seo.description": "Too long.",
          },
        },
        doc
      )
    ).toEqual([
      "Some fields need attention.",
      "Path: Another Page uses this path.",
      "SEO description: Too long.",
    ])
  })

  it("names a Block that is no longer there by its position", () => {
    expect(
      saveProblemLines(
        { message: "x", fieldErrors: { "blocks.9.heading": "Bad." } },
        doc
      )
    ).toEqual(["x", "Block 10, heading: Bad."])
  })
})

describe("fieldErrorFor", () => {
  it("reads the error of one field of the Page", () => {
    expect(
      fieldErrorFor(
        { message: "x", fieldErrors: { path: "Bad path." } },
        "path"
      )
    ).toBe("Bad path.")
    expect(fieldErrorFor({ message: "x" }, "path")).toBeUndefined()
    expect(fieldErrorFor(null, "path")).toBeUndefined()
  })
})
