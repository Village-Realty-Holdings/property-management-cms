import type { GroupField } from "payload"

import { adminsOnly } from "../fieldAccess"

/**
 * This Site's labels for the shared Property Types (ADR-0013). Stored under
 * `site.propertyTypeLabels.labels`; types without a row use the Feed's name.
 */
export const propertyTypeLabelsGroup: GroupField = {
  name: "propertyTypeLabels",
  type: "group",
  label: "Property Type labels",
  access: adminsOnly,
  admin: {
    description: "How this Site names each Property Type for its guests.",
  },
  fields: [
    {
      name: "labels",
      type: "array",
      labels: { singular: "Label", plural: "Labels" },
      admin: {
        description: "Property Types without a label here use the Feed's name.",
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "propertyType",
              label: "Property Type",
              type: "relationship",
              relationTo: "property-types",
              required: true,
            },
            { name: "label", type: "text", required: true },
          ],
        },
      ],
    },
  ],
}
