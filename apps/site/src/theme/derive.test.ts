import { describe, expect, it } from "vitest"

import { contrastRatio } from "./colour"
import { deriveTheme, type FontStacks, type TokenMap } from "./derive"
import type { ThemeInputs } from "./inputs"
import { DEFAULT_INPUTS, HARBOUR } from "./presets"

const fonts: FontStacks = {
  heading: '"Fraunces", Georgia, serif',
  body: '"Nunito Sans", system-ui, sans-serif',
}

/** Light tokens for Harbour with some controls changed. */
function tokens(over: Partial<ThemeInputs> = {}, stacks = fonts): TokenMap {
  return deriveTheme({ ...HARBOUR.inputs, ...over }, stacks).schemes.light
}

const AA = 4.5

describe("brand colours", () => {
  it("Primary sets --primary, with readable text on it", () => {
    const t = tokens({ primary: "#0e5e6f" })
    expect(t["--primary"]).toBe("#0e5e6f")
    expect(t["--primary-foreground"]).toBe("#ffffff")
    // A mid orange fails with white, so the ink is used instead.
    const orange = tokens({ primary: "#ea552a", text: "#1a1a1a" })
    expect(orange["--primary-foreground"]).toBe("#1a1a1a")
    // ...and black when the ink is not dark enough either.
    const paler = tokens({ primary: "#ea552a", text: "#072629" })
    expect(paler["--primary-foreground"]).toBe("#000000")
  })

  it("Accent sets --accent, with readable text on it", () => {
    const t = tokens({ accent: "#ff7f5c", text: "#10323a" })
    expect(t["--accent"]).toBe("#ff7f5c")
    expect(t["--accent-foreground"]).toBe("#10323a")
  })

  it("Third sets --third; when unset it follows Primary", () => {
    const set = tokens({ third: "#f2e3c9", text: "#10323a" })
    expect(set["--third"]).toBe("#f2e3c9")
    expect(set["--third-foreground"]).toBe("#10323a")
    const unset = tokens({ third: null, primary: "#0e5e6f" })
    expect(unset["--third"]).toBe("#0e5e6f")
    expect(unset["--third-foreground"]).toBe("#ffffff")
  })

  it("Text sets the ink for foreground, card and popover text", () => {
    const t = tokens({ text: "#1f1646" })
    for (const name of [
      "--foreground",
      "--card-foreground",
      "--popover-foreground",
      "--secondary-foreground",
    ])
      expect(t[name]).toBe("#1f1646")
  })

  it("Dark surface is used as given, with readable text", () => {
    const t = tokens({ darkSurface: "#0b2a31" })
    expect(t["--surface-dark"]).toBe("#0b2a31")
    expect(t["--surface-dark-foreground"]).toBe("#ffffff")
  })

  it("Dark surface defaults from the ink, and is dark whatever the ink", () => {
    const t = tokens({ darkSurface: null, text: "#1f1646" })
    expect(t["--surface-dark"]).not.toBe("#1f1646")
    expect(
      contrastRatio(t["--surface-dark"]!, "#ffffff")
    ).toBeGreaterThanOrEqual(7)
    // Even a pale ink gives a dark band.
    const pale = tokens({ darkSurface: null, text: "#cccccc" })
    expect(
      contrastRatio(pale["--surface-dark"]!, "#ffffff")
    ).toBeGreaterThanOrEqual(7)
  })
})

describe("neutral tint", () => {
  const surface = (neutralTint: ThemeInputs["neutralTint"]) =>
    tokens({ neutralTint, primary: "#283d6b" })["--background"]!
  const rgb = (hex: string) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

  it("Neutral gives equal channels", () => {
    expect(surface("neutral")).toBe("#fbfbfb")
  })
  it("Warm leans red, Cool leans blue", () => {
    const [wr, , wb] = rgb(surface("warm"))
    const [cr, , cb] = rgb(surface("cool"))
    expect(wr!).toBeGreaterThan(wb!)
    expect(cb!).toBeGreaterThan(cr!)
  })
  it("Brand leans towards the primary colour", () => {
    const [r, , b] = rgb(surface("brand"))
    expect(b!).toBeGreaterThan(r!)
    expect(surface("brand")).not.toBe(surface("neutral"))
  })
  it("also tints the muted surface and the border", () => {
    const neutral = tokens({ neutralTint: "neutral" })
    const warm = tokens({ neutralTint: "warm" })
    expect(warm["--muted"]).not.toBe(neutral["--muted"])
    expect(warm["--border"]).not.toBe(neutral["--border"])
  })
})

describe("fonts", () => {
  it("puts the body stack in --font-sans and the heading stack in --font-display", () => {
    const t = tokens()
    expect(t["--font-sans"]).toBe(fonts.body)
    expect(t["--font-display"]).toBe(fonts.heading)
  })
  it("falls back to system fonts when a stack is missing", () => {
    const t = tokens({}, { heading: "", body: "  " })
    expect(t["--font-sans"]).toContain("system-ui")
    expect(t["--font-display"]).toContain("system-ui")
  })
})

describe("type", () => {
  it.each([
    ["regular", "400"],
    ["medium", "500"],
    ["bold", "700"],
    ["black", "900"],
  ] as const)(
    "Heading weight %s -> --display-weight %s",
    (headingWeight, w) => {
      expect(tokens({ headingWeight })["--display-weight"]).toBe(w)
    }
  )

  it("Heading case sets --display-transform and opens the tracking for capitals", () => {
    const normal = tokens({ headingCase: "normal" })
    const upper = tokens({ headingCase: "uppercase" })
    expect(normal["--display-transform"]).toBe("none")
    expect(upper["--display-transform"]).toBe("uppercase")
    expect(normal["--display-tracking"]).toMatch(/^-/)
    expect(upper["--display-tracking"]).toBe("0.04em")
  })
})

describe("corners", () => {
  it.each([
    ["square", "0px"],
    ["soft", "8px"],
    ["rounded", "12px"],
    ["pill", "9999px"],
  ] as const)("Button corners %s -> --btn-radius %s", (buttonCorners, r) => {
    expect(tokens({ buttonCorners })["--btn-radius"]).toBe(r)
  })

  it.each([
    ["square", "0px", "0px"],
    ["soft", "8px", "6px"],
    ["rounded", "16px", "10px"],
  ] as const)(
    "Card corners %s -> --card-radius %s and --radius %s",
    (cardCorners, card, radius) => {
      const t = tokens({ cardCorners })
      expect(t["--card-radius"]).toBe(card)
      expect(t["--radius"]).toBe(radius)
      expect(t["--input-radius"]).toBe(radius)
    }
  )

  it("do not affect each other", () => {
    expect(
      tokens({ buttonCorners: "pill", cardCorners: "square" })
    ).toMatchObject({
      "--btn-radius": "9999px",
      "--card-radius": "0px",
    })
  })
})

describe("spacing", () => {
  it.each([
    ["compact", "2.25rem", "1rem", "2.5rem"],
    ["comfortable", "2.75rem", "1.5rem", "4rem"],
    ["spacious", "3.125rem", "1.75rem", "6rem"],
  ] as const)("%s", (spacing, height, px, section) => {
    const t = tokens({ spacing })
    expect(t["--btn-height"]).toBe(height)
    expect(t["--input-height"]).toBe(height)
    expect(t["--btn-px"]).toBe(px)
    expect(t["--section-y"]).toBe(section)
  })
})

describe("shadows", () => {
  it("None removes every shadow, as a full box-shadow value", () => {
    // Not the keyword "none": Tailwind lists a component's shadow next to the
    // focus ring in one box-shadow, and a "none" in that list makes the whole
    // declaration invalid, which would drop the ring (WCAG 2.4.7).
    const t = tokens({ shadows: "none" })
    for (const name of [
      "--shadow-sm",
      "--shadow-md",
      "--card-shadow",
      "--sheet-shadow",
      "--btn-shadow",
    ])
      expect(t[name]).toBe("0 0 #0000")
  })
  it("a sheet floats above the page, so it follows the Shadows control", () => {
    const subtle = tokens({ shadows: "subtle" })["--sheet-shadow"]
    const lifted = tokens({ shadows: "lifted" })["--sheet-shadow"]
    expect(subtle).toBe("0 4px 15px 0 rgb(0 0 0 / 0.1)")
    expect(lifted).toBe("0 16px 40px -8px rgb(0 0 0 / 0.24)")
    expect(subtle).not.toBe(lifted)
  })
  it("Subtle is soft and Lifted is deeper", () => {
    const subtle = tokens({ shadows: "subtle" })
    const lifted = tokens({ shadows: "lifted" })
    expect(subtle["--card-shadow"]).toBe("0 1px 8px 0 rgb(0 0 0 / 0.07)")
    expect(lifted["--card-shadow"]).toBe("0 8px 24px -4px rgb(0 0 0 / 0.18)")
    expect(subtle["--btn-shadow"]).not.toBe("0 0 #0000")
  })
  it("outline buttons never carry a shadow", () => {
    expect(
      tokens({ shadows: "lifted", buttonStyle: "outline" })["--btn-shadow"]
    ).toBe("0 0 #0000")
  })
})

describe("buttons", () => {
  it("Solid fills with the primary colour", () => {
    const t = tokens({ buttonStyle: "solid", primary: "#0e5e6f" })
    expect(t["--btn-bg"]).toBe("#0e5e6f")
    expect(t["--btn-fg"]).toBe("#ffffff")
    expect(t["--btn-border-width"]).toBe("0px")
  })

  it("Outline shows the primary colour as an edge, with link-safe text, and fills on hover", () => {
    const t = tokens({ buttonStyle: "outline", primary: "#ce4b25" })
    expect(t["--btn-bg"]).toBe("transparent")
    expect(t["--btn-border-color"]).toBe("#ce4b25")
    expect(t["--btn-border-width"]).toBe("2px")
    expect(t["--btn-fg"]).toBe(t["--link"])
    expect(t["--btn-bg-hover"]).toBe("#ce4b25")
    expect(t["--btn-fg-hover"]).toBe(t["--primary-foreground"])
  })

  it("the accent button's hover fill keeps AA text, on a dark accent too", () => {
    for (const accent of ["#b45309", "#6b5b00", "#fcd900", "#009dd6"]) {
      const t = tokens({ accent })
      expect(t["--accent-hover"], accent).toMatch(/^#[0-9a-f]{6}$/)
      expect(
        contrastRatio(t["--accent-hover-foreground"]!, t["--accent-hover"]!),
        accent
      ).toBeGreaterThanOrEqual(AA)
    }
  })

  it("the accent button's hover moves away from its text", () => {
    const dark = tokens({ accent: "#b45309" })
    expect(dark["--accent-foreground"]).toBe("#ffffff")
    expect(contrastRatio(dark["--accent-hover"]!, "#ffffff")).toBeGreaterThan(
      contrastRatio(dark["--accent"]!, "#ffffff")
    )
  })

  describe("on the accent panel", () => {
    it("Solid is the primary button as it is everywhere", () => {
      const t = tokens({ buttonStyle: "solid" })
      expect(t["--btn-on-accent-bg"]).toBe(t["--btn-bg"])
      expect(t["--btn-on-accent-fg"]).toBe(t["--btn-fg"])
      expect(t["--btn-on-accent-border-color"]).toBe(t["--btn-border-color"])
      expect(t["--btn-on-accent-bg-hover"]).toBe(t["--btn-bg-hover"])
      expect(t["--btn-on-accent-fg-hover"]).toBe(t["--btn-fg-hover"])
    })

    it("Outline is drawn in the panel's own text colour, not the link colour", () => {
      const t = tokens({ buttonStyle: "outline", accent: "#b45309" })
      expect(t["--btn-on-accent-bg"]).toBe("transparent")
      expect(t["--btn-on-accent-fg"]).toBe(t["--accent-foreground"])
      expect(t["--btn-on-accent-border-color"]).toBe(t["--accent-foreground"])
      expect(t["--btn-on-accent-bg-hover"]).toBe(t["--accent-foreground"])
      expect(t["--btn-on-accent-fg-hover"]).toBe(t["--accent"])
    })

    it.each(["#b45309", "#009dd6", "#fcd900", "#ffffff", "#000000"])(
      "Outline label, edge and hover pass AA on accent %s",
      (accent) => {
        const t = tokens({ buttonStyle: "outline", accent })
        const on = (name: string, surface: string) =>
          contrastRatio(t[name]!, surface)
        expect(on("--btn-on-accent-fg", accent)).toBeGreaterThanOrEqual(AA)
        expect(
          on("--btn-on-accent-border-color", accent)
        ).toBeGreaterThanOrEqual(3)
        expect(
          on("--btn-on-accent-fg-hover", t["--btn-on-accent-bg-hover"]!)
        ).toBeGreaterThanOrEqual(AA)
      }
    )
  })

  it.each([
    ["normal", "none", "0em"],
    ["uppercase", "uppercase", "0.06em"],
    ["title", "capitalize", "0em"],
  ] as const)("Letters %s", (buttonLetters, transform, tracking) => {
    const t = tokens({ buttonLetters })
    expect(t["--btn-transform"]).toBe(transform)
    expect(t["--btn-tracking"]).toBe(tracking)
  })

  it.each([
    ["regular", "400"],
    ["medium", "500"],
    ["bold", "700"],
  ] as const)("Weight %s -> --btn-weight %s", (buttonWeight, w) => {
    expect(tokens({ buttonWeight })["--btn-weight"]).toBe(w)
  })
})

describe("motion", () => {
  it.each([
    ["none", "0ms", "0px"],
    ["subtle", "180ms", "-1px"],
    ["lively", "300ms", "-3px"],
  ] as const)("%s", (motion, duration, lift) => {
    const t = tokens({ motion })
    expect(t["--duration"]).toBe(duration)
    expect(t["--btn-lift"]).toBe(lift)
  })

  it("has a reduced-motion override that stops movement and animation", () => {
    for (const motion of ["none", "subtle", "lively"] as const) {
      const { reducedMotion } = deriveTheme(
        { ...HARBOUR.inputs, motion },
        fonts
      )
      expect(reducedMotion).toEqual({
        "--duration": "0ms",
        "--btn-lift": "0px",
      })
    }
  })
})

describe("text-bearing colours pass AA on their surface", () => {
  const cases: Partial<ThemeInputs>[] = [
    { primary: "#ce4b25" },
    { primary: "#fcd900", accent: "#fcd900" },
    { primary: "#f0f0f0", neutralTint: "brand" },
    { primary: "#000000", neutralTint: "brand" },
    { primary: "#7a7a7a", accent: "#909090", third: "#aaaaaa" },
    { buttonStyle: "outline", primary: "#ff9900" },
  ]

  it.each(cases)("%j", (over) => {
    const t = tokens(over)
    const pairs: [string, string][] = [
      ["--primary-foreground", "--primary"],
      ["--accent-foreground", "--accent"],
      ["--third-foreground", "--third"],
      ["--surface-dark-foreground", "--surface-dark"],
      ["--muted-foreground", "--muted"],
      ["--muted-foreground", "--background"],
      ["--link", "--background"],
      ["--link", "--muted"],
      ["--btn-fg-hover", "--btn-bg-hover"],
      ["--destructive-text", "--background"],
      ["--destructive-text", "--muted"],
    ]
    for (const [fg, bg] of pairs)
      expect(
        contrastRatio(t[fg]!, t[bg]!),
        `${fg} on ${bg}`
      ).toBeGreaterThanOrEqual(AA)
    // The solid button, too.
    if (t["--btn-bg"] !== "transparent")
      expect(
        contrastRatio(t["--btn-fg"]!, t["--btn-bg"]!)
      ).toBeGreaterThanOrEqual(AA)
  })

  it("keeps the link the primary colour when it already passes", () => {
    expect(tokens({ primary: "#0e5e6f" })["--link"]).toBe("#0e5e6f")
  })

  it("makes input borders visible against the page (3:1)", () => {
    const t = tokens()
    expect(
      contrastRatio(t["--input"]!, t["--background"]!)
    ).toBeGreaterThanOrEqual(3)
  })
})

describe("structure", () => {
  it("emits the shadcn set and the semantic and component tokens by name", () => {
    const t = tokens()
    for (const name of [
      "--background",
      "--foreground",
      "--card",
      "--card-foreground",
      "--popover",
      "--popover-foreground",
      "--primary",
      "--primary-foreground",
      "--secondary",
      "--secondary-foreground",
      "--muted",
      "--muted-foreground",
      "--accent",
      "--accent-foreground",
      "--destructive",
      "--destructive-text",
      "--border",
      "--input",
      "--ring",
      "--link",
      "--surface-dark",
      "--surface-dark-foreground",
      "--third",
      "--third-foreground",
      "--radius",
      "--font-sans",
      "--font-display",
      "--display-weight",
      "--display-transform",
      "--display-tracking",
      "--shadow-sm",
      "--shadow-md",
      "--duration",
      "--btn-radius",
      "--btn-height",
      "--btn-px",
      "--btn-weight",
      "--btn-transform",
      "--btn-tracking",
      "--btn-shadow",
      "--btn-lift",
      "--card-radius",
      "--card-shadow",
      "--sheet-shadow",
      "--input-height",
      "--input-px",
      "--input-radius",
      "--section-y",
    ])
      expect(t, name).toHaveProperty([name])
  })

  it("has a light scheme only, so dark mode can be added beside it", () => {
    expect(Object.keys(deriveTheme(HARBOUR.inputs, fonts).schemes)).toEqual([
      "light",
    ])
  })

  it("never throws on bad input, and falls back to the default colours", () => {
    const bad = { ...HARBOUR.inputs, primary: "nope", text: "" } as ThemeInputs
    const t = deriveTheme(bad, fonts).schemes.light
    expect(t["--primary"]).toBe(DEFAULT_INPUTS.primary)
    expect(t["--foreground"]).toBe(DEFAULT_INPUTS.text)
  })

  it("is deterministic", () => {
    expect(deriveTheme(HARBOUR.inputs, fonts)).toEqual(
      deriveTheme(HARBOUR.inputs, fonts)
    )
  })
})

describe("button text", () => {
  // All Seasons' blues: white fails AA on both (3.2 on the stronger one).
  const blues = { primary: "#61c2ee", accent: "#3096e0", text: "#292929" }

  it("is derived to pass AA when it is Automatic", () => {
    const t = tokens({ ...blues, buttonText: "auto" })
    expect(t["--btn-fg"]).toBe("#292929")
    expect(t["--btn-accent-fg"]).toBe("#292929")
    expect(
      contrastRatio(t["--btn-accent-fg"]!, t["--accent"]!)
    ).toBeGreaterThanOrEqual(AA)
  })

  it("is white on every filled button when the Theme says White, on hover too", () => {
    const t = tokens({ ...blues, buttonText: "white" })
    for (const token of [
      "--btn-fg",
      "--btn-fg-hover",
      "--btn-accent-fg",
      "--accent-hover-foreground",
      "--btn-on-accent-fg",
      "--btn-on-accent-fg-hover",
    ]) {
      expect(t[token], token).toBe("#ffffff")
    }
    // The fill darkens on hover, away from the white.
    expect(contrastRatio("#ffffff", t["--accent-hover"]!)).toBeGreaterThan(
      contrastRatio("#ffffff", t["--accent"]!)
    )
  })

  it("is the text colour when the Theme says Dark", () => {
    const t = tokens({ primary: "#0e5e6f", buttonText: "dark" })
    expect(t["--btn-fg"]).toBe(HARBOUR.inputs.text)
    expect(t["--btn-accent-fg"]).toBe(HARBOUR.inputs.text)
  })

  it("leaves text that isn't a button's as derived: a band, a panel, a strip", () => {
    const auto = tokens({ ...blues, buttonText: "auto" })
    const white = tokens({ ...blues, buttonText: "white" })
    for (const token of ["--primary-foreground", "--accent-foreground"]) {
      expect(white[token], token).toBe(auto[token])
    }
  })

  it("leaves an outline button's label the link colour, and sets it on its filled hover", () => {
    const t = tokens({ ...blues, buttonStyle: "outline", buttonText: "white" })
    expect(t["--btn-fg"]).toBe(t["--link"])
    expect(t["--btn-fg-hover"]).toBe("#ffffff")
  })
})
