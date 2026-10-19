import type { Block } from "payload"

import { navLink } from "../../fields/navLink"

/**
 * The Site's logo, from the Brand (its logo, or its name when it has none),
 * linking Home unless the editor chooses another link. The image is not
 * chosen here: change it in the Brand. On a Primary or Dark band it is the
 * Brand's light logo, when the Brand has one.
 */
export const Logo: Block = {
  slug: "logo",
  interfaceName: "LogoBlock",
  labels: { singular: "Logo", plural: "Logos" },
  fields: [
    {
      name: "size",
      type: "select",
      required: true,
      defaultValue: "medium",
      options: [
        { label: "Small", value: "small" },
        { label: "Medium", value: "medium" },
        { label: "Large", value: "large" },
        { label: "Extra large", value: "xlarge" },
      ],
    },
    {
      name: "showTagline",
      label: "Show the Brand's tagline",
      type: "checkbox",
      defaultValue: false,
    },
    {
      ...navLink("link"),
      label: "Link",
      admin: { description: "Leave empty to link to Home." },
    },
  ],
}
