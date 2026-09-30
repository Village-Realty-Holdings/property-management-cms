import type { BlockOf } from "../types"
import { sampleMedia } from "./media"

/** Image + text with every field filled: text, an icon list and a caption. */
export const imageTextSample: BlockOf<"imageText"> = {
  blockType: "imageText",
  heading: "A home by the sea, looked after",
  text: "Our team cleans, checks and welcomes, so every stay starts well.",
  image: sampleMedia(1, "terrace.svg", "A terrace in the evening sun"),
  caption: "The terrace at Dune House, at sunset",
  imageSide: "left",
  points: [
    { icon: "sparkles", text: "Professionally cleaned" },
    { icon: "key", text: "Self check-in" },
    { icon: "paw-print", text: "Pets welcome" },
  ],
  background: "default",
}
