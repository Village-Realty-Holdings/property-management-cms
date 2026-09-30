// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { BlockSection } from "./BlockSection"

afterEach(cleanup)

const sectionOf = (
  background?: Parameters<typeof BlockSection>[0]["background"]
) =>
  render(
    <BlockSection background={background} labelledBy="h">
      <h2 id="h">Hi</h2>
    </BlockSection>
  ).container.querySelector("section")!

describe("<BlockSection>", () => {
  it.each([
    ["default", "bg-background"],
    ["muted", "bg-muted"],
    ["primary", "bg-primary text-primary-foreground"],
    ["dark", "bg-surface-dark text-surface-dark-foreground"],
  ] as const)("the %s background is painted with %s", (background, classes) => {
    const section = sectionOf(background)
    for (const name of classes.split(" ")) {
      expect(section.className).toContain(name)
    }
  })

  it("sits on the default background when none is chosen, or an unknown one", () => {
    expect(sectionOf().className).toContain("bg-background")
    expect(sectionOf(null).className).toContain("bg-background")
    expect(sectionOf("neon" as unknown as "muted").className).toContain(
      "bg-background"
    )
  })

  it("pads with --section-y and holds its content at page width", () => {
    const section = sectionOf("muted")
    expect(section.className).toMatch(/\(--section-y\)/)
    expect(section.firstElementChild!.className).toContain("max-w-7xl")
  })

  it("is a region named by its heading, or by a label", () => {
    expect(sectionOf().getAttribute("aria-labelledby")).toBe("h")
    const { container } = render(
      <BlockSection label="Section 2">
        <p>Hello</p>
      </BlockSection>
    )
    expect(container.querySelector("section")!.getAttribute("aria-label")).toBe(
      "Section 2"
    )
  })
})
