import type { FieldHook, TextField } from "payload"

type SlugFieldOptions = {
  /** Field the slug is made from on create. @default "title" */
  from?: string
  /** @default "slug" */
  name?: string
  /** Admin description override. */
  description?: string
}

/** Lower-case, ASCII, hyphen-separated. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * A slug that is set once from `from` when the document is created and never
 * regenerated afterwards (ADR-0002: renaming a listing must not break URLs).
 * Staff Users can edit it. On create, a slug already used on the same Site
 * gets a `-2`, `-3`… suffix. Uniqueness per Site is enforced by the
 * collection's compound index (`indexes: [{ fields: ["site", "slug"], unique: true }]`).
 */
export function slugField({
  from = "title",
  name = "slug",
  description,
}: SlugFieldOptions = {}): TextField {
  return {
    name,
    type: "text",
    index: true,
    admin: {
      position: "sidebar",
      description:
        description ??
        "Part of the public URL. Set once when created; changing it changes the URL.",
    },
    hooks: {
      beforeValidate: [setSlugOnCreate(from, name)],
    },
  }
}

function setSlugOnCreate(from: string, name: string): FieldHook {
  return async ({
    collection,
    operation,
    previousValue,
    req,
    siblingData,
    value,
  }) => {
    if (typeof value === "string" && value.trim()) return slugify(value)
    // Never regenerate: clearing it on update keeps the current slug.
    if (operation !== "create") return previousValue ?? value
    const source = siblingData?.[from]
    if (typeof source !== "string" || !source.trim()) return value
    const base = slugify(source)
    if (!collection || !base) return base

    const site = (siblingData as { site?: unknown }).site
    for (let n = 1; n < 100; n++) {
      const candidate = n === 1 ? base : `${base}-${n}`
      const { totalDocs } = await req.payload.count({
        collection: collection.slug,
        req,
        where: {
          and: [
            { [name]: { equals: candidate } },
            ...(site == null ? [] : [{ site: { equals: extractId(site) } }]),
          ],
        },
      })
      if (totalDocs === 0) return candidate
    }
    return `${base}-${Date.now()}`
  }
}

function extractId(value: unknown): unknown {
  return value && typeof value === "object" && "id" in value
    ? (value as { id: unknown }).id
    : value
}
