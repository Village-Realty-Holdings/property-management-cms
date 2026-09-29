import type { CollectionConfig, FieldHook } from "payload"

import { publishedForReader, staffOfSite, staffVersionsOfSite } from "../access"
import { revalidationHooks, tagPresets } from "../revalidation"
import { sameSite } from "../fields/rule"
import { seoField } from "../fields/seo"
import { previewAdmin } from "../preview"
import { slugField } from "../fields/slug"
import { validateVariables, variablesHelpField } from "../variables"
import { siteColumn } from "./Pages/siteColumn"

/**
 * Defaults `publishedAt` to now when a Guide is first published. Keeps the
 * stored date when an update leaves it out.
 */
const setPublishedAt: FieldHook = ({ originalDoc, siblingData, value }) => {
  if (value) return value
  // Left out of a partial update (not cleared): keep the stored date.
  const stored = (originalDoc as { publishedAt?: string | null } | undefined)
    ?.publishedAt
  if (value === undefined && stored) return stored
  const status = (siblingData as { _status?: string } | undefined)?._status
  return status === "published" ? new Date().toISOString() : value
}

/**
 * An editorial article that can relate to Locations and Properties
 * (for example, "Best walks near Park City").
 */
export const Guides: CollectionConfig = {
  slug: "guides",
  admin: {
    useAsTitle: "title",
    defaultColumns: [
      "title",
      "slug",
      "siteName",
      "publishedAt",
      "_status",
      "updatedAt",
    ],
    listSearchableFields: ["title", "slug", "excerpt"],
    group: "Content",
    // The Preview button and the Live Preview panel (ADR-0018).
    ...previewAdmin("guides"),
  },
  access: {
    create: staffOfSite,
    read: publishedForReader,
    update: staffOfSite,
    delete: staffOfSite,
    readVersions: staffVersionsOfSite,
    unlock: staffOfSite,
  },
  hooks: {
    // Unknown Variables block publishing (ADR-0017).
    beforeChange: [validateVariables],
    ...revalidationHooks(tagPresets.guides),
  },
  versions: {
    // As Pages, plus autosave. Validating Drafts keeps the same-Site checks
    // on relationships from being skipped until the Guide is published.
    drafts: { autosave: true, validate: true },
    maxPerDoc: 20,
  },
  defaultSort: "-publishedAt",
  indexes: [{ fields: ["site", "slug"], unique: true }],
  fields: [
    { name: "title", type: "text", required: true },
    slugField(),
    {
      name: "publishedAt",
      label: "Published",
      type: "date",
      index: true,
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayOnly" },
        description: "Set when first published. Used to order Guides.",
      },
      hooks: { beforeChange: [setPublishedAt] },
    },
    {
      name: "locations",
      type: "relationship",
      relationTo: "locations",
      hasMany: true,
      filterOptions: sameSite,
      admin: { position: "sidebar" },
    },
    {
      name: "properties",
      type: "relationship",
      relationTo: "properties",
      hasMany: true,
      filterOptions: sameSite,
      admin: { position: "sidebar" },
    },
    // Unnamed tabs: the fields keep their top-level paths and columns.
    {
      type: "tabs",
      tabs: [
        {
          label: "Content",
          fields: [
            {
              name: "excerpt",
              type: "textarea",
              admin: {
                description: "A short summary for Guide lists and cards.",
              },
            },
            {
              name: "heroImage",
              label: "Hero image",
              type: "upload",
              relationTo: "media",
              filterOptions: sameSite,
            },
            { name: "body", type: "richText" },
          ],
        },
        { label: "SEO", fields: [seoField()] },
      ],
    },
    variablesHelpField(),
    siteColumn(),
  ],
}
