import type { BlockOf } from "../types"

/** A Button with every field filled. */
export const buttonSample: BlockOf<"button"> = {
  blockType: "button",
  link: { label: "See every home we look after", href: "/rentals" },
  style: "primary",
  align: "start",
}
