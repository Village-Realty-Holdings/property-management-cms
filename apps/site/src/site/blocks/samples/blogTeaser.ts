import type { BlockOf } from "../types"

/** A Blog teaser with its link to all posts, every field filled. */
export const blogTeaserSample: BlockOf<"blogTeaser"> = {
  blockType: "blogTeaser",
  heading: "Stories and tips from the journal",
  allPostsLink: { label: "Read all posts", href: "/blog" },
  background: "default",
}
