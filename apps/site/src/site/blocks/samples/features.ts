import type { BlockOf } from "../types"

/** Features with six features, every field filled. */
export const featuresSample: BlockOf<"features"> = {
  blockType: "features",
  heading: "Why guests love staying with us",
  intro: "Small details that make a holiday feel easy.",
  features: [
    {
      icon: "sparkles",
      title: "Spotless homes",
      text: "Cleaned and checked before every stay.",
    },
    {
      icon: "map-pin",
      title: "Great locations",
      text: "A short walk from the sea and the shops.",
    },
    {
      icon: "headphones",
      title: "Real support",
      text: "A person on hand when you need one.",
    },
    {
      icon: "paw-print",
      title: "Pets welcome",
      text: "Bring the whole family, four legs included.",
    },
    {
      icon: "wifi",
      title: "Fast Wi-Fi",
      text: "Work from the terrace if you must.",
    },
    {
      icon: "key",
      title: "Easy check-in",
      text: "Arrive when it suits you.",
    },
  ],
  background: "default",
}
