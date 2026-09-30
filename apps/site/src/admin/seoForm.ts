import { SEO_DESCRIPTION_MAX } from "../fields/seo"
import type { Seo } from "../payload-types"
import { applyTitlePattern } from "../site/seo"
import { mediaId } from "./pageForm"

/**
 * The SEO defaults as the Admin's form edits them, and the checks the form's
 * Server Action runs on what it receives.
 */

export type SeoValues = {
  titlePattern: string
  description: string
  image: number | null
  favicon: number | null
  allowIndexing: boolean
}

export const emptySeo: SeoValues = {
  titlePattern: "",
  description: "",
  image: null,
  favicon: null,
  allowIndexing: true,
}

export type SeoParseResult =
  | { ok: true; values: SeoValues }
  | { ok: false; fieldErrors: Record<string, string>; message?: string }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "")

const id = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) ? value : null

/** Validates submitted SEO defaults (untrusted) and returns them cleaned. */
export function parseSeoValues(input: unknown): SeoParseResult {
  if (!isRecord(input)) {
    return {
      ok: false,
      fieldErrors: {},
      message: "The form could not be read. Reload the page and try again.",
    }
  }

  const fieldErrors: Record<string, string> = {}
  const values: SeoValues = {
    titlePattern: text(input.titlePattern),
    description: text(input.description),
    image: id(input.image),
    favicon: id(input.favicon),
    allowIndexing: input.allowIndexing === true,
  }

  if (values.titlePattern && !values.titlePattern.includes("%s")) {
    fieldErrors.titlePattern =
      "Include %s where the Page title goes, for example %s · {name}."
  }
  if (typeof input.allowIndexing !== "boolean") {
    fieldErrors.allowIndexing = "Choose whether search engines may index."
  }

  return Object.keys(fieldErrors).length > 0
    ? { ok: false, fieldErrors }
    : { ok: true, values }
}

/** The stored SEO as form values. A fresh SEO allows indexing. */
export function seoToValues(seo: Seo): SeoValues {
  return {
    titlePattern: seo.titlePattern ?? "",
    description: seo.description ?? "",
    image: mediaId(seo.image),
    favicon: mediaId(seo.favicon),
    allowIndexing: seo.allowIndexing ?? true,
  }
}

/** Validated form values as SEO data for the Local API. */
export function seoValuesToData(values: SeoValues) {
  return {
    titlePattern: values.titlePattern || null,
    description: values.description || null,
    image: values.image,
    favicon: values.favicon,
    allowIndexing: values.allowIndexing,
  }
}

const EXAMPLE_PAGE_TITLE = "About us"
const PLACEHOLDER_NAME = "Your Site"

/** How a Page titled "About us" would read with this pattern. */
export function titleExample(pattern: string, siteName: string): string {
  return applyTitlePattern(pattern, {
    title: EXAMPLE_PAGE_TITLE,
    name: siteName.trim() || PLACEHOLDER_NAME,
  })
}

export const DESCRIPTION_MIN = 50

export type LengthHint = {
  count: number
  tone: "neutral" | "good" | "warn"
  text: string
}

/** The length hint under the default description. Advice, never a block. */
export function describeDescriptionLength(description: string): LengthHint {
  const count = description.trim().length
  if (count === 0) {
    return {
      count,
      tone: "neutral",
      text: `Search engines show about ${DESCRIPTION_MIN} to ${SEO_DESCRIPTION_MAX} characters.`,
    }
  }
  if (count < DESCRIPTION_MIN) {
    return {
      count,
      tone: "warn",
      text: `${count} characters. A little short: aim for ${DESCRIPTION_MIN} to ${SEO_DESCRIPTION_MAX}.`,
    }
  }
  if (count > SEO_DESCRIPTION_MAX) {
    return {
      count,
      tone: "warn",
      text: `${count} characters. Search engines may cut it off after ${SEO_DESCRIPTION_MAX}.`,
    }
  }
  return { count, tone: "good", text: `${count} characters.` }
}
