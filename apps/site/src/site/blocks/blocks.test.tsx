// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import type {
  CallToActionBlock as CallToActionData,
  HeroBlock as HeroData,
} from "../../payload-types"
import { Block } from "."
import { BlockButton } from "./BlockButton"

afterEach(cleanup)

const hero = (overrides: Partial<HeroData> = {}): HeroData => ({
  blockType: "hero",
  heading: "Welcome",
  subheading: "A place to stay",
  cta: { label: "Book", href: "/book" },
  ...overrides,
})

const cta = (overrides: Partial<CallToActionData> = {}): CallToActionData => ({
  blockType: "callToAction",
  heading: "Stay with us",
  body: "Rooms by the sea",
  button: { label: "Book now", href: "/book" },
  style: "primary",
  ...overrides,
})

const classesOf = (element: Element) =>
  [
    ...element.querySelectorAll("[class]"),
    ...(element.hasAttribute("class") ? [element] : []),
  ]
    .map((el) => el.getAttribute("class"))
    .join(" ")

describe("Blocks read tokens only", () => {
  it("the source has no raw colour, brand variable or fixed pill", () => {
    const dir = import.meta.dirname
    const files = readdirSync(dir).filter(
      (f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx")
    )
    expect(files.length).toBeGreaterThan(3)
    for (const file of files) {
      const text = readFileSync(join(dir, file), "utf8")
      expect(text, file).not.toMatch(/--brand-|brand[A-Z]/)
      expect(text, file).not.toMatch(
        /(?<![\w-])(bg|text|from|via|to|border)-(white|black|neutral|gray|slate|zinc)\b/
      )
      expect(text, file).not.toMatch(/#[0-9a-f]{3,6}\b|rgb\(|hsl\(|oklch\(/i)
      expect(text, file).not.toMatch(/rounded-(2xl|xl|lg|md)\b/)
    }
  })

  it("a Hero with no image is the primary colour with an accent glow", () => {
    const { container } = render(<Block block={hero()} index={0} />)
    const classes = classesOf(container)
    expect(classes).toContain("bg-primary")
    expect(classes).toContain("text-primary-foreground")
    expect(classes).toContain("bg-accent")
  })

  it.each(["primary", "secondary", "inverted"] as const)(
    "a Call to action (%s) keeps its text at full strength, so AA holds on every Theme",
    (style) => {
      // The Theme derives text colours to reach AA against their surface at
      // full opacity; fading them (opacity-85) can drop them below 4.5:1.
      const { container } = render(<Block block={cta({ style })} index={1} />)
      const body = container.querySelector("p")!
      expect(body.className).not.toMatch(/opacity-/)
    }
  )

  it("a Hero's section uses --section-y for its padding", () => {
    const { container } = render(<Block block={hero()} index={0} />)
    expect(classesOf(container)).toMatch(/\(--section-y\)/)
    expect(classesOf(container)).not.toMatch(
      /(?<![\w-])p[tby]-(1[0-9]|2[0-9])\b/
    )
  })

  it("a Hero with an image sits on the dark surface", () => {
    const { container } = render(
      <Block
        block={hero({
          image: {
            id: 1,
            url: "/media/hero.jpg",
            alt: "Sea",
            updatedAt: "",
            createdAt: "",
          },
        })}
        index={1}
      />
    )
    const classes = classesOf(container)
    expect(classes).toContain("bg-surface-dark")
    expect(classes).toContain("text-surface-dark-foreground")
    expect(classes).toContain("from-surface-dark/80")
  })

  it("a Call to action panel takes its corners and shadow from the card tokens", () => {
    const { container } = render(<Block block={cta()} index={1} />)
    const classes = classesOf(container)
    expect(classes).toContain("rounded-(--card-radius)")
    expect(classes).toContain("shadow-(--card-shadow)")
    expect(classes).toMatch(/\(--section-y\)/)
  })

  it.each([
    ["primary", "bg-primary text-primary-foreground"],
    ["secondary", "bg-secondary text-foreground"],
    ["inverted", "bg-accent text-accent-foreground"],
  ] as const)(
    "the %s Call to action colours come from semantic tokens",
    (style, expected) => {
      const { container } = render(<Block block={cta({ style })} index={1} />)
      expect(classesOf(container)).toContain(expected)
    }
  )

  it("rich text uses --section-y", () => {
    const { container } = render(
      <Block
        block={{
          blockType: "richText",
          content: {
            root: {
              type: "root",
              version: 1,
              direction: "ltr",
              format: "",
              indent: 0,
              children: [
                {
                  type: "paragraph",
                  version: 1,
                  direction: "ltr",
                  format: "",
                  indent: 0,
                  children: [
                    {
                      type: "text",
                      version: 1,
                      text: "Hello",
                      detail: 0,
                      format: 0,
                      mode: "normal",
                      style: "",
                    },
                  ],
                },
              ],
            },
          },
        }}
        index={2}
      />
    )
    expect(classesOf(container)).toMatch(/\(--section-y\)/)
  })
})

describe("<BlockButton>", () => {
  it("is a Button: it reads the button tokens for size, corners and type", () => {
    const { getByRole } = render(
      <BlockButton link={{ label: "Book", href: "/book" }} />
    )
    const link = getByRole("link", { name: "Book" })
    const classes = link.getAttribute("class") ?? ""
    expect(classes).toContain("rounded-(--btn-radius)")
    expect(classes).toContain("h-[calc(var(--btn-height)*1.125)]")
    expect(classes).toContain("font-(weight:--btn-weight)")
    expect(classes).toContain("hover:-translate-y-(--btn-lift)")
  })

  it("accent is the accent colour; primary is the primary colour", () => {
    const { getByRole } = render(
      <>
        <BlockButton link={{ label: "One", href: "/1" }} tone="accent" />
        <BlockButton
          link={{ label: "Two", href: "https://x.test" }}
          tone="primary"
        />
      </>
    )
    expect(getByRole("link", { name: "One" }).className).toContain(
      "bg-accent text-accent-foreground"
    )
    const two = getByRole("link", { name: "Two" })
    // The primary button is the Theme's button: solid or outline, by tokens.
    expect(two.className).toContain("bg-(--btn-bg) text-(--btn-fg)")
    expect(two.getAttribute("href")).toBe("https://x.test")
  })
})
