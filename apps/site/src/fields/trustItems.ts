import type { ArrayField } from "payload"

import { iconField } from "./icon"

/**
 * A row of short trust signals: each is text, with a stat in front of it
 * when it has one ("4.9" + "average guest rating"), and an optional icon.
 * The Trust strip Block and the Hero's fused strip share it.
 */
export function trustItemsField(
  overrides: Partial<ArrayField> = {}
): ArrayField {
  return {
    name: "items",
    type: "array",
    minRows: 2,
    maxRows: 6,
    labels: { singular: "Item", plural: "Items" },
    fields: [
      {
        name: "stat",
        type: "text",
        admin: { description: 'Optional, such as "4.9".' },
      },
      { name: "text", type: "text", required: true },
      iconField(),
    ],
    ...overrides,
  }
}
