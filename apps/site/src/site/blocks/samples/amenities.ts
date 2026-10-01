import type { BlockOf } from "../types"
import { sampleMedia } from "./media"

/**
 * Amenities with every field filled: each item has both a photo (for the
 * mosaic) and an icon (for the icon list), so either variant shows it fully.
 */
export const amenitiesSample: BlockOf<"amenities"> = {
  blockType: "amenities",
  heading: "Everything you need for a stay",
  intro: "Every home comes with the essentials, and a few extras.",
  variant: "mosaic",
  items: [
    {
      label: "Private pool",
      icon: "waves",
      image: sampleMedia(1, "pool.svg", "A private pool at sunrise"),
    },
    {
      label: "Sunny terrace",
      icon: "sun",
      image: sampleMedia(2, "terrace.svg", "A terrace in the evening sun"),
    },
    {
      label: "Full kitchen",
      icon: "utensils",
      image: sampleMedia(3, "kitchen.svg", "A bright, fully equipped kitchen"),
    },
    {
      label: "Beach access",
      icon: "umbrella",
      image: sampleMedia(4, "dunes.svg", "Dunes leading down to the beach"),
    },
    {
      label: "Fast Wi-Fi",
      icon: "wifi",
      image: sampleMedia(5, "coast.svg", "A calm sea under a low sun"),
    },
  ],
  background: "default",
}
