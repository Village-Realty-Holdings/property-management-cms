import type { CollectionConfig } from "payload"

import { signedIn } from "../access"
import { inputProblems } from "../theme/inputs"

/**
 * A Saved Theme: a named copy of the Theme's inputs that Staff Users keep, to
 * apply later or to move to another Site (apps/site ADR-0009). The Site still
 * has one Theme (ADR-0004): applying a Saved Theme saves the Theme with these
 * inputs. Staff only: visitors see the Theme, never this list.
 */
export const SavedThemes: CollectionConfig = {
  slug: "saved-themes",
  labels: { singular: "Saved Theme", plural: "Saved Themes" },
  admin: { useAsTitle: "name", defaultColumns: ["name", "updatedAt"] },
  access: {
    create: signedIn,
    read: signedIn,
    update: signedIn,
    delete: signedIn,
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      unique: true,
      maxLength: 60,
    },
    {
      // The Theme's inputs (src/theme/inputs.ts), as the Theme stores them.
      name: "inputs",
      type: "json",
      required: true,
      validate: (value: unknown) => {
        const problems = inputProblems(value)
        return problems.length === 0 ? true : problems.join(" ")
      },
    },
  ],
}
