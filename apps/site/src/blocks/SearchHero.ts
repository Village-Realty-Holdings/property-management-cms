import type { Block } from "payload"

/**
 * A Hero with a booking search: dates, guests and location. The search is
 * visual only: submitting it shows a toast and nothing else happens.
 */
export const SearchHero: Block = {
  slug: "searchHero",
  interfaceName: "SearchHeroBlock",
  labels: { singular: "Search Hero", plural: "Search Heroes" },
  fields: [
    {
      name: "eyebrow",
      type: "text",
      admin: { description: "A short line above the heading." },
    },
    { name: "heading", type: "text", required: true },
    {
      name: "accentWord",
      label: "Accent word",
      type: "text",
      admin: {
        description:
          "A word or phrase from the heading, shown in the accent style.",
      },
    },
    { name: "subheading", type: "textarea" },
    { name: "image", type: "upload", relationTo: "media" },
    {
      name: "searchLabel",
      label: "Search button label",
      type: "text",
      required: true,
      defaultValue: "Search",
    },
    {
      name: "locations",
      type: "array",
      maxRows: 12,
      labels: { singular: "Location", plural: "Locations" },
      admin: { description: "Optional places to suggest in the search." },
      fields: [{ name: "name", type: "text", required: true }],
    },
  ],
}
