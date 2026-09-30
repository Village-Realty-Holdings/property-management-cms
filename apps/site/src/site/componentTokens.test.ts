import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  classLiterals,
  compileUiCss,
  globalsCss,
  rootTokens,
} from "../test/uiCss"

const uiComponents = join(
  import.meta.dirname,
  "../../../../packages/ui/src/components"
)
const source = (name: string) =>
  readFileSync(join(uiComponents, `${name}.tsx`), "utf8")

/**
 * The component tokens (ADR-0004) and the values the Admin gets when no Theme
 * sets them. Each value reproduces what the components hardcoded before the
 * rewire, so the Admin looks as it did.
 */
const ADMIN_DEFAULTS: Record<string, string> = {
  "--btn-radius": "var(--radius)",
  "--btn-height": "2rem",
  "--btn-px": "0.625rem",
  "--btn-weight": "500",
  "--btn-transform": "none",
  "--btn-tracking": "normal",
  "--btn-shadow": "0 0 #0000",
  "--btn-lift": "0px",
  "--card-radius": "calc(var(--radius) * 1.4)",
  "--card-shadow": "0 0 #0000",
  "--input-radius": "var(--radius)",
  "--input-height": "2rem",
  "--input-px": "0.625rem",
  "--input-border-width": "1px",
  "--input-shadow": "0 0 #0000",
  "--section-y": "2.5rem",
}

describe("component tokens in globals.css", () => {
  it("defines an Admin default for every component token", () => {
    const tokens = rootTokens()
    for (const [name, value] of Object.entries(ADMIN_DEFAULTS)) {
      expect(tokens[name], name).toBe(value)
    }
  })

  it("documents every component token in the comment at the top", () => {
    const header = globalsCss.slice(0, globalsCss.indexOf("@import"))
    for (const name of Object.keys(ADMIN_DEFAULTS)) {
      expect(header, name).toContain(name)
    }
  })
})

describe("semantic tokens with a fallback", () => {
  it.each([
    ["text-link", "color: var(--link, var(--primary))"],
    [
      "bg-surface-dark",
      "background-color: var(--surface-dark, var(--foreground))",
    ],
    [
      "text-surface-dark-foreground",
      "color: var(--surface-dark-foreground, var(--background))",
    ],
    ["bg-third", "background-color: var(--third, var(--secondary))"],
    [
      "text-third-foreground",
      "color: var(--third-foreground, var(--secondary-foreground))",
    ],
    ["font-heading", "font-family: var(--font-display, var(--font-sans))"],
  ])(
    "%s reads its token, and falls back to the Admin's neutral one",
    async (utility, declaration) => {
      // Prettier wraps long var() fallbacks across lines in globals.css.
      const css = (await compileUiCss([utility]))
        .replace(/\s+/g, " ")
        .replace(/\( /g, "(")
        .replace(/ \)/g, ")")
      expect(css).toContain(declaration)
    }
  )
})

describe("classes that read component tokens", () => {
  it.each([
    ["h-(--btn-height)", "height: var(--btn-height)"],
    ["px-(--btn-px)", "padding-inline: var(--btn-px)"],
    ["rounded-(--btn-radius)", "border-radius: var(--btn-radius)"],
    ["font-(weight:--btn-weight)", "font-weight: var(--btn-weight)"],
    ["tracking-(--btn-tracking)", "letter-spacing: var(--btn-tracking)"],
    [
      "[text-transform:var(--btn-transform)]",
      "text-transform: var(--btn-transform)",
    ],
    ["shadow-(--btn-shadow)", "--tw-shadow: var(--btn-shadow)"],
    ["hover:-translate-y-(--btn-lift)", "calc(var(--btn-lift) * -1)"],
    ["rounded-(--card-radius)", "border-radius: var(--card-radius)"],
    ["shadow-(--card-shadow)", "--tw-shadow: var(--card-shadow)"],
    ["h-(--input-height)", "height: var(--input-height)"],
    ["rounded-(--input-radius)", "border-radius: var(--input-radius)"],
    ["px-(--input-px)", "padding-inline: var(--input-px)"],
    [
      "border-(length:--input-border-width)",
      "border-width: var(--input-border-width)",
    ],
    ["shadow-(--input-shadow)", "--tw-shadow: var(--input-shadow)"],
    ["py-(--section-y)", "padding-block: var(--section-y)"],
  ])("%s", async (utility, declaration) => {
    expect(await compileUiCss([utility])).toContain(declaration)
  })
})

describe("hover states", () => {
  it("derive from the token colours instead of an opacity", async () => {
    const button = source("button")
    expect(button).not.toMatch(/hover:bg-primary\/\d+/)
    const css = await compileUiCss(
      classLiterals(button).flatMap((s) => s.split(/\s+/))
    )
    expect(css).toContain(
      "color-mix(in srgb,var(--primary) 80%,var(--background))"
    )
    expect(css).toContain(
      "color-mix(in srgb,var(--accent) 80%,var(--background))"
    )
  })
})

const TOKENISED = ["button", "input", "textarea", "native-select"]

describe("packages/ui components hold no hardcoded look", () => {
  // Sizes, corners, padding, weight, shadow and transform of the components
  // that have component tokens. Tailwind's own scale classes are the bug.
  const hardcoded: [RegExp, string][] = [
    [/(?<![\w-])h-(6|7|8|9)(?![\w.])/, "a fixed height (h-N)"],
    [/(?<![\w-])size-(6|7|8|9)(?![\w.])/, "a fixed size (size-N) for a button"],
    [
      /(?<![\w-])rounded-(lg|xl|2xl|md|sm)(?![\w-])/,
      "a fixed corner (rounded-lg …)",
    ],
    [/(?<![\w-])rounded-\[min\(var\(--radius-md\)/, "a fixed small corner"],
    [
      /(?<![\w:-])font-(medium|semibold|bold|normal)(?![\w-])/,
      "a fixed font weight",
    ],
    [/(?<![\w-])px-(2|2\.5|3)(?![\w.])/, "fixed horizontal padding"],
    [/(?<![\w-])p[lr]-(1\.5|2|2\.5)(?![\w.])/, "fixed side padding"],
    [/(?<![\w-])shadow-(sm|md|lg|xs|xl)(?![\w-])/, "a fixed shadow"],
    [/hover:bg-primary\/\d+/, "an opacity hover"],
    [/hover:bg-secondary\/\d+/, "an opacity hover"],
    [/(?<!reduce:)hover:-?translate-y-(?![(0])/, "a fixed hover lift"],
  ]

  it.each(TOKENISED)("%s reads tokens", (name) => {
    const classes = classLiterals(source(name)).join(" ")
    for (const [pattern, what] of hardcoded) {
      // `file:h-6` and friends style the native file button, not the control.
      const scoped = classes
        .split(/\s+/)
        .filter((c) => !c.startsWith("file:"))
        .join(" ")
      expect(scoped, what).not.toMatch(pattern)
    }
  })

  it("has no component in the package hardcoding a card corner or shadow", () => {
    const dialog = classLiterals(source("alert-dialog")).join(" ")
    expect(dialog).not.toMatch(/(?<![\w-])rounded(-b)?-xl/)
    expect(dialog).toContain("rounded-(--card-radius)")
    expect(dialog).toContain("shadow-(--card-shadow)")
  })
})

describe("every token class in the components and Blocks is valid Tailwind", () => {
  // Tailwind drops a class it cannot parse without an error, so a typo would
  // silently leave the control unstyled.
  const escape = (c: string) => c.replace(/[^\w-]/g, "\\$&")
  const blocks = join(import.meta.dirname, "blocks")
  const files = [
    ...[
      "button",
      "badge",
      "input",
      "textarea",
      "native-select",
      "card",
      "alert-dialog",
    ].map((name) => join(uiComponents, `${name}.tsx`)),
    ...["CallToActionBlock.tsx", "HeroBlock.tsx", "types.ts"].map((name) =>
      join(blocks, name)
    ),
  ]

  it.each(files)("%s", async (file) => {
    const classes = classLiterals(readFileSync(file, "utf8"))
      .flatMap((literal) => literal.split(/\s+/))
      .filter((c) =>
        /--(btn|card|input|section-y)|surface-dark|(bg|text)-(accent|link|third)/.test(
          c
        )
      )
    expect(classes.length).toBeGreaterThan(0)
    const css = await compileUiCss(classes)
    for (const name of classes) {
      expect(css, name).toContain(`.${escape(name)}`)
    }
  })
})
