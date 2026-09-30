import type { CollectionConfig } from "payload"

import { anyone, signedIn } from "../../access"
import { footerBlocks, headerBlocks } from "../../blocks/region"
import {
  clearPreviousDefault,
  firstLayoutIsDefault,
  recordVersionDetails,
  validateIsDefault,
} from "./hooks"
import { normalizeLayoutPath, validateLayoutPath } from "./paths"

const staffOnly = ({ req }: { req: { user?: unknown } }) => Boolean(req.user)

/**
 * A Layout: the Header and Footer around Pages (apps/site ADR-0006). One is
 * the Site's default; others cover the Pages under their path prefixes, or
 * are picked by a Page. Like the Theme (ADR-0004) it has a version history
 * and no Drafts: a save goes live at once, and restoring an earlier version
 * saves it again as a new version, so the history only grows.
 */
export const Layouts: CollectionConfig = {
  slug: "layouts",
  labels: { singular: "Layout", plural: "Layouts" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "paths", "isDefault", "updatedAt"],
    listSearchableFields: ["name"],
  },
  access: {
    create: signedIn,
    read: anyone,
    update: signedIn,
    delete: signedIn,
    readVersions: signedIn,
  },
  // Every version is kept (0 means no limit): the history lists them all.
  versions: { maxPerDoc: 0 },
  hooks: {
    beforeValidate: [firstLayoutIsDefault],
    beforeChange: [recordVersionDetails],
    afterChange: [clearPreviousDefault],
  },
  fields: [
    { name: "name", type: "text", required: true },
    {
      name: "header",
      label: "Header",
      type: "blocks",
      labels: { singular: "Header Block", plural: "Header Blocks" },
      blocks: headerBlocks,
    },
    {
      name: "footer",
      label: "Footer",
      type: "blocks",
      labels: { singular: "Footer Block", plural: "Footer Blocks" },
      blocks: footerBlocks,
    },
    {
      name: "paths",
      type: "array",
      labels: { singular: "Path", plural: "Paths" },
      admin: {
        description:
          'Pages at or under these paths use this Layout, like "/stays". The longest match wins. A path belongs to one Layout.',
      },
      fields: [
        {
          name: "path",
          type: "text",
          required: true,
          validate: validateLayoutPath,
          hooks: { beforeValidate: [normalizeLayoutPath] },
          admin: { placeholder: "/stays" },
        },
      ],
    },
    {
      name: "isDefault",
      label: "Default Layout",
      type: "checkbox",
      defaultValue: false,
      validate: validateIsDefault,
      admin: {
        position: "sidebar",
        description:
          "Pages that no path or choice covers use the default. There is always exactly one: making another Layout the default clears this one.",
      },
    },
    {
      name: "note",
      type: "text",
      maxLength: 500,
      access: { read: staffOnly },
      admin: {
        position: "sidebar",
        description:
          "Optional. Replaces the automatic summary of this save in the history.",
      },
    },
    {
      name: "changeSummary",
      type: "text",
      access: { read: staffOnly },
      admin: { readOnly: true, position: "sidebar" },
    },
    {
      name: "updatedBy",
      label: "Saved by",
      type: "relationship",
      relationTo: "users",
      access: { read: staffOnly },
      admin: { readOnly: true, position: "sidebar" },
    },
  ],
}
