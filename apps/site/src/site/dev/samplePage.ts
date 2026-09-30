import type { PageBlock } from "../blocks/types"

type RichTextContent = Extract<PageBlock, { blockType: "richText" }>["content"]

/**
 * The sample Page the Theme acceptance checks render: a Hero, a Rich text
 * section (heading, paragraph, list, link) and a Call to action. It is data
 * only, so the e2e tests publish it as a real Page through the Local API and
 * the dev-only demo route (`/dev/theme-sample`) renders the same Blocks.
 */

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

// Lexical's JSON, built loosely and checked by the Page it is saved to.
const richTextContent = {
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
} as unknown as RichTextContent

export const SAMPLE_PAGE_PATH = "/theme-sample"
export const SAMPLE_PAGE_TITLE = "Theme sample"

export const SAMPLE_BLOCKS: PageBlock[] = [
  {
    blockType: "hero",
    heading: "Welcome to the coast",
    subheading: "Handpicked homes, a short walk from the sea.",
    cta: { label: "Browse homes", href: "/homes" },
  },
  { blockType: "richText", content: richTextContent },
  {
    blockType: "callToAction",
    heading: "Ready to book your stay?",
    body: "Talk to our team and we will find the right home for you.",
    button: { label: "Get in touch", href: "/contact" },
    style: "primary",
  },
]
