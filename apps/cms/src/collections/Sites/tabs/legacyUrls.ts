import type { GroupField } from "payload"

import {
  legacyPropertyPatterns,
  validateLegacyRedirect,
  validateLegacyRedirects,
} from "@workspace/content/shared"

import { whenSectionOn } from "../../../sections"
import { adminsOnly } from "../fieldAccess"

/**
 * The previous website's URLs (`site.legacyUrls.*`): the Site deployment's
 * proxy 308-redirects them to the new URLs. Admins only; SiteReaders read it.
 * Matching rules live in @workspace/content/shared (legacyUrls.ts).
 */
export const legacyUrlsGroup: GroupField = {
  name: "legacyUrls",
  type: "group",
  label: "Legacy URLs",
  access: adminsOnly,
  admin: {
    description:
      "URL patterns from the previous website, redirected to new URLs.",
  },
  fields: [
    {
      name: "propertyPattern",
      label: "Legacy Property URL pattern",
      type: "select",
      // Not required: an unset pattern means "none" (and Site creates in
      // code needn't name it).
      defaultValue: "none",
      options: legacyPropertyPatterns.map(({ value, label }) => ({
        value,
        label,
      })),
      admin: {
        condition: whenSectionOn("properties"),
        description:
          "How the previous website addressed Property pages. Matching URLs redirect to /rentals/{slug}. Root level redirects only slugs of real Properties.",
      },
    },
    {
      name: "redirects",
      label: "One-off redirects",
      type: "array",
      labels: { singular: "Redirect", plural: "Redirects" },
      validate: (value: unknown) =>
        validateLegacyRedirects(Array.isArray(value) ? value : []),
      admin: {
        description:
          "Legacy pages to redirect, e.g. /about-us.html to /about. Paths only; checked before the Property pattern.",
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "from",
              type: "text",
              required: true,
              admin: { placeholder: "/old-page" },
              validate: (
                value: unknown,
                { siblingData }: { siblingData: unknown }
              ) => {
                if (typeof value !== "string" || !value.trim())
                  return "Enter the legacy path."
                const to = (siblingData as { to?: unknown })?.to
                // Checked with `to` once both are filled in.
                return typeof to === "string" && to.trim()
                  ? validateLegacyRedirect(value, to)
                  : validateLegacyRedirect(value, "/")
              },
            },
            {
              name: "to",
              type: "text",
              required: true,
              admin: { placeholder: "/new-page" },
              validate: (value: unknown) =>
                (typeof value === "string" &&
                  value.trim().startsWith("/") &&
                  !value.trim().startsWith("//")) ||
                "Enter a path starting with /.",
            },
          ],
        },
      ],
    },
  ],
}
