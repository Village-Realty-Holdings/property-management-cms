// @vitest-environment jsdom
import { cleanup, render, within } from "@testing-library/react"
import axe from "axe-core"
import { afterEach, describe, expect, it } from "vitest"

import { backgrounds } from "../../fields/background"
import type { BlockOf } from "./types"
import { Block } from "."
import { IconList } from "./IconList"
import { sampleFor } from "./samples"

afterEach(cleanup)

/** WCAG 2.2 AA violations in `element` (colour contrast is left to the browser tests: jsdom has no layout). */
async function violations(element: HTMLElement) {
  const results = await axe.run(element, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
    },
    rules: { "color-contrast": { enabled: false } },
  })
  return results.violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.map((n) => n.html),
  }))
}

const features = (overrides: Partial<BlockOf<"features">> = {}) => ({
  ...sampleFor("features"),
  ...overrides,
})
const amenities = (overrides: Partial<BlockOf<"amenities">> = {}) => ({
  ...sampleFor("amenities"),
  ...overrides,
})
const imageText = (overrides: Partial<BlockOf<"imageText">> = {}) => ({
  ...sampleFor("imageText"),
  ...overrides,
})

const icons = (scope: HTMLElement) => scope.querySelectorAll("svg.lucide")

describe("IconList", () => {
  const context = { index: 1, editing: false }

  it("lists each item with its icon, and leaves out an item with no text", () => {
    const { container } = render(
      <IconList
        context={context}
        items={[
          { icon: "wifi", text: "Fast Wi-Fi", field: "items.0.label" },
          { icon: "car", text: "  ", field: "items.1.label" },
          { icon: "sun", text: "Terrace", field: "items.2.label" },
        ]}
      />
    )
    const items = within(container).getAllByRole("listitem")
    expect(items.map((li) => li.textContent)).toEqual(["Fast Wi-Fi", "Terrace"])
    expect(icons(container)).toHaveLength(2)
  })

  it("keeps the text of an item whose icon is unset or unknown, and draws no icon for it", () => {
    const { container } = render(
      <IconList
        context={context}
        items={[
          { icon: "removed-icon", text: "Still here", field: "a" },
          { icon: null, text: "Also here", field: "b" },
          { text: "And here", field: "c" },
        ]}
      />
    )
    expect(within(container).getAllByRole("listitem")).toHaveLength(3)
    expect(container.textContent).toContain("Still here")
    expect(icons(container)).toHaveLength(0)
    expect(container.querySelector("[aria-hidden]")).toBeNull()
  })

  it("renders nothing when it has no items to show", () => {
    const { container } = render(<IconList context={context} items={[]} />)
    expect(container.innerHTML).toBe("")
  })

  it("hides its icons from assistive technology", () => {
    const { container } = render(
      <IconList
        context={context}
        items={[{ icon: "wifi", text: "Fast Wi-Fi", field: "a" }]}
      />
    )
    for (const icon of icons(container)) {
      expect(icon.getAttribute("aria-hidden")).toBe("true")
    }
  })
})

describe("Features", () => {
  it("renders a grid of icon, title and text", () => {
    const { container } = render(<Block block={features()} index={1} />)
    const section = container.querySelector("section")!
    expect(within(section).getByRole("heading", { level: 2 }).textContent).toBe(
      "Why guests love staying with us"
    )
    const titles = within(section).getAllByRole("heading", { level: 3 })
    expect(titles.map((h) => h.textContent)).toEqual([
      "Spotless homes",
      "Great locations",
      "Real support",
      "Pets welcome",
      "Fast Wi-Fi",
      "Easy check-in",
    ])
    expect(icons(section)).toHaveLength(6)
    expect(section.textContent).toContain(
      "Cleaned and checked before every stay."
    )
    expect(section.textContent).toContain(
      "Small details that make a holiday feel easy."
    )
    expect(container.querySelector(".grid")).not.toBeNull()
  })

  it("keeps a feature whose icon name is unknown, without the icon", async () => {
    const block = features({
      features: [
        { icon: "sparkles", title: "Spotless", text: "Clean." },
        { icon: "no-such-icon", title: "Mystery", text: "Still shown." },
        { icon: "", title: "Plain", text: "No icon." },
      ],
    })
    const { container } = render(<Block block={block} index={1} />)
    expect(container.textContent).toContain("Mystery")
    expect(container.textContent).toContain("Still shown.")
    expect(container.textContent).toContain("Plain")
    expect(icons(container)).toHaveLength(1)
    expect(await violations(container)).toEqual([])
  })

  it("leaves out the intro when there is none, and a feature with no title and no text", () => {
    const block = features({
      intro: null,
      features: [
        { icon: "star", title: "Kept", text: "Yes." },
        { icon: "star", title: " ", text: " " },
      ],
    })
    const { container } = render(<Block block={block} index={1} />)
    expect(container.querySelectorAll("h3")).toHaveLength(1)
    expect(container.querySelectorAll("p")).toHaveLength(1)
  })

  it("renders nothing without a heading", () => {
    const { container } = render(
      <Block block={features({ heading: " " })} index={1} />
    )
    expect(container.innerHTML).toBe("")
  })

  it("marks its text as editable in the Visual Editor, by field path", () => {
    const { container } = render(<Block block={features()} index={2} editing />)
    const fields = [...container.querySelectorAll("[data-editable-field]")].map(
      (el) => el.getAttribute("data-editable-field")
    )
    expect(fields.slice(0, 2)).toEqual(["heading", "intro"])
    expect(fields).toContain("features.0.title")
    expect(fields).toContain("features.5.text")
  })

  it.each(backgrounds)(
    "passes axe on the %s background",
    async (background) => {
      const { container } = render(
        <Block block={features({ background })} index={1} />
      )
      expect(await violations(container)).toEqual([])
    }
  )
})

describe("Amenities", () => {
  it("as a mosaic: a tile for each item, with its photo and its label over a scrim", () => {
    const { container } = render(
      <Block block={amenities({ variant: "mosaic" })} index={1} />
    )
    const tiles = within(container).getAllByRole("listitem")
    expect(tiles).toHaveLength(5)
    expect(container.querySelectorAll("img")).toHaveLength(5)
    const first = tiles[0]!
    expect(first.textContent).toContain("Private pool")
    expect(first.querySelector("img")!.getAttribute("alt")).toBe(
      "A private pool at sunrise"
    )
    // The label sits on a scrim drawn from the Theme's dark surface.
    const scrim = [...first.querySelectorAll("*")].find((el) =>
      /from-surface-dark/.test(el.getAttribute("class") ?? "")
    )
    expect(scrim, "a scrim").toBeDefined()
    expect(scrim!.textContent).toContain("Private pool")
    expect(scrim!.className).toContain("text-surface-dark-foreground")
    // The mosaic draws the photos, not the icon list's icons.
    expect(icons(container)).toHaveLength(0)
  })

  it("as a mosaic: a tile without a photo is the dark surface with its icon and label", async () => {
    const block = amenities({
      variant: "mosaic",
      items: [
        { label: "Sauna", icon: "flame" },
        { label: "Garden", icon: "no-such-icon" },
        { label: "Bikes" },
      ],
    })
    const { container } = render(<Block block={block} index={1} />)
    expect(container.querySelectorAll("img")).toHaveLength(0)
    const tiles = within(container).getAllByRole("listitem")
    expect(tiles.map((t) => t.textContent)).toEqual([
      "Sauna",
      "Garden",
      "Bikes",
    ])
    expect(tiles[0]!.className).toContain("bg-surface-dark")
    expect(icons(tiles[0]!)).toHaveLength(1)
    expect(icons(tiles[1]!)).toHaveLength(0)
    expect(await violations(container)).toEqual([])
  })

  it("as an icon list: each item with its icon, no photos", () => {
    const { container } = render(
      <Block block={amenities({ variant: "icons" })} index={1} />
    )
    expect(within(container).getAllByRole("listitem")).toHaveLength(5)
    expect(icons(container)).toHaveLength(5)
    expect(container.querySelectorAll("img")).toHaveLength(0)
  })

  it("as an icon list: an unknown icon name degrades to text alone", async () => {
    const block = amenities({
      variant: "icons",
      items: [
        { label: "Wi-Fi", icon: "wifi" },
        { label: "Mystery", icon: "no-such-icon" },
        { label: "Plain" },
      ],
    })
    const { container } = render(<Block block={block} index={1} />)
    expect(within(container).getAllByRole("listitem")).toHaveLength(3)
    expect(icons(container)).toHaveLength(1)
    expect(await violations(container)).toEqual([])
  })

  it("the two variants look different", () => {
    const mosaic = render(
      <Block block={amenities({ variant: "mosaic" })} index={1} />
    ).container.innerHTML
    cleanup()
    const list = render(
      <Block block={amenities({ variant: "icons" })} index={1} />
    ).container.innerHTML
    expect(mosaic).not.toBe(list)
  })

  it("draws the mosaic for a variant it does not know", () => {
    const block = amenities({
      variant: "gone" as unknown as BlockOf<"amenities">["variant"],
    })
    const { container } = render(<Block block={block} index={1} />)
    expect(container.querySelectorAll("img").length).toBeGreaterThan(0)
  })

  it("renders its heading alone, without a list, when it has no items", () => {
    const { container } = render(
      <Block block={amenities({ items: [] })} index={1} />
    )
    expect(container.querySelector("h2")).not.toBeNull()
    expect(container.querySelector("ul")).toBeNull()
  })

  it.each(
    backgrounds.flatMap((background) =>
      (["mosaic", "icons"] as const).map(
        (variant) => [variant, background] as const
      )
    )
  )("as %s on the %s background passes axe", async (variant, background) => {
    const { container } = render(
      <Block block={amenities({ variant, background })} index={1} />
    )
    expect(await violations(container)).toEqual([])
  })

  it("marks the labels as editable in the Visual Editor, by field path", () => {
    for (const variant of ["mosaic", "icons"] as const) {
      const { container } = render(
        <Block block={amenities({ variant })} index={2} editing />
      )
      const fields = [
        ...container.querySelectorAll("[data-editable-field]"),
      ].map((el) => el.getAttribute("data-editable-field"))
      expect(fields, variant).toContain("items.0.label")
      expect(fields, variant).toContain("items.4.label")
      cleanup()
    }
  })
})

describe("Image + text", () => {
  it("renders the image with its caption, the text and the icon list", () => {
    const { container } = render(<Block block={imageText()} index={1} />)
    const figure = container.querySelector("figure")!
    expect(figure.querySelector("img")!.getAttribute("alt")).toBe(
      "A terrace in the evening sun"
    )
    expect(figure.querySelector("figcaption")!.textContent).toBe(
      "The terrace at Dune House, at sunset"
    )
    expect(container.querySelector("h2")!.textContent).toBe(
      "A home by the sea, looked after"
    )
    expect(container.textContent).toContain("Our team cleans, checks")
    const items = within(container).getAllByRole("listitem")
    expect(items.map((li) => li.textContent)).toEqual([
      "Professionally cleaned",
      "Self check-in",
      "Pets welcome",
    ])
    expect(icons(container)).toHaveLength(3)
  })

  it("puts the image on the left or the right from the tablet up, and above the text on a phone", () => {
    const left = render(
      <Block block={imageText({ imageSide: "left" })} index={1} />
    ).container
    expect(left.querySelector("figure")!.className).not.toMatch(/order-/)
    cleanup()
    const right = render(
      <Block block={imageText({ imageSide: "right" })} index={1} />
    ).container
    expect(right.querySelector("figure")!.className).toContain("md:order-last")
    // Stacked on mobile: the image comes first in the source, one column until md.
    const grid = right.querySelector("figure")!.parentElement!
    expect(grid.firstElementChild).toBe(right.querySelector("figure"))
    expect(grid.className).toContain("md:grid-cols-2")
    expect(grid.className).not.toMatch(/(^|\s)grid-cols-2/)
  })

  it("leaves out the caption, the icon list and the text when they are not set", async () => {
    const block = imageText({ caption: null, points: [], text: null })
    const { container } = render(<Block block={block} index={1} />)
    expect(container.querySelector("figcaption")).toBeNull()
    expect(container.querySelector("ul")).toBeNull()
    expect(container.querySelector("p")).toBeNull()
    expect(container.querySelector("figure img")).not.toBeNull()
    expect(await violations(container)).toEqual([])
  })

  it("has no figure, and the text takes the width, when there is no image", async () => {
    const block = imageText({ image: null })
    const { container } = render(<Block block={block} index={1} />)
    expect(container.querySelector("figure")).toBeNull()
    expect(container.querySelector("img")).toBeNull()
    expect(container.querySelector("h2")).not.toBeNull()
    expect(container.querySelector("figcaption")).toBeNull()
    expect(await violations(container)).toEqual([])
  })

  it("renders nothing without a heading", () => {
    const { container } = render(
      <Block block={imageText({ heading: "" })} index={1} />
    )
    expect(container.innerHTML).toBe("")
  })

  it("keeps a point whose icon name is unknown, without the icon", () => {
    const block = imageText({
      points: [
        { icon: "sparkles", text: "Clean" },
        { icon: "no-such-icon", text: "Mystery" },
      ],
    })
    const { container } = render(<Block block={block} index={1} />)
    expect(within(container).getAllByRole("listitem")).toHaveLength(2)
    expect(icons(container)).toHaveLength(1)
  })

  it.each(
    backgrounds.flatMap((background) =>
      (["left", "right"] as const).map((side) => [side, background] as const)
    )
  )(
    "image on the %s, on the %s background, passes axe",
    async (imageSide, background) => {
      const { container } = render(
        <Block block={imageText({ imageSide, background })} index={1} />
      )
      expect(await violations(container)).toEqual([])
    }
  )

  it("marks its heading, text, caption and points as editable in the Visual Editor", () => {
    const { container } = render(
      <Block block={imageText()} index={2} editing />
    )
    const fields = [...container.querySelectorAll("[data-editable-field]")].map(
      (el) => el.getAttribute("data-editable-field")
    )
    // The image, with its caption, comes first in the source: above the text on a phone.
    expect(fields).toEqual([
      "caption",
      "heading",
      "text",
      "points.0.text",
      "points.1.text",
      "points.2.text",
    ])
  })
})
