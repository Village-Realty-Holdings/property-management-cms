import type { BlockOf } from "../types"

/** A Newsletter with every field filled. */
export const newsletterSample: BlockOf<"newsletter"> = {
  blockType: "newsletter",
  heading: "Stay in the loop with our newsletter",
  text: "New homes, seasonal offers and local tips, once a month.",
  emailPlaceholder: "Your email address",
  buttonLabel: "Subscribe",
  background: "default",
}
