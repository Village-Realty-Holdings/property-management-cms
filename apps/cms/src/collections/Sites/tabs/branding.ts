import type { FilterOptions, Tab, TextFieldSingleValidation } from "payload"

import { colorSwatch } from "../components/fields"
import { adminsOnly } from "../fieldAccess"

/** The logo must be one of this Site's own Media files. */
const ownSiteMedia: FilterOptions = ({ id }) =>
  id == null ? false : { site: { equals: id } }

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

/** Empty, or a CSS hex colour such as `#1f4d3a` or `#fa0`. */
export const validateHexColor: TextFieldSingleValidation = (value) =>
  value == null || value === "" || HEX_COLOR.test(value)
    ? true
    : "Enter a hex colour such as #1f4d3a."

function isHttpUrl(value: unknown): boolean {
  if (typeof value !== "string") return false
  try {
    const { protocol } = new URL(value)
    return protocol === "http:" || protocol === "https:"
  } catch {
    return false
  }
}

/**
 * Theming, logo and public contact details for the Site deployment. Stored
 * under `site.branding.*` (a named tab, so the contact details stay here: moving
 * them would change their paths); the site reads it through `getSiteSettings()`
 * and turns colours and the font pairing into CSS variables. The collapsibles
 * are layout only.
 */
export const brandingTab: Tab = {
  name: "branding",
  label: "Branding & contact",
  description:
    "The Site's logo, colours and fonts, and the contact details shown to guests.",
  fields: [
    {
      type: "collapsible",
      label: "Look",
      fields: [
        {
          name: "logo",
          type: "upload",
          relationTo: "media",
          access: adminsOnly,
          filterOptions: ownSiteMedia,
          admin: {
            description:
              "Shown in the Site's header. One of this Site's Media files.",
          },
        },
        {
          type: "row",
          fields: [
            {
              name: "primaryColor",
              label: "Primary colour",
              type: "text",
              access: adminsOnly,
              validate: validateHexColor,
              admin: {
                placeholder: "#1f4d3a",
                description: "Hex, e.g. #1f4d3a. Header, buttons and links.",
                components: colorSwatch,
              },
            },
            {
              name: "accentColor",
              label: "Accent colour",
              type: "text",
              access: adminsOnly,
              validate: validateHexColor,
              admin: {
                placeholder: "#d97706",
                description: "Hex, e.g. #d97706. Highlights and badges.",
                components: colorSwatch,
              },
            },
          ],
        },
        {
          name: "fontPairing",
          type: "select",
          access: adminsOnly,
          defaultValue: "classic",
          options: [
            { label: "Classic (serif headings)", value: "classic" },
            { label: "Modern (geometric sans)", value: "modern" },
            { label: "Rustic (slab headings)", value: "rustic" },
          ],
        },
        {
          name: "tagline",
          type: "text",
          access: adminsOnly,
          admin: {
            description:
              "A short line under the Site name, also used in page metadata.",
          },
        },
      ],
    },
    {
      type: "collapsible",
      label: "Contact details",
      admin: {
        description: "Shown to guests on the Site, e.g. in its footer.",
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "phone",
              type: "text",
              access: adminsOnly,
              admin: { placeholder: "+1 555 010 0100" },
            },
            { name: "email", type: "email", access: adminsOnly },
          ],
        },
        { name: "address", type: "textarea", access: adminsOnly },
        {
          name: "social",
          label: "Social links",
          type: "array",
          access: adminsOnly,
          labels: { singular: "Social link", plural: "Social links" },
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "platform",
                  type: "select",
                  required: true,
                  options: [
                    { label: "Facebook", value: "facebook" },
                    { label: "Instagram", value: "instagram" },
                    { label: "X", value: "x" },
                    { label: "YouTube", value: "youtube" },
                    { label: "TikTok", value: "tiktok" },
                  ],
                },
                {
                  name: "url",
                  label: "URL",
                  type: "text",
                  required: true,
                  validate: (value: unknown) =>
                    isHttpUrl(value) || "Enter an http(s) URL.",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
