import type { BlockOf } from "../types"
import { sampleMedia } from "./media"

/** An Image with every field filled: a picture, cropped, with a caption. */
export const imageSample: BlockOf<"image"> = {
  blockType: "image",
  image: sampleMedia(1, "terrace.svg", "A terrace in the evening sun"),
  caption: "The terrace at Dune House, at sunset",
  aspect: "16x9",
}
