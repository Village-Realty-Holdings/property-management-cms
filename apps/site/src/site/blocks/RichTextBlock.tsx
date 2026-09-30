import { cn } from "@workspace/ui/lib/utils"

import type { RichTextBlock as RichTextBlockData } from "../../payload-types"
import { hasText, RichText } from "../RichText"
import { backgroundOf, BlockSection } from "./BlockSection"
import type { BlockContext } from "./types"

type LexicalNode = { type?: string; text?: unknown; children?: LexicalNode[] }

const textOf = (node: LexicalNode): string =>
  typeof node.text === "string"
    ? node.text
    : (node.children ?? []).map(textOf).join("")

/** The text of the first heading in the rich text, if it has one. */
function firstHeading(content: unknown): string | null {
  const root = (content as { root?: LexicalNode } | null | undefined)?.root
  const heading = root?.children?.find((node) => node.type === "heading")
  return (heading && textOf(heading).trim()) || null
}

/**
 * Links and inline code are drawn for the page, so on the primary and dark
 * surfaces they take that surface's text colour to stay readable.
 */
const inverse =
  "[&_a]:text-inherit [&_a]:decoration-current [&_code]:text-foreground"

/** Rich text: a free-form text section at reading width. */
export function RichTextBlock({
  block,
  context,
}: {
  block: RichTextBlockData
  context: BlockContext
}) {
  if (!hasText(block.content)) return null
  const background = backgroundOf(block.background)
  return (
    <BlockSection
      background={background}
      // The section is a region, so it needs a name: its heading, or its place.
      label={firstHeading(block.content) ?? `Section ${context.index + 1}`}
    >
      <RichText
        data={block.content}
        className={cn(
          "text-lg [&>:first-child]:mt-0",
          (background === "primary" || background === "dark") && inverse
        )}
      />
    </BlockSection>
  )
}
