/**
 * Tiny builders for Lexical rich text JSON, the shape Payload's
 * `richText` fields store: paragraphs (with inline links), headings and
 * bullet lists. Used by the seed and the Page Templates.
 */

type LexicalNode = { type: string; version: number; [k: string]: unknown }

export type RichText = {
  root: {
    type: string
    children: LexicalNode[]
    direction: "ltr" | "rtl" | null
    format: "left" | "start" | "center" | "right" | "end" | "justify" | ""
    indent: number
    version: number
  }
  [k: string]: unknown
}

const block = {
  direction: "ltr" as const,
  format: "" as const,
  indent: 0,
  version: 1,
}

function text(value: string): LexicalNode {
  return {
    type: "text",
    text: value,
    format: 0,
    detail: 0,
    mode: "normal",
    style: "",
    version: 1,
  }
}

/** An inline link to a URL (a Variable such as `{client-url}` works too). */
export type Link = { label: string; url: string }

function link({ label, url }: Link): LexicalNode {
  return {
    ...block,
    type: "link",
    version: 3,
    fields: { linkType: "custom", url, newTab: false },
    children: [text(label)],
  }
}

/** A paragraph of text, or of text and inline links. */
export function paragraph(...parts: (string | Link)[]): LexicalNode {
  return {
    ...block,
    type: "paragraph",
    textFormat: 0,
    textStyle: "",
    children: parts.map((part) =>
      typeof part === "string" ? text(part) : link(part)
    ),
  }
}

export function heading(
  value: string,
  tag: "h2" | "h3" | "h4" = "h2"
): LexicalNode {
  return { ...block, type: "heading", tag, children: [text(value)] }
}

export function bullets(items: string[]): LexicalNode {
  return {
    ...block,
    type: "list",
    listType: "bullet",
    tag: "ul",
    start: 1,
    children: items.map((item, index) => ({
      ...block,
      type: "listitem",
      value: index + 1,
      children: [text(item)],
    })),
  }
}

/**
 * A rich text document. Strings become paragraphs; pass nodes from
 * `heading`, `paragraph` or `bullets` for anything else.
 */
export function richText(...nodes: (string | LexicalNode)[]): RichText {
  return {
    root: {
      ...block,
      type: "root",
      children: nodes.map((node) =>
        typeof node === "string" ? paragraph(node) : node
      ),
    },
  }
}
