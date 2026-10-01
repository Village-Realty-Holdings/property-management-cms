import type { Payload, TypedUser } from "payload"

import type { Layout } from "../payload-types"
import { saveLayout } from "./record"

/**
 * Duplicate, and "Make a new Layout from this one" (apps/site ADR-0006). Both
 * copy a Layout under a new name, as the Staff User (ADR-0002).
 */

type Staff = TypedUser

const key = (name: string) => name.trim().toLowerCase()

async function layoutNames(
  payload: Payload,
  user: Staff
): Promise<Set<string>> {
  const { docs } = await payload.find({
    collection: "layouts",
    pagination: false,
    depth: 0,
    select: { name: true },
    overrideAccess: false,
    user,
  })
  return new Set(docs.map((doc) => key(doc.name)))
}

/** "Main (copy)", then "Main (copy 2)", "Main (copy 3)" ... the first one free. */
function copyName(name: string, taken: ReadonlySet<string>): string {
  const first = `${name} (copy)`
  if (!taken.has(key(first))) return first
  for (let n = 2; ; n++) {
    const candidate = `${name} (copy ${n})`
    if (!taken.has(key(candidate))) return candidate
  }
}

/**
 * Block rows carry generated ids, and a row id belongs to one row: a copy
 * gets fresh ones. Only string ids go (rows); a relationship's id is a number.
 */
export function withoutRowIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutRowIds) as T
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([field, entry]) => !(field === "id" && typeof entry === "string")
        )
        .map(([field, entry]) => [field, withoutRowIds(entry)])
    ) as T
  }
  return value
}

/**
 * Copies a Layout: its Header and Footer under a new name. The copy is never
 * the default and has no paths, so it doesn't take over any route until Staff
 * give it some. `name` defaults to "<name> (copy)", numbered when that is
 * taken; a name that is given must be free (any letter case).
 */
export async function duplicateLayout(
  payload: Payload,
  options: { user: Staff; id: number; name?: string | null }
): Promise<Layout> {
  const { user } = options
  const source = await payload.findByID({
    collection: "layouts",
    id: options.id,
    depth: 0,
    overrideAccess: false,
    user,
  })
  const taken = await layoutNames(payload, user)

  let name: string
  if (options.name == null) {
    name = copyName(source.name, taken)
  } else {
    name = options.name.trim()
    if (!name) throw new Error("Give the new Layout a name.")
    if (taken.has(key(name))) {
      throw new Error(`A Layout named "${name}" already exists.`)
    }
  }

  return saveLayout(payload, {
    user,
    data: {
      name,
      header: withoutRowIds(source.header ?? []),
      footer: withoutRowIds(source.footer ?? []),
      paths: [],
      isDefault: false,
    },
  })
}

/**
 * "Make a new Layout from this one": copies `layoutId` under `name`, then
 * switches the Page's Draft to the copy (mode "specific"). Publishing the
 * Page is left to Staff. When the Page can't be switched, the copy is removed
 * again and the error is passed on.
 */
export async function makeLayoutFromPage(
  payload: Payload,
  options: { user: Staff; pageId: number; layoutId: number; name: string }
): Promise<Layout> {
  const { user, pageId } = options
  // Fail before copying anything when the Page isn't there.
  await payload.findByID({
    collection: "pages",
    id: pageId,
    draft: true,
    depth: 0,
    select: { title: true },
    overrideAccess: false,
    user,
  })

  const copy = await duplicateLayout(payload, {
    user,
    id: options.layoutId,
    name: options.name,
  })
  try {
    await payload.update({
      collection: "pages",
      id: pageId,
      data: { layout: { mode: "specific", layout: copy.id } },
      draft: true,
      depth: 0,
      overrideAccess: false,
      user,
    })
  } catch (error) {
    // Nothing picks the copy yet, so it deletes.
    await payload
      .delete({
        collection: "layouts",
        id: copy.id,
        overrideAccess: false,
        user,
      })
      .catch(() => {})
    throw error
  }
  return copy
}
