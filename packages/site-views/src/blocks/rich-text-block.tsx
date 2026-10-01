import { RichText } from "../site/rich-text"

import { lexicalText } from "./lib"
import { container, type BlockRendererProps } from "./types"

/** Rich Text: a free-form text section at reading width. */
export function RichTextBlock({ block }: BlockRendererProps) {
  if (!lexicalText(block.content)) return null
  return (
    <section className={`${container} py-10 sm:py-14`}>
      <RichText
        data={block.content}
        className="text-lg [&>:first-child]:mt-0"
      />
    </section>
  )
}
