import type { CollectionConfig, Field, GroupField } from "payload"

import {
  publishedForReader,
  staffOfSite,
  staffVersionsOfSite,
} from "../../access"
import { revalidationHooks, tagPresets } from "../../revalidation"
import { pageBlocks } from "../../blocks"
import { sameSite } from "../../blocks/sameSite"
import { seoField } from "../../fields/seo"
import { applyPageTemplate, pageTemplateField } from "../../pageTemplates"
import { previewAdmin } from "../../preview"
import { defaultPathFromTitle } from "./defaultPath"
import { validatePagePath } from "./path"
import { validateVariables, variablesHelpField } from "../../variables"
import { siteColumn } from "./siteColumn"

/**
 * A standalone Site page (Home, About, FAQ…) composed from Blocks.
 * `path` is unique per Site: "/" for Home, "/about", "/company/team".
 * SiteReaders see Published Pages only; Drafts are for Staff Users.
 * Preview goes through the CMS (src/preview), which redirects to the Site
 * with a short-lived signed token; Editors never see the Site's secret.
 */
export const Pages: CollectionConfig = {
  slug: "pages",
  admin: {
    useAsTitle: "title",
    defaultColumns: [
      "title",
      "path",
      "siteName",
      "showInNav",
      "_status",
      "updatedAt",
    ],
    listSearchableFields: ["title", "path"],
    group: "Content",
    // The Preview button and the Live Preview panel (ADR-0018).
    ...previewAdmin("pages"),
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
    beforeValidate: [applyPageTemplate],
    beforeChange: [validateVariables],
    ...revalidationHooks(tagPresets.pages),
  },
  versions: {
    // Validate Drafts too: otherwise a Draft skips the path checks and the
    // same-Site checks on Block relationships until it is published.
    // No autosave: with validation on, a Block just added (empty required
    // fields) shows errors at once. The Live Preview refreshes on Save.
    drafts: { autosave: false, validate: true },
    maxPerDoc: 20,
  },
  indexes: [{ fields: ["site", "path"], unique: true }],
  fields: [
    { name: "title", type: "text", required: true },
    {
      name: "path",
      type: "text",
      required: true,
      index: true,
      validate: validatePagePath,
      hooks: { beforeValidate: [defaultPathFromTitle] },
      admin: {
        position: "sidebar",
        placeholder: "/about",
        description:
          'URL path on the Site: "/" for Home, "/about". Filled in from the title until you change it.',
        components: { Field: "/collections/Pages/PathField#PagePathField" },
      },
    },
    pageTemplateField,
    {
      name: "showInNav",
      label: "Show in navigation",
      type: "checkbox",
      defaultValue: false,
      admin: {
        position: "sidebar",
        components: {
          Cell: "/collections/Properties/admin/YesNoCell#YesNoCell",
        },
      },
    },
    {
      name: "navOrder",
      label: "Navigation order",
      type: "number",
      admin: {
        position: "sidebar",
        step: 1,
        description: "Lower comes first.",
        condition: (_, siblingData) => Boolean(siblingData?.showInNav),
      },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Content",
          fields: [
            {
              name: "layout",
              label: "Blocks",
              type: "blocks",
              // "Add Block", not "Add Layout".
              labels: { singular: "Block", plural: "Blocks" },
              blocks: pageBlocks,
            },
          ],
        },
        { label: "SEO", fields: [withSameSiteUploads(seoField())] },
      ],
    },
    variablesHelpField(),
    siteColumn(),
  ],
}

/** Limits the group's upload fields (`seo.image`) to the Page's Site. */
function withSameSiteUploads(group: GroupField): GroupField {
  return {
    ...group,
    fields: group.fields.map(
      (field): Field =>
        field.type === "upload" ? { ...field, filterOptions: sameSite } : field
    ),
  }
}
