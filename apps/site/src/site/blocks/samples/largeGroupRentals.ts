import type { BlockOf } from "../types"

/** Large-group rentals for groups of twelve or more, every field filled. */
export const largeGroupRentalsSample: BlockOf<"largeGroupRentals"> = {
  blockType: "largeGroupRentals",
  heading: "Room for the whole group",
  minSleeps: 12,
  background: "default",
}
