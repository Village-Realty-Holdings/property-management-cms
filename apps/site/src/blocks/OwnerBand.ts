import type { Block } from "payload"

import { backgroundField } from "../fields/background"
import { linkGroup } from "../fields/link"

/** A pitch to property owners: a list of benefits and a button. */
export const OwnerBand: Block = {
  slug: "ownerBand",
  interfaceName: "OwnerBandBlock",
  labels: { singular: "Owner band", plural: "Owner bands" },
  fields: [
    { name: "heading", type: "text", required: true },
    { name: "pitch", type: "textarea" },
    {
      name: "benefits",
      type: "array",
      required: true,
      minRows: 2,
      maxRows: 6,
      labels: { singular: "Benefit", plural: "Benefits" },
      defaultValue: [
        { text: "Full-service management, from listing to turnover" },
        { text: "Monthly owner statements you can read at a glance" },
        { text: "Local team on call, every day" },
      ],
      fields: [{ name: "text", type: "text", required: true }],
    },
    linkGroup("cta", "Call to action"),
    // Usually on the dark surface.
    { ...backgroundField, defaultValue: "dark" },
  ],
}
