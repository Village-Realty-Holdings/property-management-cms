import type { BlockOf } from "../types"

/** An Owner band on the dark surface, every field filled. */
export const ownerBandSample: BlockOf<"ownerBand"> = {
  blockType: "ownerBand",
  heading: "Own a home by the sea? Let us look after it.",
  pitch:
    "We handle bookings, guests and upkeep, so your home earns while you enjoy it.",
  benefits: [
    { text: "Full-service management, from listing to turnover" },
    { text: "Monthly owner statements you can read at a glance" },
    { text: "A local team on call, every day" },
  ],
  cta: { label: "Talk to us about your home", href: "/owners" },
  background: "dark",
}
