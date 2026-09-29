import type { ArrayField, TextFieldSingleValidation } from "payload"

import {
  builtInVariables,
  validateVariableKey,
} from "@workspace/content/shared"

import { adminsOnly } from "../fieldAccess"

/** Lowercase kebab-case, not a built-in, and used once on the Site. */
const validateKey: TextFieldSingleValidation = (value, { data }) => {
  const rows =
    (data as { customVariables?: { key?: string | null }[] | null })
      ?.customVariables ?? []
  const others = rows.map((row) => row?.key)
  // `others` includes this row once; a second copy is a duplicate.
  const index = others.indexOf(value ?? null)
  if (index >= 0) others.splice(index, 1)
  return validateVariableKey(value, others)
}

/**
 * Custom Variables (ADR-0017): the Site's own `{key}` values, next to the
 * built-ins from Site Settings. Stored under `site.customVariables`; read by
 * apps/site through `getSiteSettings()` and by the Page and Guide validation.
 */
export const customVariablesField: ArrayField = {
  name: "customVariables",
  label: "Custom Variables",
  type: "array",
  access: adminsOnly,
  labels: { singular: "Variable", plural: "Variables" },
  admin: {
    description: `Write {key} in Page and Guide copy, SEO fields and links to show the value. Keys are lowercase with dashes, such as wifi-password. Built-in: ${builtInVariables.map((name) => `{${name}}`).join(", ")}.`,
    initCollapsed: false,
  },
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "key",
          type: "text",
          required: true,
          validate: validateKey,
          admin: { placeholder: "wifi-password", width: "40%" },
        },
        { name: "value", type: "text", admin: { width: "60%" } },
      ],
    },
  ],
}
