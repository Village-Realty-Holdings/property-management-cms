import { cn } from "@workspace/ui/lib/utils"

import type { RichTextBlock as RichTextBlockData } from "../../payload-types"
import { RichTextEditing } from "../editing/RichTextEditing"
import { canEditInPlace } from "../editing/canEditInPlace"
import { hasText, RichText } from "../RichText"
import { BlockSection, surfaceOf } from "./BlockSection"
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

/** Rich text: a free-form text section, at reading width or across the page. */
export function RichTextBlock({
  block,
  context,
}: {
  block: RichTextBlockData
  context: BlockContext
}) {
  // In the Visual Editor an empty Block is still there to be typed into.
  const editable = context.editing && canEditInPlace(block.content)
  if (!editable && !hasText(block.content)) return null
  const background = surfaceOf(block.background, context)
  const className = cn(
    "text-lg [&>:first-child]:mt-0",
    block.width === "wide" && "max-w-none",
    (background === "primary" || background === "dark") && inverse
  )
  return (
    <BlockSection
      background={background}
      // The section is a region, so it needs a name: its heading, or its place.
      label={firstHeading(block.content) ?? `Section ${context.index + 1}`}
    >
      {editable ? (
        // Rich text is edited in place, with a floating toolbar. Content with
        // anything the editor would not keep whole is edited in the Block tab.
        <RichTextEditing
          field="content"
          content={block.content}
          context={context}
          className={className}
        />
      ) : (
        <RichText data={block.content} className={className} />
      )}
    </BlockSection>
  )
}
