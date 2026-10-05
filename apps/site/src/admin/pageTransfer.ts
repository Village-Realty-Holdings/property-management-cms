import { NotFound, type Payload } from "payload"

import { pageBlocks } from "../blocks"
import { refusedBlock } from "../blocks/Container"
import { Pages } from "../collections/Pages"
import { checkPagePath } from "../collections/Pages/path"
import { withoutRowIds } from "../fields/rowIds"
import type { Page } from "../payload-types"
import { formStateFromError, type FormState } from "./formState"
import { pointsAtMedia, rewriteFields } from "./replace/walk"
import type { Access } from "./settingsSave"

/**
 * A Page as a file, to move it to another Site or keep a copy (Pages list,
 * Export and Import), through the Local API as the User (apps/site
 * ADR-0002).
 *
 * The file is the Page as Users edit it (its newest copy): title, path,
 * Blocks, SEO and Layout choice. What belongs to one Site is written by name,
 * since an id means nothing on another: an image is its Media file name, and
 * a picked Layout is its name. Importing looks those up again. An image or a
 * Layout the Site doesn't have is left out, and the import says so.
 *
 * An imported Page is always a new Draft. It never replaces a Page: when the
 * path is taken it gets the next free one ("/about-2").
 */

/** An image in the file: the Media's file name and its alt text. */
type MediaRef = { $media: { filename: string; alt: string } }

export type PageFile = {
  awaydayPage: 1
  title: string
  path: string
  isTemplate?: boolean
  layout: { mode: "route" | "specific" | "none"; name?: string }
  seo: { title?: string | null; description?: string | null; image?: unknown }
  blocks: unknown[]
}

export const IMPORT_MAX_BYTES = 2_000_000

export type ExportResult =
  | { ok: true; filename: string; json: string }
  | { ok: false; message: string }

/** What an import reports: the new Page, and what it had to leave out. */
export type ImportResult = FormState & { id?: number; notes?: string[] }

const GONE = "That Page no longer exists."

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isMediaRef = (value: unknown): value is MediaRef =>
  isRecord(value) &&
  isRecord(value.$media) &&
  typeof value.$media.filename === "string"

/** The Page's fields that hold content: its Blocks and its SEO. */
const CONTENT = Pages.fields.filter(
  (field) => "name" in field && ["blocks", "seo"].includes(field.name)
)

/** A Page as a file another Site can import. */
export async function exportPageAs(
  payload: Payload,
  access: Access,
  id: unknown
): Promise<ExportResult> {
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    return { ok: false, message: GONE }
  }
  let page: Page
  try {
    page = await payload.findByID({
      collection: "pages",
      id,
      draft: true,
      depth: 0,
      ...access,
    })
  } catch (error) {
    if (error instanceof NotFound) return { ok: false, message: GONE }
    throw error
  }

  // Every image the Page shows, by id, to write it by file name.
  const ids = new Set<number>()
  const content = { blocks: page.blocks ?? [], seo: page.seo ?? {} }
  rewriteFields(CONTENT, content, ({ field, value }) => {
    if (pointsAtMedia(field)) {
      for (const one of [value].flat()) {
        if (typeof one === "number") ids.add(one)
      }
    }
    return value
  })
  const media =
    ids.size === 0
      ? []
      : (
          await payload.find({
            collection: "media",
            where: { id: { in: [...ids] } },
            pagination: false,
            depth: 0,
            select: { filename: true, alt: true },
            ...access,
          })
        ).docs
  const refOf = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(refOf)
    if (typeof value !== "number") return value
    const found = media.find((doc) => doc.id === value)
    return found?.filename
      ? { $media: { filename: found.filename, alt: found.alt ?? "" } }
      : null
  }
  const portable = rewriteFields(CONTENT, content, ({ field, value }) =>
    pointsAtMedia(field) ? refOf(value) : value
  ) as typeof content

  const layoutId =
    page.layout?.mode === "specific" && typeof page.layout.layout === "number"
      ? page.layout.layout
      : null
  const layoutName = layoutId
    ? await payload
        .findByID({
          collection: "layouts",
          id: layoutId,
          depth: 0,
          select: { name: true },
          ...access,
        })
        .then((layout) => layout.name)
        .catch(() => undefined)
    : undefined

  const file: PageFile = {
    awaydayPage: 1,
    title: page.title,
    path: page.path,
    ...(page.isTemplate ? { isTemplate: true } : {}),
    layout: {
      mode: page.layout?.mode ?? "route",
      ...(layoutName ? { name: layoutName } : {}),
    },
    seo: portable.seo as PageFile["seo"],
    blocks: withoutRowIds(portable.blocks) as unknown[],
  }
  const slug =
    page.path === "/"
      ? "home"
      : page.path.replace(/^\//, "").replace(/\//g, "-") || "page"
  return {
    ok: true,
    filename: `${slug}.page.json`,
    json: `${JSON.stringify(file, null, 2)}\n`,
  }
}

/** The first path from `wanted`, "wanted-2", "wanted-3"… that no Page has. */
export async function freePagePath(
  payload: Payload,
  access: Access,
  wanted: string
): Promise<string> {
  const taken = async (path: string) => {
    for (const draft of [true, false]) {
      const { totalDocs } = await payload.count({
        collection: "pages",
        where: { path: { equals: path } },
        draft,
        ...access,
      } as never)
      if (totalDocs > 0) return true
    }
    return false
  }
  if (!(await taken(wanted))) return wanted
  const base = wanted === "/" ? "/home" : wanted
  for (let n = 2; n < 1000; n++) {
    const path = `${base}-${n}`
    if (!(await taken(path))) return path
  }
  return `${base}-${Date.now()}`
}

/**
 * Adds a Page file to the Site as a new Draft. A file that isn't a Page, has
 * a Block this Site doesn't have, or would not save is refused with the
 * reason. Images and a picked Layout the Site doesn't have are left out and
 * named in `notes`.
 */
export async function importPageAs(
  payload: Payload,
  access: Access,
  text: unknown
): Promise<ImportResult> {
  if (typeof text !== "string" || text.length > IMPORT_MAX_BYTES) {
    return { ok: false, message: "That file is too large to be a Page." }
  }
  let file: Partial<PageFile>
  try {
    file = JSON.parse(text) as Partial<PageFile>
  } catch {
    return { ok: false, message: "That file isn't a Page: it isn't JSON." }
  }
  if (!isRecord(file) || file.awaydayPage !== 1) {
    return {
      ok: false,
      message:
        "That file isn't a Page exported from an Awayday Site (or it is from a newer version).",
    }
  }
  const title = typeof file.title === "string" ? file.title.trim() : ""
  if (!title)
    return { ok: false, message: "The Page in the file has no title." }
  const wanted = typeof file.path === "string" ? file.path.trim() : ""
  const shape = checkPagePath(wanted)
  if (shape !== true) {
    return { ok: false, message: `The Page's path can't be used. ${shape}` }
  }
  const blocks = Array.isArray(file.blocks) ? file.blocks : []
  const refused = refusedBlock(blocks, pageBlocks)
  if (refused) return { ok: false, message: refused.message }

  const notes: string[] = []
  try {
    // Images, by file name.
    const content = { blocks, seo: isRecord(file.seo) ? file.seo : {} }
    const wantedFiles = new Set<string>()
    rewriteFields(CONTENT, content, ({ field, value }) => {
      if (pointsAtMedia(field)) {
        for (const one of [value].flat()) {
          if (isMediaRef(one)) wantedFiles.add(one.$media.filename)
        }
      }
      return value
    })
    const media =
      wantedFiles.size === 0
        ? []
        : (
            await payload.find({
              collection: "media",
              where: { filename: { in: [...wantedFiles] } },
              pagination: false,
              depth: 0,
              select: { filename: true },
              ...access,
            })
          ).docs
    const missing = new Set<string>()
    const idOf = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(idOf).filter((v) => v != null)
      if (!isMediaRef(value)) return null
      const found = media.find((doc) => doc.filename === value.$media.filename)
      if (!found) missing.add(value.$media.filename)
      return found?.id ?? null
    }
    const local = rewriteFields(CONTENT, content, ({ field, value }) =>
      pointsAtMedia(field) && value != null ? idOf(value) : value
    ) as typeof content
    if (missing.size > 0) {
      const names = [...missing].sort()
      notes.push(
        `${names.length === 1 ? "An image is" : `${names.length} images are`} not in this Site's Media and ${names.length === 1 ? "was" : "were"} left out: ${names.join(", ")}. Upload ${names.length === 1 ? "it" : "them"} and pick ${names.length === 1 ? "it" : "them"} again.`
      )
    }

    // The Layout it picked, by name.
    const mode = isRecord(file.layout) ? file.layout.mode : undefined
    const layoutName = isRecord(file.layout) ? file.layout.name : undefined
    let layout: { mode: "route" | "specific" | "none"; layout?: number } = {
      mode: mode === "none" ? "none" : "route",
    }
    if (mode === "specific") {
      const found =
        typeof layoutName === "string"
          ? (
              await payload.find({
                collection: "layouts",
                where: { name: { equals: layoutName } },
                limit: 1,
                depth: 0,
                select: { name: true },
                ...access,
              })
            ).docs[0]
          : undefined
      if (found) layout = { mode: "specific", layout: found.id }
      else {
        notes.push(
          `This Site has no Layout called “${String(layoutName ?? "")}”, so the Page uses the Layout for its path.`
        )
      }
    }

    const path = await freePagePath(payload, access, wanted)
    if (path !== wanted) {
      notes.push(`“${wanted}” is taken, so the Page is at “${path}”.`)
    }
    const created = await payload.create({
      collection: "pages",
      data: {
        title,
        path,
        blocks: local.blocks as never,
        seo: local.seo as never,
        layout: layout as never,
        isTemplate: file.isTemplate === true,
        _status: "draft",
      },
      draft: true,
      depth: 0,
      ...access,
    })
    return {
      ok: true,
      message: `Imported “${title}” as a Draft at ${path}.`,
      id: created.id,
      notes,
    }
  } catch (error) {
    const state = formStateFromError(error)
    const fields = Object.entries(state.fieldErrors ?? {})
      .map(([field, message]) => `${field}: ${message}`)
      .join("; ")
    return {
      ok: false,
      message:
        `The Page can't be imported. ${fields || state.message || ""}`.trim(),
    }
  }
}
