import type { CallToActionBlock, Media } from "../payload-types"

/**
 * The Blocks the Visual Editor starts a Page with, and the catalogue labels
 * the Outline shows, as plain data. The Page being edited is held as a
 * document (see editor/modes/pageDocument.ts), with every Block as stored.
 */
export type LinkValues = { label: string; href: string }

export type HeroValues = {
  id?: string
  blockType: "hero"
  heading: string
  subheading: string
  image: number | null
  cta: LinkValues
}

export type RichTextValues = {
  id?: string
  blockType: "richText"
  markdown: string
}

export type CallToActionValues = {
  id?: string
  blockType: "callToAction"
  heading: string
  body: string
  button: LinkValues
  style: CallToActionBlock["style"]
}

export type BlockValues = HeroValues | RichTextValues | CallToActionValues

export type PageValues = {
  title: string
  path: string
  blocks: BlockValues[]
  seo: { title: string; description: string; image: number | null }
}

export const BLOCK_TYPES = [
  {
    blockType: "hero",
    label: "Hero",
    description: "A large heading with an image and a button.",
  },
  {
    blockType: "richText",
    label: "Rich text",
    description: "Free-form text with headings, lists and links.",
  },
  {
    blockType: "callToAction",
    label: "Call to action",
    description: "A short pitch with one button.",
  },
] as const satisfies {
  blockType: BlockValues["blockType"]
  label: string
  description: string
}[]

export function emptyBlock(blockType: BlockValues["blockType"]): BlockValues {
  switch (blockType) {
    case "hero":
      return {
        blockType,
        heading: "",
        subheading: "",
        image: null,
        cta: { label: "", href: "" },
      }
    case "richText":
      return { blockType, markdown: "" }
    case "callToAction":
      return {
        blockType,
        heading: "",
        body: "",
        button: { label: "", href: "" },
        style: "primary",
      }
  }
}

export const mediaId = (value: number | Media | null | undefined) =>
  value == null ? null : typeof value === "object" ? value.id : value
