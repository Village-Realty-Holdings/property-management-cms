import type { BlockOf } from "../types"

/** Stats with four figures, every field filled. */
export const statsSample: BlockOf<"stats"> = {
  blockType: "stats",
  heading: "A few numbers we are proud of",
  stats: [
    { value: "120+", label: "Homes looked after" },
    { value: "4.9", label: "Average guest rating" },
    { value: "15", label: "Years on the coast" },
    { value: "98%", label: "Guests who return" },
  ],
  background: "default",
}
