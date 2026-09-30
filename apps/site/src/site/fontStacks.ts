import type { AvailableFont } from "../fonts/available"
import { BUILT_IN_FONTS } from "../fonts/builtIn"
import { cssString, fontFaceCss } from "../fonts/fontFace"
import type { FontKind } from "../fonts/types"
import { DEFAULT_INPUTS, standInFor } from "../theme/presets"

/**
 * Turns the font keys a Theme stores (`built-in:<family>` or `font:<id>`)
 * into CSS. Pure: src/site/fonts.ts holds the next/font loaders, which only
 * run under Next's compiler, and this module holds everything testable.
 *
 * All three sources are self-hosted. Built-in fonts come from next/font at
 * build time (their variables are defined on <html> by `fontVariables`).
 * Uploaded and Google-imported Fonts are both stored Fonts whose files the
 * Site serves itself, through `@font-face` with the file URL's origin
 * dropped, so a visitor's browser never contacts Google or any other host.
 */

/**
 * What a Theme uses until it chooses, and where a missing font falls back:
 * the default preset's fonts (Classic), so one place owns the pairing.
 */
export const DEFAULT_HEADING_FONT_KEY = DEFAULT_INPUTS.headingFont
export const DEFAULT_BODY_FONT_KEY = DEFAULT_INPUTS.bodyFont

export type FontRole = "heading" | "body"

export type ResolvedFont = {
  /** The key actually used: the default's when the asked-for key is gone. */
  key: string
  /** A CSS `font-family` value, ending in a generic family. */
  stack: string
  /** The `@font-face` rules the font needs; empty for built-in fonts. */
  css: string
}

/** The generic families a font falls back to before it loads, by kind. */
const GENERIC_STACK: Record<FontKind, string> = {
  serif: "serif",
  slab: "serif",
  sans: "system-ui, sans-serif",
}

/** Used only when not even the default built-in font can be found. */
const LAST_RESORT_STACK = "system-ui, sans-serif"

const DEFAULT_KEY: Record<FontRole, string> = {
  heading: DEFAULT_HEADING_FONT_KEY,
  body: DEFAULT_BODY_FONT_KEY,
}

/**
 * The CSS font-family stack, and `@font-face` rules, for one font key. A key
 * that is missing, or points at a Font that was deleted, resolves to the
 * default built-in font for `role`. So does a stored Font with no files: the
 * Site promises self-hosted fonts, and a family name with nothing to serve
 * would depend on the visitor's machine. When a brand preset names that
 * family, its built-in stand-in is used instead. Never throws.
 */
export function resolveFontStack(
  key: string | null | undefined,
  available: readonly AvailableFont[],
  role: FontRole = "body"
): ResolvedFont {
  const found = key ? available.find((font) => font.key === key) : undefined
  const resolved = found ? resolve(found) : undefined
  if (found && resolved) return { key: found.key, ...resolved }

  const standIn = found ? standInFor(found.family, role) : undefined
  const standInFont = standIn
    ? available.find((font) => font.key === standIn)
    : undefined
  const standInResolved = standInFont ? resolve(standInFont) : undefined
  if (standIn && standInResolved) {
    return { key: standIn, ...standInResolved }
  }

  const fallbackKey = DEFAULT_KEY[role]
  const fallback = available.find((font) => font.key === fallbackKey)
  const fallbackResolved = fallback ? resolve(fallback) : undefined
  return {
    key: fallbackKey,
    stack: fallbackResolved?.stack ?? LAST_RESORT_STACK,
    css: "",
  }
}

function resolve(
  font: AvailableFont
): Pick<ResolvedFont, "stack" | "css"> | undefined {
  const generic = GENERIC_STACK[font.kind]
  if (font.source === "built-in") {
    const builtIn = BUILT_IN_FONTS.find((b) => b.family === font.family)
    if (!builtIn) return undefined
    return { stack: `var(${builtIn.cssVariable}), ${generic}`, css: "" }
  }
  // A stored Font with no files has nothing to serve: missing, not resolved.
  if (!font.files?.length) return undefined
  return {
    stack: `${cssString(font.family)}, ${generic}`,
    css: fontFaceCss([
      {
        id: font.id ?? 0,
        family: font.family,
        kind: font.kind,
        files: font.files,
      },
    ]),
  }
}

/**
 * What the Site layout needs for the Theme's two fonts: both stacks, and the
 * `@font-face` CSS for only the fonts it uses (once each).
 */
export function themeFontFaces(
  headingKey: string | null | undefined,
  bodyKey: string | null | undefined,
  available: readonly AvailableFont[]
): { css: string; headingStack: string; bodyStack: string } {
  const heading = resolveFontStack(headingKey, available, "heading")
  const body = resolveFontStack(bodyKey, available, "body")
  const css = [heading, ...(body.key === heading.key ? [] : [body])]
    .map((font) => font.css)
    .filter(Boolean)
    .join("\n")
  return { css, headingStack: heading.stack, bodyStack: body.stack }
}
