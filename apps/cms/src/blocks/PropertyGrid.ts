import type { Block, Condition, FieldHook } from "payload"

import { blockAdmin } from "./admin"
import { sameSite } from "./sameSite"

type Source = "curatedList" | "location"

const sourceOf = (siblingData: unknown): Source | undefined =>
  (siblingData as { source?: Source } | undefined)?.source

const sourceIs =
  (source: Source): Condition =>
  (_, siblingData) =>
    sourceOf(siblingData) === source

/**
 * Payload skips validation (required, filterOptions) of a field whose
 * condition is false, so a value left behind in the unused field is cleared
 * rather than stored unchecked.
 */
const clearUnlessSource =
  (source: Source): FieldHook =>
  ({ siblingData, value }) =>
    sourceOf(siblingData) === source ? value : null

/**
 * A grid of Properties, taken from a Curated List or from a Location (and
 * the Locations inside it). The Site resolves the members at read time.
 * Only the relationship matching `source` is set; the other is null.
 */
export const PropertyGrid: Block = {
  slug: "propertyGrid",
  interfaceName: "PropertyGridBlock",
  labels: { singular: "Property Grid", plural: "Property Grids" },
  admin: blockAdmin({
    label: "Property Grid",
    image: "property-grid.svg",
    description: "A grid of Properties from a Curated List or a Location.",
  }),
  fields: [
    { name: "heading", type: "text" },
    {
      name: "source",
      type: "select",
      required: true,
      defaultValue: "curatedList",
      options: [
        { label: "Curated List", value: "curatedList" },
        { label: "Location", value: "location" },
      ],
    },
    {
      name: "curatedList",
      label: "Curated List",
      type: "relationship",
      relationTo: "curated-lists",
      required: true,
      filterOptions: sameSite,
      hooks: { beforeChange: [clearUnlessSource("curatedList")] },
      admin: { condition: sourceIs("curatedList") },
    },
    {
      name: "location",
      type: "relationship",
      relationTo: "locations",
      required: true,
      filterOptions: sameSite,
      hooks: { beforeChange: [clearUnlessSource("location")] },
      admin: { condition: sourceIs("location") },
    },
    {
      name: "limit",
      type: "number",
      required: true,
      defaultValue: 6,
      min: 1,
      max: 24,
      admin: { step: 1, description: "Most Properties to show." },
    },
  ],
}
