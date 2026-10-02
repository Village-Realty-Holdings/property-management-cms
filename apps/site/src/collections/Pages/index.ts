import type { CollectionConfig } from "payload"

import { publishedOrSignedIn, signedIn } from "../../access"
import { pageBlocks } from "../../blocks"
import { takesOnly } from "../../blocks/Container"
import { NOT_PROSE } from "../../fields/prose"
import { seoField } from "../../fields/seo"
import { layoutField } from "./layoutField"
import { refuseDeleteWhenLinked } from "./navigationGuard"
import { defaultPathFromTitle, validatePagePath } from "./path"

/** Why a Page Template won't publish. */
export const TEMPLATE_IS_NOT_PUBLISHED =
  "A Page Template can't be published. Turn off Page Template first."

/**
 * A page of the Site at its own path, composed from Blocks: "/" for Home,
 * "/about", "/company/team". Staff Users edit the Draft; visitors see the
 * Published version only.
 */
export const Pages: CollectionConfig = {
  slug: "pages",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "path", "_status", "updatedAt"],
    listSearchableFields: ["title", "path"],
  },
  access: {
    create: signedIn,
    read: publishedOrSignedIn,
    update: signedIn,
    delete: signedIn,
    readVersions: signedIn,
  },
  hooks: { beforeDelete: [refuseDeleteWhenLinked] },
  versions: {
    // Validate Drafts too, so a Draft can't hold a path that won't publish.
    drafts: { autosave: false, validate: true },
    maxPerDoc: 20,
  },
  fields: [
    { name: "title", type: "text", required: true },
    {
      name: "path",
      type: "text",
      required: true,
      unique: true,
      validate: validatePagePath,
      custom: NOT_PROSE,
      hooks: { beforeValidate: [defaultPathFromTitle] },
      admin: {
        position: "sidebar",
        placeholder: "/about",
        description:
          'URL path on the Site: "/" for Home, "/about". Filled in from the title when left empty.',
      },
    },
    {
      name: "blocks",
      label: "Blocks",
      type: "blocks",
      labels: { singular: "Block", plural: "Blocks" },
      blocks: pageBlocks,
      validate: takesOnly(pageBlocks, "a Page"),
    },
    layoutField(),
    seoField(),
    {
      // A Page Template is a Page: one that new Pages can start from a copy
      // of, and that stays off the Site.
      name: "isTemplate",
      label: "Page Template",
      type: "checkbox",
      defaultValue: false,
      validate: (value: unknown, { data }: { data: unknown }) =>
        value === true &&
        (data as { _status?: string } | undefined)?._status === "published"
          ? TEMPLATE_IS_NOT_PUBLISHED
          : true,
      admin: {
        position: "sidebar",
        description:
          "New Pages can start from a copy of this Page. A Page Template is never published.",
      },
    },
  ],
}
