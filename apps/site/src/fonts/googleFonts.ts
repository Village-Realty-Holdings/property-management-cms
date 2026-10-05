import {
  FONT_STYLES,
  FONT_WEIGHTS,
  type FontStyle,
  type FontWeight,
} from "./types"

/**
 * Downloads a font family's WOFF2 files from Google Fonts so the Site can
 * store and serve them itself. This runs on the server when a User adds
 * a Google Font, never in a visitor's browser: the Site makes no calls to
 * Google at runtime.
 *
 * It uses the CSS2 API. Google picks the file format from the User-Agent, so
 * the request sends a current Chrome one to get WOFF2. The CSS lists one
 * `@font-face` per weight, style and unicode subset; we keep the `latin`
 * subset (or the first face when a family has none) and fetch its file.
 * Nothing is returned unless every file came back valid, so a failure never
 * leaves a part of a Font behind.
 */

export type FetchLike = (
  input: string | URL,
  init?: RequestInit
) => Promise<Response>

export type GoogleFontRequest = {
  /** The family's name on Google Fonts, such as "Roboto Slab". */
  family: string
  weights: readonly number[]
  /** Defaults to normal only. */
  styles?: readonly FontStyle[]
}

export type DownloadedFontFile = {
  weight: FontWeight
  style: FontStyle
  data: Buffer
}

export type DownloadedFont = {
  family: string
  files: DownloadedFontFile[]
}

export type GoogleFontErrorCode =
  | "invalid-input"
  | "already-added"
  | "unknown-family"
  | "weight-unavailable"
  | "network"
  | "bad-response"

/** A failure with a message a User can read. */
export class GoogleFontError extends Error {
  constructor(
    readonly code: GoogleFontErrorCode,
    message: string
  ) {
    super(message)
    this.name = "GoogleFontError"
  }
}

export type DownloadOptions = {
  /** Defaults to the global fetch. Tests pass a fake. */
  fetch?: FetchLike
  /** Largest file accepted, in bytes. */
  maxFileBytes?: number
}

const CSS_API = "https://fonts.googleapis.com/css2"
const FILE_HOST = "fonts.gstatic.com"
const DEFAULT_MAX_FILE_BYTES = 3 * 1024 * 1024
const TIMEOUT_MS = 15_000
// Without a browser User-Agent Google answers with TrueType files.
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

/** Letters, digits and single spaces: every Google family name, and no URL syntax. */
const FAMILY = /^[A-Za-z0-9]+(?: [A-Za-z0-9]+)*$/
const MAX_FAMILY_LENGTH = 60

/** Checks a family name typed by a User. Returns it trimmed. */
export function validateFamily(family: string): string {
  const name = family.trim()
  if (!name || name.length > MAX_FAMILY_LENGTH || !FAMILY.test(name)) {
    throw new GoogleFontError(
      "invalid-input",
      "Enter the font's name as it appears on Google Fonts, using only letters, numbers and spaces."
    )
  }
  return name
}

function validate(request: GoogleFontRequest) {
  const family = validateFamily(request.family)
  const weights = [...new Set(request.weights)].sort((a, b) => a - b)
  if (
    weights.length === 0 ||
    !weights.every((w) => (FONT_WEIGHTS as readonly number[]).includes(w))
  ) {
    throw new GoogleFontError(
      "invalid-input",
      "Choose at least one weight: 100, 200, 300, 400, 500, 600, 700, 800 or 900."
    )
  }
  const styles: readonly string[] = [...new Set(request.styles ?? ["normal"])]
  if (
    styles.length === 0 ||
    !styles.every((s) => (FONT_STYLES as readonly string[]).includes(s))
  ) {
    throw new GoogleFontError(
      "invalid-input",
      "Choose normal, italic or both styles."
    )
  }
  return {
    family,
    weights: weights as FontWeight[],
    // Normal before italic, as the CSS2 API sorts them.
    styles: FONT_STYLES.filter((s) => styles.includes(s)),
  }
}

/** The CSS2 URL for these (style, weight) pairs; none means the family alone. */
function cssUrl(
  family: string,
  pairs: readonly { style: FontStyle; weight: number }[],
  hasItalicAxis: boolean
): string {
  const name = encodeURIComponent(family).replaceAll("%20", "+")
  if (pairs.length === 0) return `${CSS_API}?family=${name}&display=swap`
  const tuples = hasItalicAxis
    ? `ital,wght@${pairs.map((p) => `${p.style === "italic" ? 1 : 0},${p.weight}`).join(";")}`
    : `wght@${pairs.map((p) => p.weight).join(";")}`
  return `${CSS_API}?family=${name}:${tuples}&display=swap`
}

export async function downloadGoogleFont(
  request: GoogleFontRequest,
  options: DownloadOptions = {}
): Promise<DownloadedFont> {
  const { family, weights, styles } = validate(request)
  const fetcher = options.fetch ?? globalThis.fetch.bind(globalThis)
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES
  const get = (url: string) => send(fetcher, url)

  const pairs = styles.flatMap((style) =>
    weights.map((weight) => ({ style, weight }))
  )
  // Google wants tuples sorted by italic, then weight.
  pairs.sort(
    (a, b) =>
      Number(a.style === "italic") - Number(b.style === "italic") ||
      a.weight - b.weight
  )
  const hasItalicAxis = styles.includes("italic")

  const response = await get(cssUrl(family, pairs, hasItalicAxis))
  if (!response.ok) {
    if (response.status === 400 || response.status === 404) {
      throw await explainRejection(family, pairs, get)
    }
    throw unavailable(response.status)
  }
  const faces = parseFontFaces(await response.text())

  const chosen = pairs.map((pair) => {
    const face = pickFace(faces, pair.style, pair.weight)
    if (!face) {
      throw new GoogleFontError(
        "weight-unavailable",
        `Google Fonts didn't return ${label(pair)} for ${family}.`
      )
    }
    if (!isGoogleFontFile(face.url)) {
      throw new GoogleFontError(
        "bad-response",
        "Google Fonts pointed at a file on another host, so nothing was downloaded."
      )
    }
    return { ...pair, url: face.url }
  })

  // A variable font serves several weights from one file: fetch it once.
  const downloads = new Map<string, Promise<Buffer>>()
  for (const { url } of chosen) {
    if (!downloads.has(url)) {
      downloads.set(url, downloadFile(url, get, maxFileBytes))
    }
  }
  // Wait for every download, so a failure leaves none running.
  const settled = await Promise.allSettled(downloads.values())
  const failure = settled.find((r) => r.status === "rejected")
  if (failure) throw (failure as PromiseRejectedResult).reason
  const files = new Map(
    [...downloads.keys()].map((url, i) => [
      url,
      (settled[i] as PromiseFulfilledResult<Buffer>).value,
    ])
  )

  // By weight, normal before italic.
  chosen.sort(
    (a, b) =>
      a.weight - b.weight ||
      Number(a.style === "italic") - Number(b.style === "italic")
  )
  return {
    family,
    files: chosen.map(({ url, weight, style }) => ({
      weight,
      style,
      data: files.get(url)!,
    })),
  }
}

async function send(fetcher: FetchLike, url: string): Promise<Response> {
  try {
    return await fetcher(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    throw new GoogleFontError(
      "network",
      "Couldn't reach Google Fonts. Check the connection and try again."
    )
  }
}

function unavailable(status: number) {
  return new GoogleFontError(
    "network",
    `Google Fonts isn't available right now (HTTP ${status}). Try again later.`
  )
}

const label = (pair: { style: FontStyle; weight: number }) =>
  pair.style === "italic" ? `italic ${pair.weight}` : String(pair.weight)

/**
 * Google answers 400 for both an unknown family and a weight the family
 * doesn't have. Asking for the family alone, and then each weight alone,
 * tells them apart.
 */
async function explainRejection(
  family: string,
  pairs: readonly { style: FontStyle; weight: number }[],
  get: (url: string) => Promise<Response>
): Promise<GoogleFontError> {
  const known = await get(cssUrl(family, [], false))
  if (!known.ok) {
    if (known.status === 400 || known.status === 404) {
      return new GoogleFontError(
        "unknown-family",
        `Google Fonts has no family called "${family}". Check the spelling against fonts.google.com.`
      )
    }
    return unavailable(known.status)
  }
  const missing: string[] = []
  for (const pair of pairs) {
    const one = await get(cssUrl(family, [pair], pair.style === "italic"))
    if (one.status === 400 || one.status === 404) missing.push(label(pair))
    else if (!one.ok) return unavailable(one.status)
  }
  return new GoogleFontError(
    "weight-unavailable",
    missing.length
      ? `${family} isn't offered in ${missing.join(", ")}. Choose only the weights it comes in.`
      : `Google Fonts couldn't serve ${family} in the weights chosen. Try fewer weights.`
  )
}

async function downloadFile(
  url: string,
  get: (url: string) => Promise<Response>,
  maxBytes: number
): Promise<Buffer> {
  const response = await get(url)
  if (!response.ok) throw unavailable(response.status)
  const data = Buffer.from(await response.arrayBuffer())
  if (data.length > maxBytes) {
    throw new GoogleFontError(
      "bad-response",
      "A font file from Google Fonts is larger than allowed."
    )
  }
  if (data.subarray(0, 4).toString("latin1") !== "wOF2") {
    throw new GoogleFontError(
      "bad-response",
      "Google Fonts sent a file that isn't a WOFF2 font."
    )
  }
  return data
}

type Face = {
  subset: string | null
  style: FontStyle
  minWeight: number
  maxWeight: number
  url: string
}

// The `@font-face` rules in Google's CSS, each with the comment naming its subset before it.
export function parseFontFaces(css: string): Face[] {
  const faces: Face[] = []
  const rule = /(?:\/\*\s*([^*]*?)\s*\*\/\s*)?@font-face\s*\{([^}]*)\}/g
  for (const match of css.matchAll(rule)) {
    const body = match[2]!
    const style = /font-style:\s*(normal|italic)/.exec(body)?.[1]
    const weight = /font-weight:\s*(\d+)(?:\s+(\d+))?/.exec(body)
    const src = /src:[^;]*?url\(\s*['"]?([^'")\s]+)['"]?\s*\)/.exec(body)?.[1]
    if (!style || !weight || !src) continue
    faces.push({
      subset: match[1] || null,
      style: style as FontStyle,
      minWeight: Number(weight[1]),
      maxWeight: Number(weight[2] ?? weight[1]),
      url: src,
    })
  }
  return faces
}

/** The latin face for a weight and style, else the first face there is. */
function pickFace(
  faces: readonly Face[],
  style: FontStyle,
  weight: number
): Face | undefined {
  const matching = faces.filter(
    (face) =>
      face.style === style &&
      face.minWeight <= weight &&
      weight <= face.maxWeight
  )
  return matching.find((face) => face.subset === "latin") ?? matching[0]
}

/** Only https files on Google's font host are ever fetched. */
function isGoogleFontFile(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" && parsed.hostname === FILE_HOST
  } catch {
    return false
  }
}
