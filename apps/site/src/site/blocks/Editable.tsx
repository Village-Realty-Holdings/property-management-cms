import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react"

import { EditingText } from "../editing/EditingText"
import type { BlockContext, BlockPlace } from "./types"

type Tag = Extract<
  ElementType,
  "span" | "h1" | "h2" | "h3" | "h4" | "p" | "div" | "strong" | "small"
>

type Props = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  as?: Tag
  /**
   * The text's field in the Block, by path: "heading", "cta.label". The
   * Visual Editor reads it to know what to save.
   */
  field: string
  /**
   * Whether Enter adds a line when the text is edited in place. By default it
   * ends the edit, which suits a heading, a label or a short line.
   */
  multiline?: boolean
  context: BlockPlace & Pick<BlockContext, "editing">
  /**
   * The text, which may carry inline markup that leaves its `textContent`
   * whole (a Hero's styled accent word), so the canvas still reads the field.
   */
  children: ReactNode
}

/**
 * A Block's plain text: a heading, short text or a button label. On the Site
 * it is just the text. In the Visual Editor it names its field and Block
 * (`data-block-index`, `data-editable-field`) and is edited in place as plain
 * text (see EditingText). Blocks use it for all of their plain text.
 */
export function EditableText({
  as: Tag = "span",
  field,
  multiline,
  context,
  children,
  ...rest
}: Props) {
  if (!context.editing) return <Tag {...rest}>{children}</Tag>
  return (
    <EditingText
      {...rest}
      as={Tag}
      field={field}
      index={context.index}
      multiline={multiline}
    >
      {children}
    </EditingText>
  )
}
