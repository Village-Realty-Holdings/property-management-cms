import {
  AA_TEXT,
  AA_UI,
  BLACK,
  WHITE,
  contrastRatio,
  luminance,
  mix,
  nudgeToContrast,
  readableOn,
} from "./colour"
import { normalizeInputs, type ThemeInputs } from "./inputs"
import { DEFAULT_INPUTS } from "./presets"

/**
 * Token derivation, in three tiers:
 *
 * 1. brand inputs (`ThemeInputs`), the only thing a Staff User edits;
 * 2. semantic tokens: the shadcn set plus `--link`, `--surface-dark`,
 *    `--third`, `--radius`, the fonts, heading style, shadows, durations;
 * 3. component tokens: `--btn-*`, `--card-*`, `--input-*`, `--section-y`,
 *    which the components in packages/ui read.
 *
 * Text-bearing colours (button text, links, muted text, text on the dark
 * surface) are derived to reach WCAG AA whatever the brand colours are. What
 * the inputs themselves can get wrong is reported by `contrastWarnings`.
 */

export type TokenMap = Record<string, string>

/** Resolved CSS `font-family` values, e.g. `"Lora", Georgia, serif`. */
export type FontStacks = { heading: string; body: string }

export type DerivedTheme = {
  /** One token map per colour scheme. Only light is built; dark mode is a
   * second entry here later. */
  schemes: { light: TokenMap }
  /** Overrides for `prefers-reduced-motion: reduce`. */
  reducedMotion: TokenMap
}

const FALLBACK_STACK = "system-ui, sans-serif"

const TINT_BASE = {
  neutral: "#808080",
  warm: "#a0825a",
  cool: "#5a7896",
} as const

/** Error red for `--destructive`, white text on it passes AA. */
const DESTRUCTIVE = "#c62828"

/** The light surfaces the page is built from. */
export type Palette = {
  background: string
  card: string
  muted: string
  secondary: string
  border: string
  /** Of the surfaces text can sit on, the one with the least contrast. */
  worstSurface: string
  link: string
  mutedForeground: string
  input: string
  surfaceDark: string
}

/** The derived colours that text and edges are checked against. */
export function derivePalette(inputs: ThemeInputs): Palette {
  const tint =
    inputs.neutralTint === "brand"
      ? inputs.primary
      : TINT_BASE[inputs.neutralTint]
  const background = mix(WHITE, tint, 0.03)
  const muted = mix(WHITE, tint, 0.08)
  const secondary = mix(WHITE, tint, 0.1)
  const surfaces = [background, muted, secondary, WHITE]
  const worstSurface = surfaces.reduce((a, b) =>
    luminance(b) < luminance(a) ? b : a
  )
  return {
    background,
    card: WHITE,
    muted,
    secondary,
    border: mix(WHITE, tint, 0.16),
    worstSurface,
    link: nudgeToContrast(inputs.primary, worstSurface, AA_TEXT),
    mutedForeground: nudgeToContrast(
      mix(inputs.text, WHITE, 0.4),
      worstSurface,
      AA_TEXT
    ),
    input: nudgeToContrast(mix(WHITE, tint, 0.3), background, AA_UI),
    surfaceDark:
      inputs.darkSurface ??
      nudgeToContrast(mix(inputs.text, BLACK, 0.35), WHITE, 7),
  }
}

const BUTTON_RADIUS = {
  square: "0px",
  soft: "8px",
  rounded: "12px",
  pill: "9999px",
} as const

const CARD_RADIUS = { square: "0px", soft: "8px", rounded: "16px" } as const

/** The base `--radius` the ui components scale from, with the card corners. */
const BASE_RADIUS = { square: "0px", soft: "6px", rounded: "10px" } as const

const SPACING = {
  compact: {
    height: "2.25rem",
    px: "1rem",
    inputPx: "0.75rem",
    section: "2.5rem",
  },
  comfortable: {
    height: "2.75rem",
    px: "1.5rem",
    inputPx: "1rem",
    section: "4rem",
  },
  spacious: {
    height: "3.125rem",
    px: "1.75rem",
    inputPx: "1.25rem",
    section: "6rem",
  },
} as const

/** A shadow that is not there, in a form that composes with the focus ring. */
const NO_SHADOW = "0 0 #0000"

const SHADOW = {
  // A full box-shadow value, not the keyword "none": Tailwind lists a
  // component's shadow beside the focus ring in one box-shadow, and a "none"
  // there makes the whole declaration invalid, dropping the ring.
  none: { sm: NO_SHADOW, md: NO_SHADOW },
  subtle: {
    sm: "0 1px 8px 0 rgb(0 0 0 / 0.07)",
    md: "0 4px 15px 0 rgb(0 0 0 / 0.1)",
  },
  lifted: {
    sm: "0 4px 12px 0 rgb(0 0 0 / 0.14)",
    md: "0 8px 24px -4px rgb(0 0 0 / 0.18)",
  },
} as const

/**
 * A sheet slides in over the page, one layer above a card: it is flat with
 * None, and follows Subtle and Lifted like the rest.
 */
const SHEET_SHADOW = {
  none: NO_SHADOW,
  subtle: SHADOW.subtle.md,
  lifted: "0 16px 40px -8px rgb(0 0 0 / 0.24)",
} as const

const MOTION = {
  none: { duration: "0ms", lift: "0px" },
  subtle: { duration: "180ms", lift: "-1px" },
  lively: { duration: "300ms", lift: "-3px" },
} as const

const HEADING_WEIGHT = {
  regular: "400",
  medium: "500",
  bold: "700",
  black: "900",
} as const

const BUTTON_WEIGHT = { regular: "400", medium: "500", bold: "700" } as const

const BUTTON_LETTERS = {
  normal: { transform: "none", tracking: "0em" },
  uppercase: { transform: "uppercase", tracking: "0.06em" },
  title: { transform: "capitalize", tracking: "0em" },
} as const

const stack = (value: string, fallback: string) => value.trim() || fallback

/**
 * Every CSS variable the Site and its Blocks read, from the Theme's inputs.
 * `fonts` are the resolved font stacks for the heading and body font keys.
 * Invalid inputs fall back to the default preset's; this never throws.
 */
export function deriveTheme(
  rawInputs: ThemeInputs,
  fonts: FontStacks
): DerivedTheme {
  const inputs = normalizeInputs(rawInputs, DEFAULT_INPUTS)
  const p = derivePalette(inputs)
  const ink = inputs.text

  const primaryText = readableOn(inputs.primary, ink)
  const third = inputs.third ?? inputs.primary
  const outline = inputs.buttonStyle === "outline"
  const spacing = SPACING[inputs.spacing]
  const shadow = SHADOW[inputs.shadows]
  const motion = MOTION[inputs.motion]
  const letters = BUTTON_LETTERS[inputs.buttonLetters]

  // Solid buttons darken (or lighten) on hover, away from their text.
  const solidHover = hoverOf(inputs.primary, primaryText, ink)

  // The accent button hovers the same way, with text checked on the hover
  // fill: the accent text was derived for the resting fill only.
  const accentText = readableOn(inputs.accent, ink)
  const accentHover = hoverOf(inputs.accent, accentText, ink)

  // Outline buttons are transparent, so on the accent panel the label and
  // edge take the panel's own text colour (derived to pass AA on the accent).
  // Solid buttons carry their own fill, so they are the primary button.
  const onAccent = outline
    ? {
        bg: "transparent",
        fg: accentText,
        border: accentText,
        bgHover: accentText,
        fgHover: inputs.accent,
      }
    : {
        bg: inputs.primary,
        fg: primaryText,
        border: inputs.primary,
        bgHover: solidHover.fill,
        fgHover: solidHover.text,
      }

  const light: TokenMap = {
    // Semantic: the shadcn set.
    "--background": p.background,
    "--foreground": ink,
    "--card": p.card,
    "--card-foreground": ink,
    "--popover": WHITE,
    "--popover-foreground": ink,
    "--primary": inputs.primary,
    "--primary-foreground": primaryText,
    "--secondary": p.secondary,
    "--secondary-foreground": ink,
    "--muted": p.muted,
    "--muted-foreground": p.mutedForeground,
    "--accent": inputs.accent,
    "--accent-foreground": accentText,
    "--accent-hover": accentHover.fill,
    "--accent-hover-foreground": accentHover.text,
    "--destructive": DESTRUCTIVE,
    "--destructive-text": nudgeToContrast(DESTRUCTIVE, p.worstSurface, AA_TEXT),
    "--border": p.border,
    "--input": p.input,
    "--ring": p.link,

    // Semantic: beyond shadcn.
    "--link": p.link,
    "--surface-dark": p.surfaceDark,
    "--surface-dark-foreground": readableOn(p.surfaceDark, WHITE),
    "--third": third,
    "--third-foreground": readableOn(third, ink),
    "--radius": BASE_RADIUS[inputs.cardCorners],
    "--font-sans": stack(fonts.body, FALLBACK_STACK),
    "--font-display": stack(fonts.heading, FALLBACK_STACK),
    "--display-weight": HEADING_WEIGHT[inputs.headingWeight],
    "--display-transform":
      inputs.headingCase === "uppercase" ? "uppercase" : "none",
    "--display-tracking": headingTracking(inputs),
    "--shadow-sm": shadow.sm,
    "--shadow-md": shadow.md,
    "--duration": motion.duration,

    // Component: buttons.
    "--btn-radius": BUTTON_RADIUS[inputs.buttonCorners],
    "--btn-height": spacing.height,
    "--btn-px": spacing.px,
    "--btn-weight": BUTTON_WEIGHT[inputs.buttonWeight],
    "--btn-transform": letters.transform,
    "--btn-tracking": letters.tracking,
    "--btn-shadow": outline ? NO_SHADOW : shadow.sm,
    "--btn-lift": motion.lift,
    "--btn-bg": outline ? "transparent" : inputs.primary,
    "--btn-fg": outline ? p.link : primaryText,
    "--btn-border-color": inputs.primary,
    "--btn-border-width": outline ? "2px" : "0px",
    "--btn-bg-hover": outline ? inputs.primary : solidHover.fill,
    "--btn-fg-hover": outline ? primaryText : solidHover.text,
    "--btn-on-accent-bg": onAccent.bg,
    "--btn-on-accent-fg": onAccent.fg,
    "--btn-on-accent-border-color": onAccent.border,
    "--btn-on-accent-bg-hover": onAccent.bgHover,
    "--btn-on-accent-fg-hover": onAccent.fgHover,

    // Component: cards, inputs, sections.
    "--card-radius": CARD_RADIUS[inputs.cardCorners],
    // Subtle keeps cards flat and soft; Lifted lets them float.
    "--card-shadow": inputs.shadows === "lifted" ? shadow.md : shadow.sm,
    "--sheet-shadow": SHEET_SHADOW[inputs.shadows],
    "--input-height": spacing.height,
    "--input-px": spacing.inputPx,
    "--input-radius": BASE_RADIUS[inputs.cardCorners],
    "--section-y": spacing.section,
  }

  return {
    schemes: { light },
    reducedMotion: { "--duration": "0ms", "--btn-lift": "0px" },
  }
}

/**
 * A solid fill's hover: darker when its text is white, lighter otherwise,
 * with the text kept if it still reaches AA on the moved fill.
 */
function hoverOf(
  fill: string,
  text: string,
  ink: string
): { fill: string; text: string } {
  const moved = mix(fill, text === WHITE ? BLACK : WHITE, 0.15)
  return {
    fill: moved,
    text: contrastRatio(text, moved) >= AA_TEXT ? text : readableOn(moved, ink),
  }
}

function headingTracking(inputs: ThemeInputs): string {
  if (inputs.headingCase === "uppercase") return "0.04em"
  return inputs.headingWeight === "regular" || inputs.headingWeight === "medium"
    ? "-0.01em"
    : "-0.02em"
}
