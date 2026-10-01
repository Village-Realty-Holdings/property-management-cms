import type { BlockOf } from "../types"

/** Featured rentals showing three Rentals in a grid, every field filled. */
export const featuredRentalsSample: BlockOf<"featuredRentals"> = {
  blockType: "featuredRentals",
  heading: "Stay in one of our featured homes",
  count: 3,
  variant: "grid",
  background: "default",
}
