import type { GlobalConfig, TextFieldSingleValidation } from "payload"

import { anyone, signedIn } from "../access"

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

export const FONT_PAIRINGS = [
  { label: "Classic (serif headings)", value: "classic" },
  { label: "Modern (geometric sans)", value: "modern" },
  { label: "Rustic (slab headings)", value: "rustic" },
] as const

/**
 * Site Settings: the Site's general details and branding. The Site reads
 * them for its name, metadata and contact details, and turns the colours
 * and font pairing into CSS variables.
 */
export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  label: "Site Settings",
  access: {
    read: anyone,
    update: signedIn,
  },
  fields: [
    {
      name: "name",
      label: "Site name",
      type: "text",
      required: true,
    },
    {
      name: "tagline",
      type: "text",
      admin: {
        description:
          "A short line under the Site name, also used in page metadata.",
      },
    },
    {
      name: "domain",
      type: "text",
      admin: { placeholder: "www.example.com" },
    },
    {
      name: "contact",
      type: "group",
      fields: [
        {
          name: "phone",
          type: "text",
          admin: { placeholder: "+1 555 010 0100" },
        },
        { name: "email", type: "email" },
        { name: "address", type: "textarea" },
      ],
    },
    {
      name: "branding",
      type: "group",
      fields: [
        {
          name: "logo",
          type: "upload",
          relationTo: "media",
          admin: { description: "Shown in the Site's header." },
        },
        {
          name: "primaryColor",
          label: "Primary colour",
          type: "text",
          validate: validateHexColor,
          admin: {
            placeholder: "#1f4d3a",
            description: "Header, buttons and links.",
          },
        },
        {
          name: "accentColor",
          label: "Accent colour",
          type: "text",
          validate: validateHexColor,
          admin: { placeholder: "#d97706", description: "Highlights." },
        },
        {
          name: "fontPairing",
          type: "select",
          required: true,
          defaultValue: "classic",
          options: [...FONT_PAIRINGS],
        },
      ],
    },
    {
      name: "social",
      label: "Social links",
      type: "array",
      labels: { singular: "Social link", plural: "Social links" },
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
}
