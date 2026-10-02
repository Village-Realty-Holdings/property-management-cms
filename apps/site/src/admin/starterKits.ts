import type { Payload } from "payload"

import { Pages } from "../collections/Pages"
import { ensureLayout } from "../pageTemplates/starters"
import {
  BRAND_TOKENS,
  findStarterKit,
  type KitPage,
  type StarterKit,
} from "../starterKits"
import { parseBrandValues, type BrandValues } from "./brandForm"
import { formStateFromError } from "./formState"
import { replaceText } from "./replace/text"
import { applyThemeAs, loadThemes } from "./savedThemes"
import { parseSeoValues, type SeoValues } from "./seoForm"
import { loadBrand, loadSeo, saveBrandAs, saveSeoAs } from "./settingsSave"
import type { StaffAccess } from "./theme/themeScreen"

/**
 * Setting a Site up from a Starter Kit (apps/site ADR-0009), through the
 * Local API as the Staff User (ADR-0002): what the form starts with, what
 * applying would do (the review), and doing it. Nothing is written until
 * every answer is valid. A kit never replaces a Page: one whose path is taken
 * is skipped, and the review says so beforehand.
 */

/** What the form collects. Plain data: it crosses to the browser and back. */
export type KitAnswers = {
  kit: string
  brand: Pick<BrandValues, "name" | "tagline" | "logo" | "phone" | "email">
  seo: Pick<SeoValues, "titlePattern" | "description" | "favicon">
  /** A Theme from the Themes list: "preset:<id>" or "saved:<id>". */
  theme: string
  /** The kit's own questions, by key. */
  details: Record<string, string>
}

/** One line of the review: what applying will do, or won't. */
export type KitStep = {
  kind: "Brand" | "SEO" | "Theme" | "Layout" | "Page"
  text: string
  /** Set when the step replaces something or is skipped. */
  warning?: boolean
}

export type KitReview =
  | { ok: true; steps: KitStep[] }
  | { ok: false; message: string; fieldErrors?: Record<string, string> }

export type KitOutcome = {
  kind: KitStep["kind"]
  text: string
  ok: boolean
  href?: string
}

export type KitResult = {
  ok: boolean
  message: string
  fieldErrors?: Record<string, string>
  outcomes: KitOutcome[]
}

/** The form's starting answers: the Site's Brand and SEO as they are. */
export async function loadKitDefaults(
  payload: Payload,
  access: StaffAccess
): Promise<Omit<KitAnswers, "kit" | "theme" | "details">> {
  const [brand, seo] = await Promise.all([
    loadBrand(payload, access),
    loadSeo(payload, access),
  ])
  return {
    brand: {
      name: brand.name,
      tagline: brand.tagline,
      logo: brand.logo,
      phone: brand.phone,
      email: brand.email,
    },
    seo: {
      titlePattern: seo.titlePattern,
      description: seo.description,
      favicon: seo.favicon,
    },
  }
}

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

type Prepared = {
  kit: StarterKit
  brand: { before: BrandValues; after: BrandValues }
  seo: { before: SeoValues; after: SeoValues }
  theme: { id: string; name: string; live: boolean }
  details: Record<string, string>
}

type Problem = Extract<KitReview, { ok: false }>

/**
 * Checks the answers (they come from the browser) against the Site: the kit
 * and the Theme exist, and the Brand and SEO would save.
 */
async function prepare(
  payload: Payload,
  access: StaffAccess,
  input: unknown
): Promise<Prepared | Problem> {
  const answers = record(input)
  const kit = findStarterKit(answers.kit)
  if (!kit) return { ok: false, message: "Choose a Starter Kit." }

  const [brandBefore, seoBefore, themes] = await Promise.all([
    loadBrand(payload, access),
    loadSeo(payload, access),
    loadThemes(payload, access),
  ])
  const brand = parseBrandValues({ ...brandBefore, ...record(answers.brand) })
  const seo = parseSeoValues({ ...seoBefore, ...record(answers.seo) })
  const fieldErrors: Record<string, string> = {}
  if (!brand.ok) {
    for (const [path, message] of Object.entries(brand.fieldErrors)) {
      // The Brand form keys contact details as Payload does.
      fieldErrors[`brand.${path.replace(/^contact\./, "")}`] = message
    }
  }
  if (!seo.ok) {
    for (const [path, message] of Object.entries(seo.fieldErrors)) {
      fieldErrors[`seo.${path}`] = message
    }
  }
  const theme = themes.find((card) => card.id === answers.theme)
  if (!theme) fieldErrors.theme = "Choose a Theme."
  if (!brand.ok || !seo.ok || !theme || Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Some answers need attention.",
      fieldErrors,
    }
  }

  const given = record(answers.details)
  const details = Object.fromEntries(
    kit.questions.map(({ key }) => {
      const value = given[key]
      return [key, typeof value === "string" ? value.trim().slice(0, 120) : ""]
    })
  )
  return {
    kit,
    brand: { before: brandBefore, after: brand.values },
    seo: { before: seoBefore, after: seo.values },
    theme: { id: theme.id, name: theme.name, live: theme.live },
    details,
  }
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

async function pathTaken(
  payload: Payload,
  access: StaffAccess,
  path: string
): Promise<string | null> {
  // Either copy holds the path: a Published Page keeps its path while a Draft
  // of it tries another.
  for (const draft of [true, false]) {
    const { docs } = await payload.find({
      collection: "pages",
      where: { path: { equals: path } },
      draft,
      limit: 1,
      depth: 0,
      select: { title: true },
      ...access,
    })
    if (docs[0]) return docs[0].title
  }
  return null
}

async function layoutExists(
  payload: Payload,
  access: StaffAccess,
  name: string
): Promise<boolean> {
  const { totalDocs } = await payload.count({
    collection: "layouts",
    where: { name: { equals: name } },
    ...access,
  })
  return totalDocs > 0
}

const pageName = (page: KitPage) =>
  `“${page.title}” at ${page.path === "/" ? "the Site's root (/)" : page.path}`

/** What applying the kit with these answers will do, step by step. */
export async function reviewKitAs(
  payload: Payload,
  access: StaffAccess,
  input: unknown
): Promise<KitReview> {
  const prepared = await prepare(payload, access, input)
  if ("ok" in prepared) return prepared
  const { kit, brand, seo, theme } = prepared
  const steps: KitStep[] = []

  if (same(brand.before, brand.after)) {
    steps.push({ kind: "Brand", text: "The Brand stays as it is." })
  } else if (brand.before.name && brand.before.name !== brand.after.name) {
    steps.push({
      kind: "Brand",
      text: `The Site's name changes from “${brand.before.name}” to “${brand.after.name}”, on the Site straight away.`,
      warning: true,
    })
  } else {
    steps.push({
      kind: "Brand",
      text: `The Brand is saved as “${brand.after.name}”, on the Site straight away.`,
    })
  }

  steps.push(
    same(seo.before, seo.after)
      ? { kind: "SEO", text: "SEO stays as it is." }
      : { kind: "SEO", text: "The SEO defaults are saved." }
  )

  steps.push(
    theme.live
      ? { kind: "Theme", text: `The Theme stays “${theme.name}”.` }
      : {
          kind: "Theme",
          text: `The Theme “${theme.name}” replaces your Site's Theme straight away. The one you have now stays in the Theme's history.`,
          warning: true,
        }
  )

  const layouts = new Set<string>()
  for (const page of kit.pages) {
    const taken = await pathTaken(payload, access, page.path)
    if (taken) {
      steps.push({
        kind: "Page",
        text: `The Page ${pageName(page)} is not added: “${taken}” is already there, and stays as it is.`,
        warning: true,
      })
      continue
    }
    if (page.layout && !layouts.has(page.layout.name)) {
      layouts.add(page.layout.name)
      steps.push({
        kind: "Layout",
        text: (await layoutExists(payload, access, page.layout.name))
          ? `The Layout “${page.layout.name}” is already here and is used as it is.`
          : `The Layout “${page.layout.name}” is added.`,
      })
    }
    steps.push({
      kind: "Page",
      text: `The Page ${pageName(page)} is added as a Draft, for you to edit and publish.`,
    })
  }
  return { ok: true, steps }
}

/** The kit's Blocks with its placeholders filled from the answers. */
function filled(page: KitPage, prepared: Prepared): KitPage["blocks"] {
  const { kit, brand, details } = prepared
  const pairs: [string, string][] = [
    [BRAND_TOKENS.name, brand.after.name],
    [BRAND_TOKENS.phone, brand.after.phone],
    ...kit.questions.map(({ key, token }): [string, string] => [
      token,
      details[key] ?? "",
    ]),
  ]
  const fields = Pages.fields.filter(
    (field) => "name" in field && field.name === "blocks"
  )
  let data: unknown = { blocks: page.blocks }
  for (const [find, replaceWith] of pairs) {
    // An answer left empty keeps the placeholder, for Staff to fill in.
    if (!replaceWith) continue
    data = replaceText(fields, data, {
      find,
      replaceWith,
      caseSensitive: true,
      wholeWord: false,
    }).data
  }
  return (data as { blocks: KitPage["blocks"] }).blocks
}

/**
 * Sets the Site up from the kit: saves the Brand and SEO, applies the Theme,
 * and adds the kit's Layout and Pages. Each step is reported; one that fails
 * does not stop the ones after it.
 */
export async function applyKitAs(
  payload: Payload,
  access: StaffAccess,
  input: unknown
): Promise<KitResult> {
  const prepared = await prepare(payload, access, input)
  if ("ok" in prepared) return { ...prepared, outcomes: [] }
  const { kit, brand, seo, theme } = prepared
  const outcomes: KitOutcome[] = []

  if (!same(brand.before, brand.after)) {
    const saved = await saveBrandAs(payload, access, brand.after)
    outcomes.push({
      kind: "Brand",
      ok: saved.ok === true,
      text: saved.ok ? "The Brand is saved." : `The Brand: ${saved.message}`,
      href: "/admin/settings/brand",
    })
  }
  if (!same(seo.before, seo.after)) {
    const saved = await saveSeoAs(payload, access, seo.after)
    outcomes.push({
      kind: "SEO",
      ok: saved.ok === true,
      text: saved.ok ? "The SEO defaults are saved." : `SEO: ${saved.message}`,
      href: "/admin/settings/seo",
    })
  }
  if (!theme.live) {
    const applied = await applyThemeAs(payload, access, theme.id)
    outcomes.push({
      kind: "Theme",
      ok: applied.ok === true,
      text: applied.message ?? "The Theme is applied.",
      href: "/admin/theme",
    })
  }

  for (const page of kit.pages) {
    try {
      const taken = await pathTaken(payload, access, page.path)
      if (taken) {
        outcomes.push({
          kind: "Page",
          ok: true,
          text: `The Page ${pageName(page)} was not added: “${taken}” is already there.`,
        })
        continue
      }
      const layoutId =
        page.layout && (await ensureLayout(payload, access, page.layout))
      const made = await payload.create({
        collection: "pages",
        data: {
          title: page.title,
          path: page.path,
          blocks: filled(page, prepared),
          _status: "draft",
          ...(layoutId
            ? { layout: { mode: "specific" as const, layout: layoutId } }
            : {}),
        },
        draft: true,
        depth: 0,
        ...access,
      })
      outcomes.push({
        kind: "Page",
        ok: true,
        text: `The Page ${pageName(page)} is added as a Draft.`,
        href: `/admin/pages/${made.id}`,
      })
    } catch (error) {
      outcomes.push({
        kind: "Page",
        ok: false,
        text: `The Page ${pageName(page)} was not added: ${formStateFromError(error).message}`,
      })
    }
  }

  const failed = outcomes.filter((outcome) => !outcome.ok).length
  return {
    ok: failed === 0,
    message:
      failed === 0
        ? `Your Site is set up from the ${kit.name} kit.`
        : `The ${kit.name} kit was applied, but ${failed} ${failed === 1 ? "step" : "steps"} failed.`,
    outcomes,
  }
}
