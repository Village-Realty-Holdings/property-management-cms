import { existsSync } from "node:fs"
import { rm } from "node:fs/promises"
import path from "node:path"

import type { DataFromCollectionSlug, Payload, TypedUser } from "payload"

import { findOrCreateStaffUser } from "../auth/staffUser"
import type { FetchLike } from "../fonts/googleFonts"
import {
  importGoogleFont,
  type ImportGoogleFontInput,
} from "../fonts/importGoogleFont"
import type {
  Brand,
  Font,
  Layout,
  Media,
  Page,
  Seo,
  User,
} from "../payload-types"
import type { ThemeInputs } from "../theme"
import { saveTheme } from "../theme/record"

/**
 * Idempotent seeding helpers (apps/site ADR-0005: one Site per schema, and
 * seeds recreate its content). Each one looks the record up by its natural
 * key and writes only when what is stored differs from what the seed says, so
 * running a seed a second time changes nothing: no new rows, no new
 * versions, no rewritten timestamps.
 *
 *   Brand, SEO   the globals (there is one of each)
 *   Theme        the live inputs
 *   Font         the family name
 *   Media        the file name
 *   Layout       the name
 *   Page         the path
 *
 * Everything goes through the Local API as a seed Staff User (ADR-0002), so
 * the same access rules and hooks apply as in the Admin.
 */

export type SeedUser = User & { collection: "users" }

type Action = "created" | "updated" | "unchanged"

/** What a helper did: the record, and whether it was written. */
export type Upserted<T> = { doc: T; id: number; action: Action }

type Content<T> = Partial<
  Omit<T, "id" | "createdAt" | "updatedAt" | "sizes" | "deletedAt">
>

export type BrandData = Content<Brand>
export type SeoData = Content<Seo>
export type LayoutData = Content<
  Omit<Layout, "note" | "changeSummary" | "updatedBy">
> & { name: string }
export type PageData = Content<Omit<Page, "_status">> & {
  path: string
  title: string
}
export type MediaData = {
  /** Path of the file to upload. Its base name is the Media's natural key. */
  file: string
  alt: string
  caption?: string
  credit?: string
}

export type Seeder = {
  payload: Payload
  user: SeedUser
  /** One entry per record the seed looked at, in order. */
  report: { kind: string; key: string; action: Action }[]
  brand: (data: BrandData) => Promise<{ action: Action }>
  seo: (data: SeoData) => Promise<{ action: Action }>
  /** Saves the Theme's inputs as a new version only when they differ. */
  theme: (inputs: ThemeInputs) => Promise<{ action: Action }>
  /** Adds a Google Font unless a Font with that family is already stored. */
  font: (input: ImportGoogleFontInput) => Promise<Upserted<Font>>
  /** The Theme's key for a stored Font, `font:<id>`. */
  fontKey: (family: string) => Promise<string>
  media: (data: MediaData) => Promise<Upserted<Media>>
  layout: (data: LayoutData) => Promise<Upserted<Layout>>
  /** Creates or updates the Page, and publishes it. */
  page: (data: PageData) => Promise<Upserted<Page>>
}

/** The seed's own Staff User. */
export const SEED_STAFF_USER = {
  entraOid: "seed",
  email: "seed@awayday.test",
  name: "Seed",
} as const

export async function seedStaffUser(payload: Payload): Promise<SeedUser> {
  const user = await findOrCreateStaffUser(payload, SEED_STAFF_USER)
  return { ...user, collection: "users" }
}

const isEmpty = (value: unknown) =>
  value == null || value === "" || (Array.isArray(value) && value.length === 0)

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/**
 * Whether `existing` already says what `desired` says. Only what the seed
 * sets is compared, so defaults, timestamps and whatever Payload adds don't
 * count. Null, undefined, "" and an empty list all mean "nothing". The ids
 * Payload gives Blocks and array rows are ignored, and lists compare row by
 * row, in order.
 */
export function sameData(existing: unknown, desired: unknown): boolean {
  if (isEmpty(desired)) return isEmpty(existing)
  if (Array.isArray(desired)) {
    return (
      Array.isArray(existing) &&
      existing.length === desired.length &&
      desired.every((row, index) => sameData(existing[index], row))
    )
  }
  if (isObject(desired)) {
    const stored = isObject(existing) ? existing : {}
    return Object.entries(desired).every(
      ([key, value]) => key === "id" || sameData(stored[key], value)
    )
  }
  return existing === desired
}

/**
 * The file `filename` in the Media collection's local folder, when there is
 * one. Nothing with object storage, where no file is kept on disk.
 */
function strayLocalFile(payload: Payload, filename: string) {
  const { staticDir } = payload.collections.media.config.upload
  if (!staticDir) return undefined
  const file = path.resolve(staticDir, filename)
  return existsSync(file) ? file : undefined
}

type Options = {
  /** Stands in for `fetch` when importing a Google Font (tests). */
  fetch?: FetchLike
}

export function createSeeder(
  payload: Payload,
  user: SeedUser,
  options: Options = {}
): Seeder {
  const as = { overrideAccess: false, user: user as TypedUser } as const
  const report: Seeder["report"] = []

  function done<T>(
    kind: string,
    key: string,
    doc: T,
    id: number,
    action: Action
  ) {
    report.push({ kind, key, action })
    return { doc, id, action }
  }

  async function upsertGlobal(slug: "brand" | "seo", data: object) {
    const current = await payload.findGlobal({ slug, depth: 0, ...as })
    if (sameData(current, data))
      return done(slug, slug, current, 0, "unchanged")
    const doc = await payload.updateGlobal({
      slug,
      data: data as never,
      depth: 0,
      ...as,
    })
    return done(slug, slug, doc, 0, "updated")
  }

  async function findOne<C extends "fonts" | "media" | "layouts" | "pages">(
    collection: C,
    field: string,
    value: string
  ): Promise<DataFromCollectionSlug<C> | undefined> {
    const { docs } = await payload.find({
      collection,
      where: { [field]: { equals: value } },
      limit: 1,
      depth: 0,
      pagination: false,
      ...as,
    })
    return docs[0]
  }

  return {
    payload,
    user,
    report,

    brand: (data) => upsertGlobal("brand", data),
    seo: (data) => upsertGlobal("seo", data),

    async theme(inputs) {
      const saved = await saveTheme(payload, {
        user: user as TypedUser,
        inputs,
      })
      return done(
        "theme",
        "theme",
        saved,
        0,
        saved.changed ? "updated" : "unchanged"
      )
    },

    async font(input) {
      const existing = await findOne("fonts", "family", input.family)
      if (existing) {
        return done("font", input.family, existing, existing.id, "unchanged")
      }
      const doc = await importGoogleFont(payload, input, {
        fetch: options.fetch,
        as,
      })
      return done("font", input.family, doc, doc.id, "created")
    },

    async fontKey(family) {
      const font = await findOne("fonts", "family", family)
      if (!font) {
        throw new Error(
          `The seed asked for the Font "${family}", but no Font has that family. Add it with seed.font() first.`
        )
      }
      return `font:${font.id}`
    },

    async media({ file, ...fields }) {
      const filename = path.basename(file)
      const existing = await findOne("media", "filename", filename)
      if (!existing) {
        const create = () =>
          payload.create({
            collection: "media",
            data: fields,
            filePath: path.resolve(file),
            depth: 0,
            ...as,
          })
        const discard = (id: number) =>
          payload.delete({ collection: "media", id, ...as })
        let doc = await create()
        if (doc.filename !== filename) {
          // Payload picked another name because a file with this one is
          // already on disk. No row has the name (we just looked), so the
          // file is left over from a dropped schema: local uploads live in
          // `media/<schema>/`, which dropping the schema doesn't clear.
          // Remove it and upload again, or every reseed would add a copy.
          const stored = doc.filename
          await discard(doc.id)
          const leftover = strayLocalFile(payload, filename)
          if (!leftover) {
            throw new Error(
              `Uploading "${filename}" stored it as "${stored}" because that name is taken. Clear the Site's media folder (media/<schema>/) and seed again.`
            )
          }
          await rm(leftover)
          doc = await create()
          if (doc.filename !== filename) {
            const stored = doc.filename
            await discard(doc.id)
            throw new Error(
              `Uploading "${filename}" stored it as "${stored}". Clear the Site's media folder (media/<schema>/) and seed again.`
            )
          }
        }
        return done("media", filename, doc, doc.id, "created")
      }
      if (sameData(existing, fields)) {
        return done("media", filename, existing, existing.id, "unchanged")
      }
      const doc = await payload.update({
        collection: "media",
        id: existing.id,
        data: fields,
        depth: 0,
        ...as,
      })
      return done("media", filename, doc, doc.id, "updated")
    },

    async layout(data) {
      const existing = await findOne("layouts", "name", data.name)
      if (!existing) {
        const doc = await payload.create({
          collection: "layouts",
          data: data as never,
          depth: 0,
          ...as,
        })
        return done("layout", data.name, doc, doc.id, "created")
      }
      if (sameData(existing, data)) {
        return done("layout", data.name, existing, existing.id, "unchanged")
      }
      const doc = await payload.update({
        collection: "layouts",
        id: existing.id,
        data: data as never,
        depth: 0,
        ...as,
      })
      return done("layout", data.name, doc, doc.id, "updated")
    },

    async page(data) {
      const existing = await findOne("pages", "path", data.path)
      const published = { ...data, _status: "published" as const }
      if (!existing) {
        const doc = await payload.create({
          collection: "pages",
          data: published as never,
          draft: false,
          depth: 0,
          ...as,
        })
        return done("page", data.path, doc, doc.id, "created")
      }
      if (sameData(existing, published)) {
        return done("page", data.path, existing, existing.id, "unchanged")
      }
      const doc = await payload.update({
        collection: "pages",
        id: existing.id,
        data: published as never,
        draft: false,
        depth: 0,
        ...as,
      })
      return done("page", data.path, doc, doc.id, "updated")
    },
  }
}
