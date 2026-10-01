import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const uiRoot = join(import.meta.dirname, "../../../../../packages/ui/src")
const appRoot = join(import.meta.dirname, "../..")
const css = readFileSync(join(uiRoot, "styles/globals.css"), "utf8")

/** The oklch() value of a custom property in `:root` (the first declaration). */
function oklchOf(property: string, block = ":root"): [number, number, number] {
  const start = css.indexOf(`${block} {`)
  const match = new RegExp(
    `${property}:\\s*oklch\\(([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\)`
  ).exec(css.slice(start))
  if (!match) throw new Error(`${property} is not an oklch() in ${block}`)
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function oklchToLinearRgb([L, C, h]: [number, number, number]) {
  const a = C * Math.cos((h * Math.PI) / 180)
  const b = C * Math.sin((h * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const clamp = (x: number) => Math.min(1, Math.max(0, x))
  return [
    clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ] as const
}

const toSrgb = (x: number) =>
  x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055
const toLinear = (x: number) =>
  x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4

const luminance = ([r, g, b]: readonly number[]) =>
  0.2126 * r! + 0.7152 * g! + 0.0722 * b!

/** `color` at `alpha` over `background`, as it is painted (gamma-encoded mix). */
function over(
  color: readonly number[],
  alpha: number,
  background: readonly number[]
) {
  return color.map((c, i) => {
    const mixed = toSrgb(c) * alpha + toSrgb(background[i]!) * (1 - alpha)
    return toLinear(mixed)
  })
}

function contrast(a: readonly number[], b: readonly number[]) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

describe("destructive text on a destructive tint (WCAG AA, 4.5:1)", () => {
  const white = [1, 1, 1]
  const tint = oklchToLinearRgb(oklchOf("--destructive"))

  it("the plain destructive colour is too light for text on its tint", () => {
    // Why the text token exists: this is the 3.88:1 the review measured.
    expect(contrast(tint, over(tint, 0.1, white))).toBeLessThan(4.5)
  })

  it.each([0.1, 0.2])(
    "--destructive-text passes on a %s tint of --destructive over white",
    (alpha) => {
      const text = oklchToLinearRgb(oklchOf("--destructive-text"))
      expect(contrast(text, over(tint, alpha, white))).toBeGreaterThanOrEqual(
        4.5
      )
    }
  )

  it("--destructive-text is exposed to Tailwind as text-destructive-text", () => {
    expect(css).toContain("--color-destructive-text: var(--destructive-text)")
  })
})

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.tsx$/.test(name) && !/\.test\./.test(name) ? [path] : []
  })
}

describe("components that tint with the destructive colour", () => {
  it("never set plain text-destructive on a bg-destructive/N tint", () => {
    const offenders: string[] = []
    for (const file of [...sourceFiles(uiRoot), ...sourceFiles(appRoot)]) {
      for (const [i, line] of readFileSync(file, "utf8")
        .split("\n")
        .entries()) {
        if (
          /bg-destructive\/\d+/.test(line) &&
          /text-destructive(?!-)/.test(line)
        ) {
          offenders.push(`${file}:${i + 1}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
