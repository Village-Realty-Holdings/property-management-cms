import type { GlobalConfig } from "payload"

import { anyone, signedIn } from "../access"

/** The title pattern a new Site starts with. `%s` is the Page title. */
export const DEFAULT_TITLE_PATTERN = "%s · {name}"

/**
 * SEO: how the Site appears in search results and link previews. These are
 * the defaults; a Page's own SEO fields (src/fields/seo.ts) override them.
 */
export const SEO: GlobalConfig = {
  slug: "seo",
  label: "SEO",
  access: {
    read: anyone,
    update: signedIn,
  },
  fields: [
    {
      name: "titlePattern",
      type: "text",
      defaultValue: DEFAULT_TITLE_PATTERN,
      validate: (value: unknown) =>
        value == null ||
        value === "" ||
        (typeof value === "string" && value.includes("%s")) ||
        "Include %s where the Page title goes, for example %s · {name}.",
      admin: {
        description:
          "How Page titles read in search results and the browser tab. %s is the Page title and {name} is the Site name.",
      },
    },
    {
      name: "description",
      label: "Default description",
      type: "textarea",
      admin: {
        description:
          "Used for Pages that have no SEO description of their own.",
      },
    },
    {
      name: "image",
      label: "Social share image",
      type: "upload",
      relationTo: "media",
      admin: {
        description:
          "Shown when a Page without its own SEO image is shared on social media.",
      },
    },
    {
      name: "favicon",
      type: "upload",
      relationTo: "media",
      admin: {
        description: "The icon in browser tabs. A square PNG works best.",
      },
    },
    {
      name: "allowIndexing",
      label: "Allow search engines to index the Site",
      type: "checkbox",
      defaultValue: true,
      admin: {
        description:
          "Off adds noindex to every page and makes robots.txt disallow everything.",
      },
    },
  ],
}
