import type { Field } from "payload"

import { factsReadOnly } from "../../access"
import { stayPolicyFields } from "./stayPolicy"

const readOnly = { update: factsReadOnly }

/**
 * Puts `access: readOnly` on every data field inside a group, including those
 * nested in rows. Access set on the group itself hides the group's row fields
 * in the admin, so it goes on the leaves instead.
 */
function readOnlyLeaves(fields: Field[]): Field[] {
  return fields.map((field) => {
    if (field.type === "row" || field.type === "collapsible") {
      return { ...field, fields: readOnlyLeaves(field.fields) }
    }
    return { ...field, access: readOnly } as Field
  })
}

/**
 * Active / Withdrawn, following the Feed Listing (ADR-0002). A Property Fact,
 * shown in the sidebar. Withdrawing keeps everything else intact.
 */
export const statusField: Field = {
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
    description:
      "Follows the Feed Listing. Withdrawn Properties are hidden but kept intact.",
  },
}

/**
 * Property Facts: owned by the Property Feed and written only by the Sync
 * (ADR-0001). Read-only through the API and admin (`factsReadOnly`).
 * Add new Feed-owned fields here, each with `access: readOnly` (on a group
 * or array, access on the container covers its sub-fields).
 */
export const factsFields: Field[] = [
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
      {
        name: "feedName",
        label: "Feed name",
        type: "text",
        access: readOnly,
        admin: { description: "The listing name from the Property Feed." },
      },
    ],
  },
  {
    name: "location",
    type: "relationship",
    relationTo: "locations",
    access: readOnly,
  },
  {
    name: "propertyType",
    label: "Property Type",
    type: "relationship",
    relationTo: "property-types",
    access: readOnly,
  },
  {
    name: "amenities",
    type: "relationship",
    relationTo: "amenities",
    hasMany: true,
    access: readOnly,
  },
  {
    type: "row",
    fields: [
      { name: "bedrooms", type: "number", min: 0, access: readOnly },
      {
        name: "bathrooms",
        type: "number",
        min: 0,
        access: readOnly,
        admin: { step: 0.5 },
        validate: (value: number | null | undefined) =>
          value == null || (value >= 0 && Number.isInteger(value * 2))
            ? true
            : "Bathrooms must be a whole or half number, 0 or more.",
      },
      { name: "sleeps", type: "number", min: 0, access: readOnly },
    ],
  },
  {
    name: "petsAllowed",
    type: "checkbox",
    defaultValue: false,
    access: readOnly,
  },
  {
    type: "row",
    fields: [
      {
        name: "rating",
        type: "number",
        min: 0,
        access: readOnly,
        admin: { description: "Average of shown Reviews." },
      },
      {
        name: "reviewCount",
        type: "number",
        min: 0,
        access: readOnly,
      },
    ],
  },
  {
    name: "feedDescription",
    label: "Feed description",
    type: "textarea",
    access: readOnly,
    admin: {
      description:
        "The Property Feed's description. The Site shows it when the Editorial description is empty.",
    },
  },
  {
    type: "row",
    fields: [
      {
        name: "onlineBookable",
        label: "Bookable online",
        type: "checkbox",
        defaultValue: true,
        access: readOnly,
      },
      {
        name: "feedUpdatedAt",
        label: "Feed updated at",
        type: "date",
        access: readOnly,
        admin: {
          date: { pickerAppearance: "dayAndTime" },
          description: "When the Property Feed last changed this listing.",
        },
      },
    ],
  },
  {
    name: "virtualTourUrl",
    label: "Virtual tour URL",
    type: "text",
    access: readOnly,
  },
  {
    name: "photos",
    type: "array",
    access: readOnly,
    admin: {
      description:
        "Feed photo URLs, in order. Never uploaded to Media (ADR-0008).",
      initCollapsed: true,
    },
    fields: [
      { name: "url", label: "URL", type: "text", required: true },
      { name: "caption", type: "text" },
      {
        type: "row",
        fields: [
          { name: "width", type: "number", min: 0 },
          { name: "height", type: "number", min: 0 },
        ],
      },
    ],
  },
  {
    name: "address",
    type: "group",
    fields: readOnlyLeaves([
      { name: "line1", label: "Address line 1", type: "text" },
      {
        type: "row",
        fields: [
          { name: "city", type: "text" },
          { name: "region", type: "text" },
          { name: "postalCode", label: "Postal code", type: "text" },
          { name: "country", type: "text" },
        ],
      },
    ]),
  },
  {
    name: "geo",
    label: "Coordinates",
    type: "group",
    fields: readOnlyLeaves([
      {
        type: "row",
        fields: [
          { name: "lat", label: "Latitude", type: "number", min: -90, max: 90 },
          {
            name: "lng",
            label: "Longitude",
            type: "number",
            min: -180,
            max: 180,
          },
        ],
      },
    ]),
  },
  {
    name: "rooms",
    type: "array",
    access: readOnly,
    admin: { initCollapsed: true },
    fields: [
      {
        type: "row",
        fields: [
          { name: "name", type: "text" },
          { name: "sleeps", type: "number", min: 0 },
        ],
      },
      {
        name: "beds",
        type: "array",
        fields: [
          {
            type: "row",
            fields: [
              {
                name: "type",
                type: "text",
                required: true,
                admin: { description: "e.g. king, queen, bunk" },
              },
              { name: "count", type: "number", min: 0, defaultValue: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "stayPolicy",
    label: "Stay Policy",
    type: "group",
    admin: {
      description: "Empty fields fall back to the Site's Default Stay Policy.",
    },
    fields: readOnlyLeaves(stayPolicyFields()),
  },
]
