import type {
  CollectionBeforeOperationHook,
  CollectionConfig,
  FieldHook,
  PayloadRequest,
} from "payload"

import { siteForReader, staffOfSite } from "../access"

type ID = number | string
type Ref = ID | { id: ID } | null | undefined

const idOf = (ref: Ref): ID | undefined =>
  ref && typeof ref === "object" ? ref.id : (ref ?? undefined)

/** The slug of the Site `ref` points to: the Media file's key prefix. */
async function siteSlugOf(
  req: PayloadRequest,
  ref: Ref
): Promise<string | undefined> {
  const id = idOf(ref)
  if (id === undefined) return undefined
  const site = await req.payload.findByID({
    collection: "sites",
    id,
    depth: 0,
    select: { slug: true },
    disableErrors: true,
    req,
  })
  return site?.slug || undefined
}

/**
 * Fills `prefix` before Payload picks the filename, so the "filename already
 * taken" check (which renames `hero.jpg` to `hero-1.jpg`) only looks at the
 * same Site's files. The `prefix` field hook below is what enforces the value.
 */
const prefillPrefix: CollectionBeforeOperationHook = async ({
  args,
  operation,
  req,
}) => {
  if ((operation !== "create" && operation !== "update") || !req.file) return
  // Mutated in place: the operation reads `args.data` after this hook.
  const { data, id } = args as {
    data?: { prefix?: unknown; site?: Ref }
    id?: ID
  }
  if (!data) return
  let site: Ref = data.site
  if (site === undefined && operation === "update" && id !== undefined) {
    const doc = await req.payload.findByID({
      collection: "media",
      id,
      depth: 0,
      select: { site: true },
      disableErrors: true,
      req,
    })
    site = doc?.site
  }
  const slug = await siteSlugOf(req, site)
  if (slug) data.prefix = slug
}

/**
 * `prefix` is always the Site's slug when a file is stored, whatever the
 * caller sent, and never changes afterwards (the object would be orphaned
 * at its old key if the Site's slug changed).
 */
const prefixFromSite: FieldHook = async ({
  operation,
  previousValue,
  req,
  siblingData,
  originalDoc,
}) => {
  if (operation === "create" || req.file) {
    const site = (siblingData as { site?: Ref }).site ?? originalDoc?.site
    return (await siteSlugOf(req, site)) ?? ""
  }
  return previousValue
}

/**
 * Editorial imagery only: Pages, Guides, Locations, Curated Lists and
 * Specials. Property photos stay on the Feed's hosts (ADR-0008).
 * No image sizes, crop or focal point (no sharp, ADR-0015): images are
 * transformed at delivery by Cloudflare Images.
 *
 * Each file belongs to one Site (the multi-tenant plugin's `site` field) and
 * is stored under the key `<siteSlug>/<filename>` in object storage
 * (src/storage.ts). Two Sites may both upload `hero.jpg`: filenames are
 * unique per `prefix`, not globally. On local disk (dev) the files share one
 * folder, so Payload renames the second one to `hero-1.jpg`.
 */
export const Media: CollectionConfig = {
  slug: "media",
  admin: {
    group: "Content",
    useAsTitle: "filename",
    defaultColumns: ["filename", "alt", "site", "updatedAt"],
    listSearchableFields: ["alt", "filename"],
  },
  access: {
    create: staffOfSite,
    read: siteForReader,
    update: staffOfSite,
    delete: staffOfSite,
    unlock: staffOfSite,
  },
  hooks: {
    beforeOperation: [prefillPrefix],
  },
  upload: {
    // Photos only: no SVG (it can carry scripts) and no GIF.
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
    crop: false,
    focalPoint: false,
    // Replaces the global unique index on `filename`.
    filenameCompoundIndex: ["filename", "prefix"],
  },
  fields: [
    {
      name: "alt",
      label: "Alt text",
      type: "text",
      required: true,
      admin: {
        description:
          'Describe what the image shows for people who can\'t see it, in a short sentence, e.g. "Hot tub on a snowy deck overlooking the mountains". Don\'t start with "Image of" or repeat the caption.',
      },
    },
    {
      name: "caption",
      type: "text",
    },
    {
      name: "credit",
      type: "text",
      admin: { description: "Photographer or source, e.g. © Jane Doe" },
    },
    // Storage fields. The S3 storage plugin adds these too; declaring them
    // here keeps the database schema (and migrations) the same whether or
    // not object storage is configured.
    {
      name: "prefix",
      type: "text",
      index: true,
      admin: { hidden: true, readOnly: true },
      hooks: { beforeChange: [prefixFromSite] },
    },
    {
      name: "_objectKey",
      type: "text",
      admin: { hidden: true, readOnly: true },
    },
  ],
}
