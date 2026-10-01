import type { CollectionConfig } from "payload"

import { syncOnly, vocabularyRead } from "../access"
import { revalidationHooks, tagPresets } from "../revalidation"
import { hiddenFromEditors } from "./Amenities"

/**
 * The Awayday-wide Property Type vocabulary, mirrored from the Property Feed.
 * Shared by every Site (NOT Site-scoped) and written only by the Sync
 * (ADR-0013). Per-Site labels live on Sites › Properties › Property Type
 * labels.
 */
export const PropertyTypes: CollectionConfig = {
  slug: "property-types",
  labels: { singular: "Property Type", plural: "Property Types" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "status", "feedId"],
    group: "Property Feed",
    hidden: hiddenFromEditors,
    description:
      "The Awayday-wide Property Type list, mirrored from the Property Feed. Read-only here: new types are added in the Feed. Each Site can relabel them under Sites › Properties › Property Type labels.",
  },
  access: {
    create: syncOnly,
    read: vocabularyRead,
    update: syncOnly,
    delete: syncOnly,
    unlock: syncOnly,
  },
  hooks: revalidationHooks(tagPresets["property-types"]),
  fields: [
    {
      name: "feedId",
      label: "Feed ID",
      type: "text",
      required: true,
      unique: true,
    },
    { name: "name", type: "text", required: true },
    {
      name: "status",
      type: "select",
      defaultValue: "active",
      options: [
        { label: "Active", value: "active" },
        { label: "Withdrawn", value: "withdrawn" },
      ],
      admin: {
        position: "sidebar",
        description: "Withdrawn when the Feed drops the Property Type.",
      },
    },
  ],
}
