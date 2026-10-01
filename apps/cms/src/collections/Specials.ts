import type { CollectionConfig, Field, FieldHook, TextField } from "payload"

import {
  factsReadOnly,
  onSiteForReader,
  staffOfSite,
  syncOnly,
} from "../access"
import { revalidationHooks, tagPresets } from "../revalidation"
import { seoField } from "../fields/seo"
import { slugField } from "../fields/slug"
import { sameSite } from "../fields/rule"

const readOnly = { update: factsReadOnly }

/**
 * slugField() from `title`, set once. The Sync creates Specials without a
 * title (it is Editorial Content), so while the slug is still empty it is
 * also set on update, from the first title an Editor gives the Special.
 */
function specialSlugField(): TextField {
  const field = slugField()
  const [setSlug] = field.hooks?.beforeValidate ?? []
  if (!setSlug) return field
  const setOnceTitled: FieldHook = (args) => {
    const { operation, originalDoc, previousValue, siblingData, value } = args
    const empty = (v: unknown) => typeof v !== "string" || !v.trim()
    if (operation === "update" && empty(previousValue) && empty(value)) {
      return setSlug({
        ...args,
        operation: "create",
        siblingData: { ...originalDoc, ...siblingData },
      })
    }
    return setSlug(args)
  }
  return {
    ...field,
    hooks: { ...field.hooks, beforeValidate: [setOnceTitled] },
  }
}

/**
 * Feed-owned: the promo's rules, eligible Properties, validity dates and
 * lifecycle. Written only by the Sync (ADR-0001).
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
        access: readOnly,
      },
      { name: "code", type: "text", access: readOnly },
    ],
  },
  {
    type: "row",
    fields: [
      { name: "validFrom", type: "date", access: readOnly },
      {
        name: "validTo",
        type: "date",
        access: readOnly,
        admin: {
          description: "Hidden from guests after this date.",
          components: {
            Cell: "/collections/Properties/admin/SpecialCells#ValidToCell",
          },
        },
      },
    ],
  },
  {
    name: "discountSummary",
    type: "text",
    access: readOnly,
    admin: { description: "The Feed's description of the discount." },
  },
  {
    name: "properties",
    label: "Eligible Properties",
    type: "relationship",
    relationTo: "properties",
    hasMany: true,
    access: readOnly,
  },
  { name: "terms", type: "textarea", access: readOnly },
]

/** Public copy and visibility, written in the CMS. The Sync never writes these. */
const editorialFields: Field[] = [
  {
    name: "title",
    type: "text",
    admin: { description: "Public title on the Site." },
  },
  specialSlugField(),
  { name: "summary", type: "textarea" },
  { name: "body", type: "richText" },
  { name: "disclaimer", type: "textarea" },
  {
    name: "heroImage",
    type: "upload",
    relationTo: "media",
    filterOptions: sameSite,
  },
  seoField(),
]

type SpecialNames = {
  title?: string | null
  code?: string | null
  feedId?: string | null
}

const trimmed = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

/**
 * The Special's name in the admin: its public title, else the Feed's promo
 * code, else its Feed ID. (The Sync gives new Specials the promo's name as
 * their title.)
 */
export function specialLabel(doc: SpecialNames | null | undefined): string {
  return trimmed(doc?.title) || trimmed(doc?.code) || trimmed(doc?.feedId)
}

/**
 * Sidebar fields. Top-level because Payload only renders top-level fields in
 * the sidebar; the tabs are unnamed, so this doesn't change stored paths.
 */
const sidebarFields: Field[] = [
  {
    name: "adminTitle",
    label: "Special",
    type: "text",
    admin: {
      readOnly: true,
      condition: () => false,
      description: "The public title, or the promo code. Set automatically.",
    },
    hooks: {
      beforeChange: [
        ({ data, originalDoc }) =>
          specialLabel({ ...originalDoc, ...data }) || null,
      ],
      afterRead: [
        ({ value, siblingData }) => value || specialLabel(siblingData),
      ],
    },
  },
  {
    name: "expiredNotice",
    type: "ui",
    admin: {
      position: "sidebar",
      components: {
        Field: "/collections/Properties/admin/SpecialCells#ExpiredNotice",
      },
    },
  },
  {
    // Feed-owned (ADR-0001).
    name: "status",
    type: "select",
    required: true,
    defaultValue: "active",
    options: [
      { label: "Active", value: "active" },
      { label: "Withdrawn", value: "withdrawn" },
    ],
    access: readOnly,
    admin: {
      position: "sidebar",
      description: "Follows the Property Feed. Withdrawn Specials are hidden.",
    },
  },
  {
    // Editorial Content.
    name: "showOnSite",
    label: "Show on Site",
    type: "checkbox",
    defaultValue: false,
    admin: {
      position: "sidebar",
      description:
        "Guests see it only while it is also Active and not expired.",
      components: {
        Cell: "/collections/Properties/admin/YesNoCell#YesNoCell",
      },
    },
  },
]

/**
 * A promotion mirrored from the Property Feed, which owns its rules, eligible
 * Properties and validity dates (ADR-0001). The CMS adds public copy and
 * decides whether guests see it (`showOnSite`). Readers never see a Withdrawn
 * or expired Special. One Special per (Site, Feed ID). `adminTitle` names it
 * in lists and pickers.
 */
export const Specials: CollectionConfig = {
  slug: "specials",
  admin: {
    useAsTitle: "adminTitle",
    defaultColumns: ["adminTitle", "code", "validTo", "status", "showOnSite"],
    listSearchableFields: ["adminTitle", "title", "code", "feedId"],
    pagination: { defaultLimit: 50 },
    group: "Properties",
  },
  access: {
    create: syncOnly,
    read: onSiteForReader,
    update: staffOfSite,
    delete: syncOnly,
    unlock: staffOfSite,
  },
  hooks: revalidationHooks(tagPresets.specials),
  indexes: [
    { fields: ["site", "feedId"], unique: true },
    { fields: ["site", "slug"], unique: true },
  ],
  fields: [
    ...sidebarFields,
    {
      type: "tabs",
      tabs: [
        {
          label: "Editorial",
          description: "Written in the CMS. The Sync never overwrites it.",
          fields: editorialFields,
        },
        {
          label: "Feed facts",
          description:
            "From the Property Feed. Change these in the PMS; the Sync updates them here.",
          fields: feedFields,
        },
      ],
    },
  ],
}
