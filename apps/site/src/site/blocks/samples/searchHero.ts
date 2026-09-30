import type { BlockOf } from "../types"
import { sampleMedia } from "./media"

/** A Search Hero with every field filled. */
export const searchHeroSample: BlockOf<"searchHero"> = {
  blockType: "searchHero",
  eyebrow: "Book direct and save",
  heading: "Find your stay by the sea",
  accentWord: "sea",
  subheading: "Search our homes by date, guests and place.",
  image: sampleMedia(0, "coast.svg", "A calm sea under a low sun"),
  searchLabel: "Search",
  locations: [
    { name: "Warren Beach" },
    { name: "Harbour Point" },
    { name: "The Dunes" },
  ],
}
