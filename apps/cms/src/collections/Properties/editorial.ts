import type { Field, FilterOptionsProps, GroupField, Where } from "payload"

import { seoField } from "../../fields/seo"

/**
 * Editorial Content: written by Staff Users in the CMS and never written by
 * the Sync (ADR-0001). Every field may be empty: the Site falls back to
 * feed-provided text (ADR-0002). The slug and `featured` live in the sidebar
 * (see ./index.ts).
 */
export const editorialFields: Field[] = [
  {
    name: "headline",
    type: "text",
    admin: { description: "Shown instead of the feed name when set." },
  },
  {
    name: "summary",
    type: "textarea",
    admin: { description: "A short teaser for cards and search results." },
  },
  {
    name: "description",
    type: "richText",
    admin: {
      description: "Shown instead of the feed description when set.",
    },
  },
  {
    name: "highlights",
    type: "array",
    labels: { singular: "Highlight", plural: "Highlights" },
    fields: [{ name: "text", type: "text", required: true }],
  },
  sameSiteSeoImage(seoField()),
]

type SiteRef = number | string | { id: number | string } | null | undefined

/** Documents on the same Site as the document being edited. */
function onSameSite({ data }: FilterOptionsProps): Where | false {
  const site = (data as { site?: SiteRef } | undefined)?.site
  const id = site && typeof site === "object" ? site.id : site
  return id == null ? false : { site: { equals: id } }
}

/**
 * The multi-tenant plugin filters relationship fields by Site but not upload
 * fields, so limit `seo.image` to Media on the Property's own Site
 * (ADR-0010). Payload enforces `filterOptions` on save, not only in the admin.
 */
function sameSiteSeoImage(seo: GroupField): GroupField {
  return {
    ...seo,
    fields: seo.fields.map((field) =>
      field.type === "upload" && field.name === "image"
        ? { ...field, filterOptions: onSameSite }
        : field
    ),
  }
}
