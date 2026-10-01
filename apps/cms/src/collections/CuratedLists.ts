import type { CollectionConfig } from "payload"

import { publishedForReader, staffOfSite, staffVersionsOfSite } from "../access"
import { revalidationHooks, tagPresets } from "../revalidation"
import { ruleField, sameSite } from "../fields/rule"
import { seoField } from "../fields/seo"
import { previewAdmin } from "../preview"
import { slugField } from "../fields/slug"
import { siteColumn } from "./Pages/siteColumn"

/**
 * A named, themed set of Properties defined by a rule over Property Facts and
 * Location, resolved at read time (ADR-0003). There are no hand-picked
 * members: `@workspace/content/shared` `curatedListWhere` compiles the rule.
 */
export const CuratedLists: CollectionConfig = {
  slug: "curated-lists",
  labels: { singular: "Curated List", plural: "Curated Lists" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "siteName", "_status", "updatedAt"],
    listSearchableFields: ["title", "slug"],
    group: "Content",
    // The Preview button and the Live Preview panel (ADR-0018).
    ...previewAdmin("curated-lists"),
  },
  access: {
    create: staffOfSite,
    read: publishedForReader,
    update: staffOfSite,
    delete: staffOfSite,
    readVersions: staffVersionsOfSite,
    unlock: staffOfSite,
  },
  hooks: revalidationHooks(tagPresets["curated-lists"]),
  versions: {
    // As Pages: Drafts are validated too, so the same-Site checks on the
    // rule's relationships aren't skipped until the list is published.
    drafts: { autosave: true, validate: true },
    maxPerDoc: 20,
  },
  indexes: [{ fields: ["site", "slug"], unique: true }],
  fields: [
    { name: "title", type: "text", required: true },
    slugField(),
    {
      name: "sort",
      type: "select",
      defaultValue: "featured",
      options: [
        { label: "Featured", value: "featured" },
        { label: "Rating", value: "rating" },
        { label: "Sleeps", value: "sleeps" },
        { label: "Bedrooms", value: "bedrooms" },
        { label: "Name", value: "name" },
      ],
      admin: {
        position: "sidebar",
        description: "Order of the Properties in the list. Empty: Featured.",
      },
    },
    // Unnamed tabs: the fields keep their top-level paths and columns.
    {
      type: "tabs",
      tabs: [
        {
          label: "Content",
          fields: [
            {
              name: "heroImage",
              label: "Hero image",
              type: "upload",
              relationTo: "media",
              filterOptions: sameSite,
            },
            { name: "intro", type: "richText" },
            ruleField(),
          ],
        },
        { label: "SEO", fields: [seoField()] },
      ],
    },
    siteColumn(),
  ],
}
