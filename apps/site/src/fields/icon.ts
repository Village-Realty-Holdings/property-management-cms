import type { TextField } from "payload"

import { iconNames, isIconName } from "../site/blocks/icons"
import { NOT_PROSE } from "./prose"

/** Empty, or the name of an icon on the curated Lucide list. */
export function validateIcon(value: string | null | undefined): true | string {
  if (value == null || value === "") return true
  if (isIconName(value)) return true
  return `"${value}" is not an icon the Site has. Use one of: ${iconNames.join(", ")}.`
}

/**
 * An icon, picked by its Lucide name (for example `wifi`). The name must be
 * on the curated list in `src/site/blocks/icons.ts`, which is also all the
 * Site draws: the field stores a name, never markup.
 */
export function iconField({
  name = "icon",
  label,
  required = false,
  defaultValue,
  admin,
}: {
  name?: string
  label?: string
  required?: boolean
  defaultValue?: string
  admin?: TextField["admin"]
} = {}): TextField {
  return {
    name,
    ...(label ? { label } : {}),
    type: "text",
    ...(required ? { required: true } : {}),
    ...(defaultValue ? { defaultValue } : {}),
    validate: (value) =>
      required && (value == null || value === "")
        ? "Pick an icon."
        : validateIcon(value),
    custom: NOT_PROSE,
    admin: {
      description: 'A Lucide icon name, such as "wifi" or "map-pin".',
      ...admin,
    },
  }
}
