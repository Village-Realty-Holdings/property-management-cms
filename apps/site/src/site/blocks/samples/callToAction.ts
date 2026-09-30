import type { BlockOf } from "../types"

/** A Call to action with every field filled. */
export const callToActionSample: BlockOf<"callToAction"> = {
  blockType: "callToAction",
  heading: "Ready to book your stay?",
  body: "Talk to our team and we will find the right home for you.",
  button: { label: "Get in touch", href: "/contact" },
  style: "primary",
  background: "default",
}
