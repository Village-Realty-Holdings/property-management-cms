import type { ClientUser, CollectionConfig } from "payload"

import { syncOnly, vocabularyRead } from "../access"
import { revalidationHooks, tagPresets } from "../revalidation"

/**
 * Admin nav visibility (not access) for the Feed vocabularies: Editors don't
 * see them in the admin, but still read them over the API and in pickers
 * (vocabularyRead). Super Admins and Admins do.
 */
export const hiddenFromEditors = ({ user }: { user: ClientUser }): boolean => {
  const staff = user as { role?: string | null; superAdmin?: boolean | null }
  return !staff?.superAdmin && staff?.role !== "admin"
}

/**
 * The Awayday-wide Amenity vocabulary, mirrored from the Property Feed.
 * Shared by every Site (NOT Site-scoped) and written only by the Sync
 * (ADR-0013). Per-Site presentation lives on Sites › Properties › Amenity
 * Presentation.
 */
export const Amenities: CollectionConfig = {
  slug: "amenities",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "group", "icon", "status", "feedId"],
    group: "Property Feed",
    hidden: hiddenFromEditors,
    description:
      "The Awayday-wide Amenity list, mirrored from the Property Feed. Read-only here: new Amenities are added in the Feed. Each Site chooses its search filters under Sites › Properties › Amenity Presentation.",
  },
  access: {
    create: syncOnly,
    read: vocabularyRead,
    update: syncOnly,
    delete: syncOnly,
    unlock: syncOnly,
  },
  hooks: revalidationHooks(tagPresets.amenities),
  fields: [
    {
      name: "feedId",
      label: "Feed ID",
      type: "text",
      required: true,
      unique: true,
    },
    { name: "name", type: "text", required: true },
    { name: "group", type: "text" },
    {
      name: "icon",
      type: "text",
      admin: {
        description:
          "Icon key from the Feed. A Site can override it in its Amenity Presentation.",
      },
    },
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
        description:
          "Withdrawn when the Feed drops the Amenity. Sites never show withdrawn Amenities.",
      },
    },
  ],
}
