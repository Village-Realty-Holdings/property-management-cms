import type { CollectionConfig, Field, FieldHook } from "payload"

import {
  factsReadOnly,
  staffAdminField,
  staffOfSite,
  syncOnly,
  visibleForReader,
} from "../../access"
import { revalidationHooks, tagPresets } from "../../revalidation"
import { seoField } from "../../fields/seo"
import { slugField } from "../../fields/slug"
import { locationAdminTitleField, relabelChildren } from "./adminTitle"
import { validateParent } from "./validateParent"
import { sameSite } from "../../fields/rule"

const feedOwned = { update: factsReadOnly }
const revalidation = revalidationHooks(tagPresets.locations)
/** Location Level, visibility, display name and slug: Admins of the Site. */
const adminsOnly = { update: staffAdminField }

const isComplex = (data: { level?: unknown } | undefined) =>
  data?.level === "complex"

/** `title` is the display name when set, otherwise the Feed name. */
const computeTitle: FieldHook = ({ siblingData }) => {
  const displayName =
    typeof siblingData?.displayName === "string"
      ? siblingData.displayName.trim()
      : ""
  return displayName || siblingData?.name
}

/**
 * Mirrored from the Property Feed's node (ADR-0012). The Sync writes these;
 * nobody edits them through the API or admin (ADR-0001).
 */
const feedFields: Field[] = [
  {
    type: "row",
    fields: [
      {
        name: "feedId",
        label: "Feed ID",
        type: "text",
        required: true,
        index: true,
        access: feedOwned,
      },
      {
        name: "name",
        label: "Feed name",
        type: "text",
        required: true,
        access: feedOwned,
        admin: { description: "The node name in the PMS." },
      },
      {
        name: "feedType",
        label: "Feed type",
        type: "text",
        access: feedOwned,
        admin: {
          description:
            "The node type in the PMS. For reference only; the Location Level decides how it appears.",
        },
      },
    ],
  },
  {
    name: "parent",
    type: "relationship",
    relationTo: "locations",
    access: feedOwned,
    admin: { description: "The parent node in the PMS." },
  },
]

/** Complex-only Editorial Content, shown when the Location Level is Complex. */
const complexGroup: Field = {
  name: "complex",
  label: "Complex",
  type: "group",
  admin: {
    condition: (data) => isComplex(data),
    description:
      "What the Properties in this Complex share. Shown on the Complex page.",
  },
  fields: [
    { name: "address", type: "text" },
    {
      name: "sharedAmenities",
      label: "Shared Amenities",
      type: "relationship",
      relationTo: "amenities",
      hasMany: true,
    },
    { name: "checkInInfo", label: "Check-in", type: "richText" },
    { name: "housekeeping", type: "richText" },
    { name: "feeNotes", label: "Fee notes", type: "richText" },
  ],
}

/**
 * A place in a Site's Location tree, mirrored from the Property Feed's nodes
 * (ADR-0012). The Sync creates Locations and owns feedId, name, feedType,
 * parent and status; a node missing from the Feed is Withdrawn, never deleted.
 * Admins set the Location Level, display name, visibility and slug; Editors
 * write the landing copy and the Complex details. No Draft state.
 *
 * Tree helpers (ancestors, descendants) live in ./ancestors.ts. `adminTitle`
 * (./adminTitle.ts) labels it "Parent › Name (Level)" in lists and pickers.
 */
export const Locations: CollectionConfig = {
  slug: "locations",
  admin: {
    useAsTitle: "adminTitle",
    defaultColumns: ["adminTitle", "level", "visible", "status"],
    listSearchableFields: ["adminTitle", "name", "displayName", "feedId"],
    pagination: { defaultLimit: 50 },
    group: "Properties",
  },
  access: {
    create: syncOnly,
    read: visibleForReader,
    update: staffOfSite,
    delete: syncOnly,
    unlock: staffOfSite,
  },
  hooks: {
    beforeValidate: [validateParent],
    afterChange: [
      ...revalidation.afterChange,
      // After revalidation: it re-saves the children with `skipRevalidation`.
      relabelChildren,
    ],
    afterDelete: revalidation.afterDelete,
  },
  indexes: [
    { fields: ["site", "feedId"], unique: true },
    { fields: ["site", "slug"], unique: true },
  ],
  fields: [
    locationAdminTitleField,
    {
      name: "title",
      type: "text",
      admin: {
        hidden: true,
        description: "Display name, or the Feed name. Set automatically.",
      },
      hooks: { beforeChange: [computeTitle] },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Editorial",
          description: "Written in the CMS. The Sync never overwrites it.",
          fields: [
            {
              name: "displayName",
              label: "Display name",
              type: "text",
              access: adminsOnly,
              admin: {
                description:
                  "Shown to guests instead of the Feed name. Leave empty to use the Feed name.",
              },
            },
            { name: "intro", type: "richText" },
            {
              name: "heroImage",
              type: "upload",
              relationTo: "media",
              filterOptions: sameSite,
            },
            complexGroup,
            seoField(),
          ],
        },
        {
          label: "Feed facts",
          description:
            "From the Property Feed. Change these in the PMS; the Sync updates them here.",
          fields: feedFields,
        },
      ],
    },
    {
      name: "level",
      label: "Location Level",
      type: "select",
      options: [
        { label: "Destination", value: "destination" },
        { label: "Area", value: "area" },
        { label: "Complex", value: "complex" },
      ],
      access: adminsOnly,
      admin: {
        position: "sidebar",
        description:
          "How this Location appears in navigation, search and URLs. Independent of the PMS node type.",
      },
    },
    {
      ...slugField({ from: "name" }),
      access: adminsOnly,
    },
    {
      name: "visible",
      type: "checkbox",
      defaultValue: true,
      access: adminsOnly,
      admin: {
        position: "sidebar",
        description: "Shown to guests on the Site.",
        components: {
          Cell: "/collections/Properties/admin/YesNoCell#YesNoCell",
        },
      },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "active",
      options: [
        { label: "Active", value: "active" },
        { label: "Withdrawn", value: "withdrawn" },
      ],
      access: feedOwned,
      admin: {
        position: "sidebar",
        description:
          "Follows the Feed node. Withdrawn Locations are hidden from guests.",
      },
    },
  ],
}
