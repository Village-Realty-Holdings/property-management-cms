// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { Icon, iconComponents } from "./Icon"
import { iconNames } from "./icons"

afterEach(cleanup)

describe("Icon", () => {
  it("has a component for every name on the list, and only those", () => {
    expect(Object.keys(iconComponents).sort()).toEqual([...iconNames].sort())
  })

  it.each(iconNames.map((name) => [name]))(
    "%s renders a decorative Lucide svg",
    (name) => {
      const { container } = render(<Icon name={name} />)
      const svg = container.querySelector("svg.lucide")
      expect(svg).not.toBeNull()
      expect(svg!.getAttribute("aria-hidden")).toBe("true")
    }
  )

  it("renders nothing for a name not on the list, or none", () => {
    expect(render(<Icon name="nope" />).container.innerHTML).toBe("")
    expect(render(<Icon name={null} />).container.innerHTML).toBe("")
    expect(render(<Icon name="constructor" />).container.innerHTML).toBe("")
  })

  it("passes a class name through", () => {
    const { container } = render(<Icon name="wifi" className="size-6" />)
    expect(container.querySelector("svg")!.getAttribute("class")).toContain(
      "size-6"
    )
  })
})
