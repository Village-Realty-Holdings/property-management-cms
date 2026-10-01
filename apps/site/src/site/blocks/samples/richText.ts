import type { BlockOf } from "../types"

type LexicalNode = { type: string; version: number; [key: string]: unknown }

const text = (value: string, format = 0): LexicalNode => ({
  type: "text",
  version: 1,
  text: value,
  detail: 0,
  format,
  mode: "normal",
  style: "",
})

const node = (
  type: string,
  children: LexicalNode[],
  extra: Record<string, unknown> = {}
): LexicalNode => ({
  type,
  version: 1,
  direction: "ltr",
  format: "",
  indent: 0,
  children,
  ...extra,
})

/** A Rich text section with a heading, a paragraph, a link and a list. */
export const richTextSample: BlockOf<"richText"> = {
  blockType: "richText",
  content: {
    root: node("root", [
      node("heading", [text("A stay worth coming back to")], { tag: "h2" }),
      node("paragraph", [
        text("Every home is cleaned, checked and "),
        text("ready when you arrive", 1),
        text(". Read our "),
        node("link", [text("guest guide")], {
          fields: { url: "/guide", newTab: false },
        }),
        text(" before you travel."),
      ]),
      node(
        "list",
        [
          node("listitem", [text("Walk to the beach")], { value: 1 }),
          node("listitem", [text("Pets welcome")], { value: 2 }),
          node("listitem", [text("Late check-out on request")], { value: 3 }),
        ],
        { listType: "bullet", tag: "ul", start: 1 }
      ),
    ]),
  } as unknown as BlockOf<"richText">["content"],
  background: "default",
}
