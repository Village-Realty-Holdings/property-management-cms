import { AA_TEXT, AA_UI, BLACK, contrastRatio, mix } from "./colour"
import { derivePalette, forcedButtonText, type TokenMap } from "./derive"
import { normalizeInputs, type ThemeInputs } from "./inputs"
import { DEFAULT_INPUTS } from "./presets"

/**
 * Contrast warnings. Text-bearing colours the Theme derives (button text,
 * links, muted text) always reach AA, so they never warn. What is left are the
 * colours a Staff User sets that the derivation cannot repair, and a button
 * text colour set to White or Dark instead of derived. Each warning carries a
 * concrete fix, and no warning blocks saving.
 */

/** The inputs a fix can replace. */
export type FixableInput = "text" | "primary" | "buttonText"

export type ContrastFix = { field: FixableInput; value: string }

export type ContrastWarning = {
  id: "text-on-page" | "primary-outline-edge" | "button-text"
  /** The input to change. */
  field: FixableInput
  message: string
  ratio: number
  needed: number
  /** A replacement value that clears this warning. */
  fix: ContrastFix
}

type Finding = Omit<ContrastWarning, "fix">

/** Every warning for these inputs, without fixes. */
function findWarnings(inputs: ThemeInputs): Finding[] {
  const palette = derivePalette(inputs)
  const found: Finding[] = []

  const textRatio = contrastRatio(inputs.text, palette.worstSurface)
  if (textRatio < AA_TEXT)
    found.push({
      id: "text-on-page",
      field: "text",
      message: "The text colour is too pale to read comfortably on the page.",
      ratio: textRatio,
      needed: AA_TEXT,
    })

  // Only the primary colour is drawn as an edge (outline buttons), so a pale
  // accent is fine: it is a fill, and its text is derived.
  if (inputs.buttonStyle === "outline") {
    const ratio = contrastRatio(inputs.primary, palette.background)
    if (ratio < AA_UI)
      found.push({
        id: "primary-outline-edge",
        field: "primary",
        message:
          "The primary colour is too pale to show as the edge of outline buttons.",
        ratio,
        needed: AA_UI,
      })
  }

  // A button label the Theme sets is used as it is: say when it is hard to
  // read on a fill it sits on. Solid buttons fill with the primary colour;
  // the accent button always fills with the accent.
  const forced = forcedButtonText(inputs)
  if (forced) {
    const fills =
      inputs.buttonStyle === "outline"
        ? [inputs.accent]
        : [inputs.primary, inputs.accent]
    const ratio = Math.min(...fills.map((fill) => contrastRatio(forced, fill)))
    if (ratio < AA_TEXT)
      found.push({
        id: "button-text",
        field: "buttonText",
        message: `${inputs.buttonText === "white" ? "White" : "Dark"} button text is hard to read on your button colours.`,
        ratio,
        needed: AA_TEXT,
      })
  }
  return found
}

/** `inputs` with the fix applied. */
export function applyFix(inputs: ThemeInputs, fix: ContrastFix): ThemeInputs {
  return { ...inputs, [fix.field]: fix.value }
}

/**
 * The colour to suggest: the input moved towards black in 1% steps, the least
 * that clears the warning once the Theme is derived again.
 */
function suggestFix(inputs: ThemeInputs, finding: Finding): ContrastFix {
  // The derived colour always passes.
  if (finding.field === "buttonText")
    return { field: "buttonText", value: "auto" }
  const original = inputs[finding.field]
  for (let step = 1; step <= 100; step++) {
    const value = mix(original, BLACK, step / 100)
    const remaining = findWarnings(
      applyFix(inputs, { field: finding.field, value })
    )
    if (!remaining.some((other) => other.id === finding.id))
      return { field: finding.field, value }
  }
  return { field: finding.field, value: BLACK }
}

/** Warnings for a Theme's inputs, each with a one-click fix. */
export function contrastWarnings(rawInputs: ThemeInputs): ContrastWarning[] {
  const inputs = normalizeInputs(rawInputs, DEFAULT_INPUTS)
  return findWarnings(inputs).map((finding) => ({
    ...finding,
    fix: suggestFix(inputs, finding),
  }))
}

/**
 * Text-bearing token pairs: [foreground, the surface it sits on, and what a
 * transparent surface sits on (default `--background`, the page)].
 */
export const TEXT_PAIRS: readonly (readonly [string, string, string?])[] = [
  ["--foreground", "--background"],
  ["--foreground", "--muted"],
  ["--foreground", "--secondary"],
  ["--card-foreground", "--card"],
  ["--popover-foreground", "--popover"],
  ["--primary-foreground", "--primary"],
  ["--accent-foreground", "--accent"],
  ["--accent-hover-foreground", "--accent-hover"],
  ["--third-foreground", "--third"],
  ["--surface-dark-foreground", "--surface-dark"],
  ["--muted-foreground", "--background"],
  ["--muted-foreground", "--muted"],
  ["--link", "--background"],
  ["--link", "--muted"],
  ["--btn-accent-fg", "--accent"],
  ["--btn-fg", "--btn-bg"],
  ["--btn-fg-hover", "--btn-bg-hover"],
  // The primary button on the accent panel (the inverted Call to action).
  ["--btn-on-accent-fg", "--btn-on-accent-bg", "--accent"],
  ["--btn-on-accent-fg-hover", "--btn-on-accent-bg-hover", "--accent"],
  ["--destructive-text", "--background"],
  ["--destructive-text", "--muted"],
]

export type TextPairFailure = {
  foreground: string
  background: string
  ratio: number
}

/** The text-bearing pairs of a token map that fall below AA. */
export function textPairFailures(tokens: TokenMap): TextPairFailure[] {
  const failures: TextPairFailure[] = []
  for (const [foreground, background, behind = "--background"] of TEXT_PAIRS) {
    const fg = tokens[foreground]
    let bg = tokens[background]
    // Outline buttons are transparent: the text sits on what is behind them.
    if (bg === "transparent") bg = tokens[behind]
    if (!fg || !bg) continue
    const ratio = contrastRatio(fg, bg)
    if (ratio < AA_TEXT) failures.push({ foreground, background, ratio })
  }
  return failures
}
