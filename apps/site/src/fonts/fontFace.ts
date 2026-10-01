import type { StoredFont } from "./available"

/**
 * The CSS `@font-face` rules for stored Fonts, for the layout to inline.
 * Every rule swaps in the font when it loads and points at a file the Site
 * serves itself: a URL's origin is dropped, so a visitor's browser never
 * asks another host.
 */
export function fontFaceCss(fonts: readonly StoredFont[]): string {
  return fonts
    .flatMap((font) =>
      font.files.map(
        (file) =>
          `@font-face{font-family:${cssString(font.family)};` +
          `font-style:${file.style};font-weight:${file.weight};` +
          `font-display:swap;` +
          `src:url(${cssString(sameOriginPath(file.url))}) format(${cssString(formatOf(file.url))})}`
      )
    )
    .join("\n")
}

/** A quoted CSS string, with quotes, backslashes and newlines escaped. */
export function cssString(value: string): string {
  return `"${value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replace(/\r?\n|\r/g, "\\a ")}"`
}

/**
 * `/path?query` of a URL. The URL parser already encodes spaces and quotes
 * in a path; the characters it leaves are encoded here.
 */
function sameOriginPath(url: string): string {
  const { pathname, search } = new URL(url, "http://site.invalid")
  return (pathname + search).replace(
    /['"()\\]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  )
}

const FORMATS: Record<string, string> = {
  woff2: "woff2",
  woff: "woff",
  ttf: "truetype",
  otf: "opentype",
}

function formatOf(url: string): string {
  const { pathname } = new URL(url, "http://site.invalid")
  const extension = pathname.split(".").pop()?.toLowerCase() ?? ""
  return FORMATS[extension] ?? "woff2"
}
