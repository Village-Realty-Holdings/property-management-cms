import type { Field, Payload } from "payload"

import { Layouts } from "../../collections/Layouts"
import { Pages } from "../../collections/Pages"
import { Brand as BrandConfig } from "../../globals/Brand"
import { SEO as SeoConfig } from "../../globals/SEO"
import type { Page } from "../../payload-types"
import { formStateFromError } from "../formState"
import type { Access } from "../settingsSave"
import type { Hit, Rewritten } from "./text"

/**
 * A site-wide replace (apps/site ADR-0008), through the Local API with the
 * caller's access: what it would change (the preview) and changing it. Both
 * read the Site again, so applying never trusts what a preview showed.
 *
 * A Page is changed in its Draft, or in its Published copy too, as the
 * User chooses. Layouts, the Brand and SEO have no Drafts: they go live.
 * Page Templates are left as they are unless the User includes them.
 */

/** What to replace: a rewrite of one document's data, and what to call it. */
export type Replacement = {
  rewrite: (fields: readonly Field[], data: unknown) => Rewritten
  /** For a Layout's history: "Replace Text: “Awayday” with “Away Day”". */
  summary: string
  /** Whether the Brand and SEO settings are searched too. */
  settings: boolean
  /** Whether Page Templates are searched too. They are left alone unless asked. */
  templates: boolean
}

export type ReplaceMode = "draft" | "publish"

type Kind = "Page" | "Page Template" | "Layout" | "Brand" | "SEO"

/** One document the replace would change. */
export type ReplaceRow = {
  kind: Kind
  title: string
  href: string
  /** Replacements in the copy Users edit: the Draft of a Page. */
  matches: number
  /** Where: "Block 2, Hero: Heading". */
  places: string[]
  /**
   * Replacements in the Published copy, for a Page whose Draft has changes
   * not yet published. Made only by "publish now".
   */
  publishedMatches?: number
  /** Whether the change is on the Site as soon as it is made, in either mode. */
  live: boolean
}

export type ReplacePreview = {
  rows: ReplaceRow[]
  /** Replacements across every row: in each, the copy with the most. */
  total: number
}

export type ReplaceOutcome = {
  kind: Kind
  title: string
  href: string
  ok: boolean
  /** "Draft saved", "Published", "Live", or why it failed. */
  message: string
}

export type ReplaceResult = {
  ok: boolean
  message: string
  outcomes: ReplaceOutcome[]
}

/** "2 Pages, 1 Layout and the Brand": the documents a replace changed. */
function summarize(kinds: readonly Kind[]): string {
  const counted = (["Page", "Page Template", "Layout"] as const).flatMap(
    (kind) => {
      const n = kinds.filter((k) => k === kind).length
      return n === 0 ? [] : [`${n} ${kind}${n === 1 ? "" : "s"}`]
    }
  )
  const parts = [
    ...counted,
    ...(kinds.includes("Brand") ? ["the Brand"] : []),
    ...(kinds.includes("SEO") ? ["SEO"] : []),
  ]
  return parts.length === 1
    ? parts[0]!
    : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
}

const named = (fields: readonly Field[], names: readonly string[]) =>
  fields.filter((field) => "name" in field && names.includes(field.name))

/** A Layout's Blocks. Its name and paths are the Admin's, not the Site's. */
const LAYOUT_FIELDS = named(Layouts.fields, ["header", "footer"])

/** Everything a Page save carries, so a save sets each field itself. */
const PAGE_KEYS = Pages.fields.flatMap((field) =>
  "name" in field ? [field.name] : []
)

const count = (hits: readonly Hit[]) =>
  hits.reduce((sum, hit) => sum + hit.count, 0)

const places = (hits: readonly Hit[]) =>
  hits.map((hit) => (hit.block ? `${hit.block}: ${hit.where}` : hit.where))

/** The top-level fields a rewrite changed, to save only those. */
function changed(before: unknown, after: unknown): Record<string, unknown> {
  const was = before as Record<string, unknown>
  return Object.fromEntries(
    Object.entries(after as Record<string, unknown>).filter(
      ([key, value]) => value !== was[key]
    )
  )
}

const pageData = (page: unknown) =>
  Object.fromEntries(
    PAGE_KEYS.map((key) => [key, (page as Record<string, unknown>)[key]])
  )

type PagePlan = {
  row: ReplaceRow
  id: number
  /** The newest version, rewritten: the Draft, or the Published copy itself. */
  latest: { before: Page; after: Rewritten }
  /** The Published copy, when the Draft has moved on from it. */
  published?: { after: Rewritten }
  /** Whether visitors see the Page. */
  isPublished: boolean
}

type LivePlan = {
  row: ReplaceRow
  save: (payload: Payload, access: Access) => Promise<unknown>
}

async function plan(
  payload: Payload,
  access: Access,
  replacement: Replacement
): Promise<{ pages: PagePlan[]; live: LivePlan[] }> {
  const [latest, served, layouts] = await Promise.all([
    payload.find({
      collection: "pages",
      pagination: false,
      depth: 0,
      draft: true,
      sort: "title",
      ...access,
    }),
    payload.find({
      collection: "pages",
      pagination: false,
      depth: 0,
      draft: false,
      ...access,
    }),
    payload.find({
      collection: "layouts",
      pagination: false,
      depth: 0,
      sort: "name",
      ...access,
    }),
  ])
  const servedById = new Map(served.docs.map((doc) => [doc.id, doc]))

  const pages: PagePlan[] = []
  for (const page of latest.docs) {
    if (page.isTemplate && !replacement.templates) continue
    const copy = servedById.get(page.id)
    const isPublished = copy?._status === "published"
    // The Draft has moved on when the newest version isn't the Published one.
    const apart = isPublished && page._status !== "published"
    const after = replacement.rewrite(Pages.fields, page)
    const published = apart
      ? { after: replacement.rewrite(Pages.fields, copy) }
      : undefined
    const publishedMatches = published ? count(published.after.hits) : 0
    if (after.hits.length === 0 && publishedMatches === 0) continue
    pages.push({
      id: page.id,
      isPublished,
      latest: { before: page, after },
      published,
      row: {
        kind: page.isTemplate ? "Page Template" : "Page",
        title: page.title,
        href: `/admin/pages/${page.id}`,
        matches: count(after.hits),
        places: places(after.hits),
        ...(published ? { publishedMatches } : {}),
        live: false,
      },
    })
  }

  const live: LivePlan[] = []
  for (const layout of layouts.docs) {
    const after = replacement.rewrite(LAYOUT_FIELDS, layout)
    if (after.hits.length === 0) continue
    live.push({
      row: {
        kind: "Layout",
        title: layout.name,
        href: `/admin/layouts/${layout.id}`,
        matches: count(after.hits),
        places: places(after.hits),
        live: true,
      },
      save: (p, as) =>
        p.update({
          collection: "layouts",
          id: layout.id,
          data: { ...changed(layout, after.data), note: replacement.summary },
          depth: 0,
          ...as,
        }),
    })
  }

  if (replacement.settings) {
    const settings = [
      {
        slug: "brand",
        kind: "Brand",
        fields: BrandConfig.fields,
        href: "/admin/settings/brand",
      },
      {
        slug: "seo",
        kind: "SEO",
        fields: SeoConfig.fields,
        href: "/admin/settings/seo",
      },
    ] as const
    for (const { slug, kind, fields, href } of settings) {
      const doc = await payload.findGlobal({ slug, depth: 0, ...access })
      const after = replacement.rewrite(fields, doc)
      if (after.hits.length === 0) continue
      live.push({
        row: {
          kind,
          title: kind,
          href,
          matches: count(after.hits),
          places: places(after.hits),
          live: true,
        },
        save: (p, as) =>
          p.updateGlobal({
            slug,
            data: changed(doc, after.data),
            depth: 0,
            ...as,
          }),
      })
    }
  }

  return { pages, live }
}

/** What the replace would change, document by document. */
export async function previewReplace(
  payload: Payload,
  access: Access,
  replacement: Replacement
): Promise<ReplacePreview> {
  const { pages, live } = await plan(payload, access, replacement)
  const rows = [...pages, ...live].map((item) => item.row)
  return {
    rows,
    // A Page whose Draft dropped the text still counts for its Published copy.
    total: rows.reduce(
      (sum, row) => sum + Math.max(row.matches, row.publishedMatches ?? 0),
      0
    ),
  }
}

const failure = (error: unknown): string => {
  const state = formStateFromError(error)
  const fields = Object.entries(state.fieldErrors ?? {})
    .map(([path, message]) => `${path}: ${message}`)
    .join("; ")
  return fields || state.message || "It could not be saved."
}

/** Saves a Page's Draft; the Published copy stays as it is. */
const saveDraft = (
  payload: Payload,
  access: Access,
  id: number,
  data: unknown
) =>
  payload.update({
    collection: "pages",
    id,
    data: { ...pageData(data), _status: "draft" },
    draft: true,
    depth: 0,
    ...access,
  })

const publish = (payload: Payload, access: Access, id: number, data: unknown) =>
  payload.update({
    collection: "pages",
    id,
    data: { ...pageData(data), _status: "published" },
    depth: 0,
    ...access,
  })

async function applyToPage(
  payload: Payload,
  access: Access,
  page: PagePlan,
  mode: ReplaceMode
): Promise<string | null> {
  const draftChanged = page.latest.after.hits.length > 0
  if (mode === "draft" || !page.isPublished) {
    if (!draftChanged) return null
    await saveDraft(payload, access, page.id, page.latest.after.data)
    return "Draft saved"
  }
  if (!page.published) {
    await publish(payload, access, page.id, page.latest.after.data)
    return "Published"
  }
  // The Draft has changes not yet published. The Published copy is replaced
  // and published by itself, then the Draft goes back on top with its own
  // replacement, so those changes stay unpublished.
  if (page.published.after.hits.length === 0) {
    await saveDraft(payload, access, page.id, page.latest.after.data)
    return "Draft saved"
  }
  await publish(payload, access, page.id, page.published.after.data)
  try {
    await saveDraft(payload, access, page.id, page.latest.after.data)
  } catch (error) {
    // The Draft as it was is valid: it was saved once already.
    try {
      await saveDraft(payload, access, page.id, page.latest.before)
    } catch {
      throw new Error(
        `Published, but the Draft could not be saved again. Its unpublished changes are in the Page's history: ${failure(error)}`
      )
    }
    throw new Error(
      `Published, but the Draft kept its old text: ${failure(error)}`
    )
  }
  return draftChanged ? "Published, and Draft saved" : "Published"
}

/**
 * Makes the replacement across the Site. Every document is tried; one that
 * can't be saved (a required field left empty, say) is reported and the rest
 * still go through.
 */
export async function applyReplace(
  payload: Payload,
  access: Access,
  replacement: Replacement,
  mode: ReplaceMode
): Promise<ReplaceResult> {
  if (mode !== "draft" && mode !== "publish") {
    return {
      ok: false,
      message: "Choose Save as Drafts or Publish now.",
      outcomes: [],
    }
  }
  let found: Awaited<ReturnType<typeof plan>>
  try {
    found = await plan(payload, access, replacement)
  } catch (error) {
    return { ok: false, message: failure(error), outcomes: [] }
  }

  const outcomes: ReplaceOutcome[] = []
  const record = async (row: ReplaceRow, run: () => Promise<string | null>) => {
    const { kind, title, href } = row
    try {
      const message = await run()
      if (message) outcomes.push({ kind, title, href, ok: true, message })
    } catch (error) {
      outcomes.push({ kind, title, href, ok: false, message: failure(error) })
    }
  }
  for (const page of found.pages) {
    await record(page.row, () => applyToPage(payload, access, page, mode))
  }
  for (const item of found.live) {
    await record(item.row, async () => {
      await item.save(payload, access)
      return "Live"
    })
  }

  if (outcomes.length === 0) {
    return { ok: true, message: "Nothing to replace.", outcomes }
  }
  const done = outcomes.filter((outcome) => outcome.ok)
  const failed = outcomes.length - done.length
  const replaced =
    done.length === 0
      ? "Nothing was replaced."
      : `Replaced in ${summarize(done.map((outcome) => outcome.kind))}.`
  return {
    ok: failed === 0,
    message:
      failed === 0 ? replaced : `${replaced} ${failed} could not be saved.`,
    outcomes,
  }
}
