import type { Block } from "payload"

import { navLink, navLinkFields } from "../../fields/navLink"

/**
 * The Site's menu. Each item links to a Page or a URL, or opens a dropdown of
 * links. There is one level of dropdowns: a dropdown's links cannot open
 * dropdowns of their own.
 */
export const Navigation: Block = {
  slug: "navigation",
  interfaceName: "NavigationBlock",
  labels: { singular: "Navigation", plural: "Navigations" },
  fields: [
    {
      name: "items",
      type: "array",
      maxRows: 12,
      fields: [
        { name: "label", type: "text", required: true },
        // An item that opens a dropdown does not link anywhere itself.
        navLink("link", {
          condition: (_, sibling) => !sibling?.children?.length,
        }),
        {
          name: "display",
          label: "Show the dropdown as",
          type: "select",
          required: true,
          defaultValue: "dropdown",
          options: [
            { label: "A dropdown list", value: "dropdown" },
            { label: "Mega-menu columns", value: "mega" },
          ],
          admin: { condition: (_, sibling) => !!sibling?.children?.length },
        },
        {
          name: "children",
          label: "Dropdown links",
          type: "array",
          maxRows: 24,
          admin: {
            description:
              "Add links to make this item a dropdown. A dropdown holds links only.",
          },
          fields: [
            ...navLinkFields(),
            {
              name: "column",
              label: "Column heading",
              type: "text",
              admin: {
                description:
                  "Mega-menu only: links with the same heading share a column.",
              },
            },
          ],
        },
      ],
    },
  ],
}
