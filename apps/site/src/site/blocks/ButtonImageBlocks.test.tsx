// @vitest-environment jsdom
import { cleanup, render, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { backgrounds, type Background } from "../../fields/background"
import type { ContainerBlock as ContainerBlockData } from "../../payload-types"
import { Block } from "."
import { samples } from "./samples"
import { sampleMedia } from "./samples/media"

afterEach(cleanup)

type Child = NonNullable<ContainerBlockData["children"]>[number]

/** `child` in a one-column Container on `background`. */
const onSurface = (child: Child, background: Background) =>
  render(
    <Block
      block={{
        blockType: "container",
        columns: "1",
        gap: "medium",
        align: "top",
        width: "page",
        background,
        children: [child],
      }}
      index={1}
    />
  ).container

describe("Button", () => {
  const button = samples.button

  it("renders from its sample: a region named by its label, holding the one link", () => {
    const { container } = render(<Block block={button} index={1} />)
    const section = container.querySelector("section")!
    expect(section.getAttribute("aria-label")).toBe(button.link!.label)
    const link = within(section).getByRole("link")
    expect(link.textContent).toBe(button.link!.label)
    expect(link.getAttribute("href")).toBe(button.link!.href)
  })

  it("renders nothing without a label, without a link, or with an unsafe one", () => {
    for (const link of [
      { label: " ", href: "/stays" },
      { label: "Go", href: "" },
      { label: "Go", href: "javascript:alert(1)" },
      undefined,
    ]) {
      const { container } = render(
        <Block block={{ ...button, link }} index={1} />
      )
      expect(container.innerHTML).toBe("")
      cleanup()
    }
  })

  it.each([
    ["start", "justify-start"],
    ["centre", "justify-center"],
    ["end", "justify-end"],
  ] as const)("aligned to the %s, sits there on its line", (align, name) => {
    const { container } = render(
      <Block block={{ ...button, align }} index={1} />
    )
    expect(container.querySelector("a")!.parentElement!.className).toContain(
      name
    )
  })

  const classOf = (style: (typeof button)["style"], background: Background) =>
    onSurface({ ...button, style }, background).querySelector("a")!.className

  it("Primary is the Theme's button on the page's surfaces, and the surface's text colour as its fill on a coloured one", () => {
    for (const background of ["default", "muted"] as const)
      expect(classOf("primary", background)).toContain("bg-(--btn-bg)")
    expect(classOf("primary", "primary")).toContain("bg-primary-foreground")
    expect(classOf("primary", "primary")).toContain("text-primary")
    expect(classOf("primary", "dark")).toContain("bg-surface-dark-foreground")
    expect(classOf("primary", "dark")).toContain("text-surface-dark")
    for (const background of ["primary", "dark"] as const)
      expect(classOf("primary", background)).not.toContain("bg-(--btn-bg)")
  })

  it.each(backgrounds)(
    "on the %s background, Accent is the accent button and Outline takes the surface's text colour",
    (background) => {
      const accent = classOf("accent", background)
      expect(accent).toContain("bg-accent")
      expect(accent).toContain("text-(--btn-accent-fg)")
      const outline = classOf("outline", background)
      expect(outline).toContain("border-current")
      expect(outline).toContain("bg-transparent")
      // Its edge is always there: a Solid Theme's button has none.
      expect(outline).not.toContain("--btn-border-width")
      // No colour of its own: it reads as the text around it does.
      expect(outline).not.toMatch(/(^| )text-(?!sm)/)
    }
  )

  it.each(["primary", "dark"] as const)(
    "on the %s background its focus ring is drawn for that surface",
    (background) => {
      const offset =
        background === "primary"
          ? "ring-offset-primary"
          : "ring-offset-surface-dark"
      for (const style of ["primary", "accent", "outline"] as const)
        expect(classOf(style, background)).toContain(offset)
    }
  )

  it("marks its label as editable in the Visual Editor", () => {
    const { container } = render(<Block block={button} index={1} editing />)
    const editable = container.querySelector("[data-editable-field]")!
    expect(editable.getAttribute("data-editable-field")).toBe("link.label")
  })
})

describe("Image", () => {
  const image = samples.image
  const media = sampleMedia(7, "terrace.svg", "A terrace in the evening sun")

  it("renders from its sample: a figure with the Media's alt text and the caption, rounded by the Theme's card radius", () => {
    const { container } = render(<Block block={image} index={1} />)
    const section = container.querySelector("section")!
    expect(section.getAttribute("aria-label")).toBe(image.caption)
    const figure = section.querySelector("figure")!
    const img = figure.querySelector("img")!
    expect(img.getAttribute("alt")).toBe("A terrace in the evening sun")
    expect(img.parentElement!.className).toContain("rounded-(--card-radius)")
    expect(img.parentElement!.className).toContain("overflow-hidden")
    expect(figure.querySelector("figcaption")!.textContent).toBe(image.caption)
  })

  it("without a caption has no figcaption, and is named by its alt text", () => {
    const { container } = render(
      <Block block={{ ...image, caption: " " }} index={1} />
    )
    expect(container.querySelector("figcaption")).toBeNull()
    expect(container.querySelector("section")!.getAttribute("aria-label")).toBe(
      "A terrace in the evening sun"
    )
  })

  it("renders nothing without an image, or with one that is only an id", () => {
    for (const value of [null, undefined, 7]) {
      const { container } = render(
        <Block block={{ ...image, image: value }} index={1} />
      )
      expect(container.innerHTML).toBe("")
      cleanup()
    }
  })

  it("in the Visual Editor without an image is a box of its shape that says to choose one, so it can be seen and selected", () => {
    for (const value of [null, 42]) {
      const { container } = render(
        <Block
          block={{ ...image, image: value, aspect: "1x1" }}
          index={1}
          editing
        />
      )
      const box = container.querySelector("[data-image-placeholder]")!
      expect(box.textContent).toBe("Choose an image for this Block.")
      expect(box.parentElement!.className).toContain("aspect-square")
      expect(container.querySelector("img")).toBeNull()
      cleanup()
    }
  })

  it.each([
    ["16x9", "aspect-video"],
    ["4x3", "aspect-4/3"],
    ["1x1", "aspect-square"],
  ] as const)("cropped to %s, fills a box of that shape", (aspect, name) => {
    const { container } = render(
      <Block block={{ ...image, aspect }} index={1} />
    )
    const img = container.querySelector("img")!
    expect(img.parentElement!.className).toContain(name)
    expect(img.className).toContain("object-cover")
  })

  it("at its original shape is as wide as its place and as tall as the image makes it", () => {
    const { container } = render(
      <Block
        block={{
          ...image,
          aspect: "original",
          image: { ...media, width: 1200, height: 900 },
        }}
        index={1}
      />
    )
    const img = container.querySelector("img")!
    expect(img.getAttribute("width")).toBe("1200")
    expect(img.getAttribute("height")).toBe("900")
    expect(img.className).toContain("w-full")
    expect(img.className).toContain("h-auto")
    expect(img.parentElement!.className).not.toContain("aspect-")
  })

  it("at its original shape with no known size falls back to 4:3", () => {
    const { container } = render(
      <Block block={{ ...image, aspect: "original", image: media }} index={1} />
    )
    expect(container.querySelector("img")!.parentElement!.className).toContain(
      "aspect-4/3"
    )
  })

  it("marks its caption as editable in the Visual Editor", () => {
    const { container } = render(<Block block={image} index={1} editing />)
    const editable = container.querySelector("[data-editable-field]")!
    expect(editable.getAttribute("data-editable-field")).toBe("caption")
  })
})
