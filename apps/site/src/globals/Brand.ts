import type { GlobalConfig } from "payload"

import { anyone, signedIn } from "../access"

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
 * The Brand: the Site's identity details. The public Site reads it for its
 * name, logo, contact details and social links. Colours and fonts belong to
 * the Theme, and the domain comes from the env (`SITE_URL`).
 */
export const Brand: GlobalConfig = {
  slug: "brand",
  label: "Brand",
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
      admin: { description: "A short line under the Site name." },
    },
    {
      name: "logo",
      type: "upload",
      relationTo: "media",
      admin: { description: "Shown in the Site's header." },
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
