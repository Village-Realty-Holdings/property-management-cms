import type { BlockOf } from "../types"

/** A Hero with every field filled: heading, subheading, image and button. */
export const heroSample: BlockOf<"hero"> = {
  blockType: "hero",
  heading: "Welcome to the coast",
  subheading: "Handpicked homes, a short walk from the sea.",
  image: {
    id: 0,
    url: "/block-samples/coast.svg",
    alt: "A calm sea under a low sun",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  cta: { label: "Browse homes", href: "/homes" },
}
