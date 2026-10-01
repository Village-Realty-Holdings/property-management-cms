import type { BlockOf } from "../types"
import { sampleMedia } from "./media"

/**
 * A Trust strip with every field filled: both its text or stat items and its
 * partner logos, so either variant shows it fully.
 */
export const trustStripSample: BlockOf<"trustStrip"> = {
  blockType: "trustStrip",
  heading: "Trusted by guests and partners alike",
  variant: "items",
  items: [
    { stat: "4.9", text: "Average guest rating", icon: "star" },
    { text: "Free cancellation", icon: "shield-check" },
    { stat: "15", text: "Years on the coast", icon: "award" },
    { text: "Local support, 7 days a week", icon: "headphones" },
  ],
  logos: [
    {
      name: "Harbour Board",
      image: sampleMedia(1, "logo-harbour.svg", "Harbour Board"),
    },
    {
      name: "Lantern Stays",
      image: sampleMedia(2, "logo-lantern.svg", "Lantern Stays"),
    },
    {
      name: "Compass Travel",
      image: sampleMedia(3, "logo-compass.svg", "Compass Travel"),
    },
    {
      name: "Anchor Insurance",
      image: sampleMedia(4, "logo-anchor.svg", "Anchor Insurance"),
    },
  ],
  background: "default",
}
