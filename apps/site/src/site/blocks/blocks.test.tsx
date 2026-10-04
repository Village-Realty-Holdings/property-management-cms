// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import axe from "axe-core"
import { afterEach, describe, expect, it } from "vitest"

import type {
  CallToActionBlock as CallToActionData,
  HeroBlock as HeroData,
} from "../../payload-types"
import { contrastRatio } from "../../theme/colour"
import { deriveTheme } from "../../theme/derive"
import { PRESETS } from "../../theme/presets"
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

  it.each(["primary", "secondary", "inverted", "dark"] as const)(
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
    ["dark", "bg-surface-dark text-surface-dark-foreground"],
  ] as const)(
    "the %s Call to action colours come from semantic tokens",
    (style, expected) => {
      const { container } = render(<Block block={cta({ style })} index={1} />)
      expect(classesOf(container)).toContain(expected)
    }
  )

  describe("rich text width", () => {
    const content = {
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
    } as never
    const text = (container: HTMLElement) =>
      container.querySelector("section > div > div")!

    it("sets the text at reading width unless it is wide", () => {
      const reading = render(
        <Block block={{ blockType: "richText", content }} index={1} />
      )
      expect(text(reading.container).className).toContain("max-w-prose")
      cleanup()

      const wide = render(
        <Block
          block={{ blockType: "richText", content, width: "wide" }}
          index={1}
        />
      )
      expect(text(wide.container).className).toContain("max-w-none")
      expect(text(wide.container).className).not.toContain("max-w-prose")
    })
  })

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
    const one = getByRole("link", { name: "One" })
    expect(one.className).toContain("bg-accent text-(--btn-accent-fg)")
    // The accent button is the emphasised CTA: it stays a fill whatever the
    // Buttons style is, because the Style control applies to primary buttons.
    expect(one.className).not.toMatch(/--btn-(bg|fg|border)/)
    const two = getByRole("link", { name: "Two" })
    // The primary button is the Theme's button: solid or outline, by tokens.
    expect(two.className).toContain("bg-(--btn-bg) text-(--btn-fg)")
    expect(two.getAttribute("href")).toBe("https://x.test")
  })

  it("onAccent is the primary button as drawn on the accent colour", () => {
    const { getByRole } = render(
      <BlockButton link={{ label: "Three", href: "/3" }} tone="onAccent" />
    )
    const three = getByRole("link", { name: "Three" })
    expect(three.className).toContain(
      "bg-(--btn-on-accent-bg) text-(--btn-on-accent-fg)"
    )
    expect(three.className).toContain("border-(--btn-on-accent-border-color)")
    expect(three.className).toContain("hover:bg-(--btn-on-accent-bg-hover)")
    expect(three.className).toContain("hover:text-(--btn-on-accent-fg-hover)")
    // Not the tokens for the page: an Outline label there is not readable here.
    expect(three.className).not.toMatch(/\(--btn-(bg|fg)(-hover)?\)/)
  })

  it.each([
    ["primary", "bg-accent", "bg-accent"],
    ["secondary", "bg-(--btn-bg)", "bg-(--btn-on-accent-bg)"],
    ["inverted", "bg-(--btn-on-accent-bg)", "bg-(--btn-bg)"],
  ] as const)(
    "a %s Call to action draws a button that reads on its panel",
    (style, expected, notExpected) => {
      const { getByRole } = render(<Block block={cta({ style })} index={1} />)
      const className = getByRole("link", { name: "Book now" }).className
      expect(className).toContain(expected)
      if (notExpected !== expected) expect(className).not.toContain(notExpected)
    }
  )
})

describe("focus rings on coloured panels", () => {
  // The Theme's --ring is the primary colour, so the default ring (--ring at
  // 50%) cannot be seen on a primary panel. A button on a coloured panel
  // draws its ring in the panel's own text colour, set off from the button by
  // a gap in the panel colour. Those pairs are derived to pass AA, so the
  // ring reaches 3:1 against the panel on every Theme.
  const ringOf = (className: string) =>
    className.split(/\s+/).filter((c) => c.startsWith("focus-visible:"))

  it.each([
    ["a Hero with no image", hero(), "primary", "primary-foreground"],
    [
      "a Hero with an image",
      hero({
        image: {
          id: 1,
          url: "/media/hero.jpg",
          alt: "Sea",
          updatedAt: "",
          createdAt: "",
        },
      }),
      "surface-dark",
      "surface-dark-foreground",
    ],
    ["a primary Call to action", cta(), "primary", "primary-foreground"],
    [
      "an inverted Call to action",
      cta({ style: "inverted" }),
      "accent",
      "accent-foreground",
    ],
    [
      "a dark Call to action",
      cta({ style: "dark" }),
      "surface-dark",
      "surface-dark-foreground",
    ],
  ] as const)(
    "the button in %s rings in the panel's text colour, offset by the panel colour",
    (_name, block, panel, foreground) => {
      const { getByRole } = render(<Block block={block} index={0} />)
      const focus = ringOf(
        getByRole("link", { name: /Book/ }).getAttribute("class")!
      )
      expect(focus).toContain(`focus-visible:ring-${foreground}`)
      expect(focus).toContain(`focus-visible:ring-offset-${panel}`)
      expect(focus).toContain("focus-visible:ring-offset-2")
      // The default ring (--ring at 50%) is gone, not merely outranked.
      expect(focus).not.toContain("focus-visible:ring-ring/50")
    }
  )

  it("a button on the page keeps the default ring", () => {
    const { getByRole } = render(
      <Block block={cta({ style: "secondary" })} index={0} />
    )
    const focus = ringOf(
      getByRole("link", { name: "Book now" }).getAttribute("class")!
    )
    expect(focus).toContain("focus-visible:ring-ring/50")
    expect(focus.some((c) => c.startsWith("focus-visible:ring-offset"))).toBe(
      false
    )
  })

  it("the onAccent button keeps its own edge when focused", () => {
    const { getByRole } = render(
      <Block block={cta({ style: "inverted" })} index={0} />
    )
    const focus = ringOf(
      getByRole("link", { name: "Book now" }).getAttribute("class")!
    )
    expect(focus).toContain(
      "focus-visible:border-(--btn-on-accent-border-color)"
    )
    expect(focus).not.toContain("focus-visible:border-ring")
  })
})

describe("a dark Call to action", () => {
  it("is the dark surface with an accent button, at full strength", () => {
    const { container, getByRole } = render(
      <Block block={cta({ style: "dark" })} index={1} />
    )
    const classes = classesOf(container)
    expect(classes).toContain("bg-surface-dark")
    expect(classes).toContain("text-surface-dark-foreground")
    const button = getByRole("link", { name: "Book now" }).getAttribute(
      "class"
    )!
    expect(button).toContain("bg-accent")
    expect(button).toContain("text-(--btn-accent-fg)")
  })

  it.each(["default", "muted", "primary", "dark"] as const)(
    "passes axe on the %s background",
    async (background) => {
      const { container } = render(
        <Block block={cta({ style: "dark", background })} index={1} />
      )
      const results = await axe.run(container, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
        },
        // jsdom has no layout: the contrast is checked against the tokens below.
        rules: { "color-contrast": { enabled: false } },
      })
      expect(results.violations.map((v) => v.id)).toEqual([])
    }
  )

  it.each(PRESETS.map((preset) => [preset.id, preset] as const))(
    "reads at AA on every Theme: its text, its button, its focus ring (%s)",
    (_id, preset) => {
      const t = deriveTheme(preset.inputs, {
        heading: "serif",
        body: "sans-serif",
      }).schemes.light
      const ratio = (fg: string, bg: string) => contrastRatio(t[fg]!, t[bg]!)
      // Text and the focus ring (the panel's own text colour) on the panel.
      expect(
        ratio("--surface-dark-foreground", "--surface-dark")
      ).toBeGreaterThanOrEqual(4.5)
      // The accent button's label, resting and hovered.
      expect(ratio("--accent-foreground", "--accent")).toBeGreaterThanOrEqual(
        4.5
      )
      expect(
        ratio("--accent-hover-foreground", "--accent-hover")
      ).toBeGreaterThanOrEqual(4.5)
    }
  )
})
