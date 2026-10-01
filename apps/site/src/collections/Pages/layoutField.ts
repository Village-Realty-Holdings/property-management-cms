import type { Field, Validate } from "payload"

type LayoutSiblingData = { mode?: string | null }

/**
 * The Layout choice of a Page is required only in the "specific" mode. The
 * other modes keep whatever is stored (a Layout picked earlier stays put
 * while the mode is "route" or "none", so switching back loses nothing).
 */
export const validateSpecificLayout: Validate = (value, { siblingData }) => {
  const { mode } = (siblingData ?? {}) as LayoutSiblingData
  if (mode !== "specific") return true
  return value ? true : "Choose a Layout, or pick another option above."
}

/**
 * How a Page picks its Layout (ADR-0006): by its path (the default), a
 * specific Layout, or none. The resolution itself lives with the Layouts.
 */
export function layoutField(): Field {
  return {
    name: "layout",
    type: "group",
    label: "Layout",
    admin: { position: "sidebar" },
    fields: [
      {
        name: "mode",
        type: "select",
        defaultValue: "route",
        options: [
          { label: "Use the Layout for this path", value: "route" },
          { label: "A specific Layout", value: "specific" },
          { label: "No Layout", value: "none" },
        ],
      },
      {
        name: "layout",
        type: "relationship",
        relationTo: "layouts",
        hasMany: false,
        validate: validateSpecificLayout,
        admin: {
          condition: (_data, siblingData) => siblingData?.mode === "specific",
        },
      },
    ],
  }
}
