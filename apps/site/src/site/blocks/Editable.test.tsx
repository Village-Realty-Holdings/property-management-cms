// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { fixturesFor } from "../fixtures"
import { EditableText } from "./Editable"
import type { BlockContext } from "./types"

afterEach(cleanup)

const context = (overrides: Partial<BlockContext> = {}): BlockContext => ({
  index: 2,
  fixtures: fixturesFor(undefined),
  editing: false,
  ...overrides,
})

describe("<EditableText>", () => {
  it("is plain text on the Site", () => {
    const { container } = render(
      <EditableText as="h2" field="heading" context={context()}>
        Welcome
      </EditableText>
    )
    const heading = container.querySelector("h2")!
    expect(heading.textContent).toBe("Welcome")
    expect(heading.getAttributeNames()).toEqual([])
  })

  it("names its field and Block in the Visual Editor", () => {
    const { container } = render(
      <EditableText
        as="h2"
        field="heading"
        context={context({ editing: true })}
      >
        Welcome
      </EditableText>
    )
    const heading = container.querySelector("h2")!
    expect(heading.textContent).toBe("Welcome")
    expect(heading.getAttribute("data-editable-field")).toBe("heading")
    expect(heading.getAttribute("data-block-index")).toBe("2")
  })

  it("names nested fields by their path", () => {
    const { container } = render(
      <EditableText field="cta.label" context={context({ editing: true })}>
        Book
      </EditableText>
    )
    expect(
      container
        .querySelector("[data-editable-field]")!
        .getAttribute("data-editable-field")
    ).toBe("cta.label")
  })

  it("passes its element's other attributes through", () => {
    const { container } = render(
      <EditableText
        as="h1"
        field="heading"
        context={context()}
        id="block-0-heading"
        className="text-5xl"
      >
        Hi
      </EditableText>
    )
    const heading = container.querySelector("h1")!
    expect(heading.id).toBe("block-0-heading")
    expect(heading.className).toBe("text-5xl")
  })

  it("is a span unless told otherwise", () => {
    const { container } = render(
      <EditableText field="label" context={context()}>
        Go
      </EditableText>
    )
    expect(container.firstElementChild!.tagName).toBe("SPAN")
  })
})
