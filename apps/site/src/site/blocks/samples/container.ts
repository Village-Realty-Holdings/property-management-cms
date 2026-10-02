import type { BlockOf } from "../types"
import { callToActionSample } from "./callToAction"
import { richTextSample } from "./richText"

/** A Container of two columns: a Rich text beside a Call to action. */
export const containerSample: BlockOf<"container"> = {
  blockType: "container",
  columns: "2",
  gap: "medium",
  align: "centre",
  width: "page",
  background: "default",
  children: [richTextSample, callToActionSample],
}
