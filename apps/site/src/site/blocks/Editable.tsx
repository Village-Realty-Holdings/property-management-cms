import type { ComponentPropsWithoutRef, ElementType } from "react"

import type { BlockContext } from "./types"

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
  context: Pick<BlockContext, "index" | "editing">
  children: string
}

/**
 * A Block's plain text: a heading, short text or a button label. On the Site
 * it is just the text. In the Visual Editor it carries data attributes
 * (`data-block-index`, `data-editable-field`) that name the field, so the
 * canvas can edit it in place. Blocks use it for all of their plain text.
 */
export function EditableText({
  as: Tag = "span",
  field,
  context,
  children,
  ...rest
}: Props) {
  const editing = context.editing
    ? { "data-block-index": context.index, "data-editable-field": field }
    : undefined
  return (
    <Tag {...rest} {...editing}>
      {children}
    </Tag>
  )
}
