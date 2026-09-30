import type { BlockOf } from "../types"
import { sampleMedia } from "./media"

/**
 * A Hero with every field filled: eyebrow, heading with an accent word,
 * subheading, image, button and a fused trust strip.
 */
export const heroSample: BlockOf<"hero"> = {
  blockType: "hero",
  eyebrow: "Holiday homes on the coast",
  heading: "Welcome to the coast",
  accentWord: "coast",
  subheading: "Handpicked homes, a short walk from the sea.",
  image: sampleMedia(0, "coast.svg", "A calm sea under a low sun"),
  cta: { label: "Browse homes", href: "/homes" },
  trustStrip: [
    { stat: "4.9", text: "Average guest rating", icon: "star" },
    { text: "Free cancellation", icon: "shield-check" },
    { text: "Local support, 7 days a week", icon: "headphones" },
  ],
}
