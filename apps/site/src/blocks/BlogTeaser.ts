import type { Block } from "payload"

import { surfaceFields } from "../fields/background"
import { linkGroup } from "../fields/link"

/** The Site's first three blog posts as cards, each linking out. */
export const BlogTeaser: Block = {
  slug: "blogTeaser",
  interfaceName: "BlogTeaserBlock",
  labels: { singular: "Blog teaser", plural: "Blog teasers" },
  fields: [
    { name: "heading", type: "text", required: true },
    {
      ...linkGroup("allPostsLink", "Link to all posts"),
      admin: { description: "Optional. Shown when it has a label and a link." },
    },
    ...surfaceFields,
  ],
}
