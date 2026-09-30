import type { RichTextBlock as RichTextBlockData } from "../../payload-types"
import { hasText, RichText } from "../RichText"
import { container, sectionY } from "./types"

/** Rich text: a free-form text section at reading width. */
export function RichTextBlock({ block }: { block: RichTextBlockData }) {
  if (!hasText(block.content)) return null
  return (
    <section className={`${container} ${sectionY}`}>
      <RichText
        data={block.content}
        className="text-lg [&>:first-child]:mt-0"
      />
    </section>
  )
}
