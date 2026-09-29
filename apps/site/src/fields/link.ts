import type { GroupField } from "payload"

/**
 * A button or link: `{ label, href }`. `href` is a Site path ("/about") or
 * an absolute URL. Both are optional; the Site renders nothing without both.
 */
export function linkGroup(name: string, label?: string): GroupField {
  return {
    name,
    ...(label ? { label } : {}),
    type: "group",
    fields: [
      {
        type: "row",
        fields: [
          { name: "label", type: "text" },
          {
            name: "href",
            label: "Link",
            type: "text",
            validate: validateHref,
            admin: { description: 'A Site path like "/about", or a full URL.' },
          },
        ],
      },
    ],
  }
}

/** Empty, a Site path, a same-page anchor, or an http(s)/mailto/tel URL. */
export function validateHref(value: string | null | undefined): true | string {
  if (value == null || value === "") return true
  // No backslashes: browsers read "/\evil.com" like "//evil.com".
  if (/^(\/(?!\/)|#)[^\s\\]*$/.test(value)) return true
  if (/^(https?:\/\/[^\s]+|mailto:[^\s]+|tel:[+\d][\d\s-]*)$/i.test(value)) {
    return true
  }
  return 'Use a Site path like "/about" or a full https:// URL.'
}
