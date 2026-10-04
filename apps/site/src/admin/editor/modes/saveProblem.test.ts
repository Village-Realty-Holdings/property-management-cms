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

  it("names a Block in a Container by its place from the Page down", () => {
    const nested: PageDocument = {
      ...doc,
      blocks: [
        { id: "a", blockType: "hero" } as never,
        {
          id: "c",
          blockType: "container",
          columns: "2",
          children: [
            { id: "x", blockType: "button" },
            {
              id: "s",
              blockType: "container",
              columns: "1",
              children: [{ id: "y", blockType: "callToAction" }],
            },
          ],
        } as never,
      ],
    }
    expect(
      saveProblemLines(
        {
          message: "Some fields need attention.",
          fieldErrors: {
            "blocks.1.children.0.link.href": "Enter a link.",
            "blocks.1.children.1.children.0.heading": "Too long.",
            "blocks.1.columns": "Choose one.",
            "blocks.1.children.5.heading": "Bad.",
          },
        },
        nested
      )
    ).toEqual([
      "Some fields need attention.",
      "Block 2, Container, Column 1, Button, link href: Enter a link.",
      "Block 2, Container, Column 2, Container, Block 1, Call to action, heading: Too long.",
      "Container, columns: Choose one.",
      "Block 2, Container, Column 6, heading: Bad.",
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
