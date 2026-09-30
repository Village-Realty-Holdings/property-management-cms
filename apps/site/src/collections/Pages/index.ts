import type { CollectionConfig } from "payload"

import { publishedOrSignedIn, signedIn } from "../../access"
import { pageBlocks } from "../../blocks"
import { seoField } from "../../fields/seo"
import { defaultPathFromTitle, validatePagePath } from "./path"

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
    },
    seoField(),
  ],
}
