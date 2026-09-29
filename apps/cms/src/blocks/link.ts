import type { GroupField } from "payload"

/**
 * A button or link: `{ label, href }`. `href` is a Site path ("/rentals") or
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
            admin: {
              description:
                'A Site path like "/rentals", a full URL, or a Variable such as {client-url} or tel:{phone}.',
            },
          },
        ],
      },
    ],
  }
}

/**
 * Empty, a Site path, a same-page anchor, or an http(s)/mailto/tel URL.
 * Variables count as their values (ADR-0017): `{client-url}` or
 * `{client-url}/owners` is left to the Site, `tel:{phone}` is checked as a
 * phone link.
 */
export function validateHref(value: string | null | undefined): true | string {
  if (value == null || value === "") return true
  if (/^\{[a-z0-9-]+\}/.test(value)) return true
  value = value.replace(/\{[a-z0-9-]+\}/g, "0")
  // No backslashes: browsers read "/\evil.com" like "//evil.com".
  if (/^(\/(?!\/)|#)[^\s\\]*$/.test(value)) return true
  if (/^(https?:\/\/[^\s]+|mailto:[^\s]+|tel:[+\d][\d\s-]*)$/i.test(value)) {
    return true
  }
  return 'Use a Site path like "/rentals" or a full https:// URL.'
}
