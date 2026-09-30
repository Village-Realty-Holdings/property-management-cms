import type { BlockOf, BlockType } from "../site/blocks/types"

/** How the Block picker groups Blocks. */
export const blockGroups = [
  "Heroes",
  "Rentals",
  "Content",
  "Social proof",
  "Forms",
] as const

export type BlockGroup = (typeof blockGroups)[number]

/** A Block as the picker creates it: everything but what the Admin assigns. */
export type BlockDefaults<T extends BlockType> = Omit<
  BlockOf<T>,
  "id" | "blockName"
>

export type CatalogueEntry<T extends BlockType = BlockType> = {
  blockType: T
  /** URL- and file-safe name: the catalogue page and the thumbnail. */
  slug: string
  /** As the Admin and the picker name it. */
  label: string
  group: BlockGroup
  /** One line for the picker. */
  description: string
  /** `/block-thumbnails/<slug>.svg`, served from `public/`. */
  thumbnail: string
  /** A new Block of this type starts from these values. */
  defaults: BlockDefaults<T>
  /** It can sit on a Default, Muted, Primary or Dark surface. */
  takesBackground: boolean
  /** The field a catalogue page's `?variant=` sets, when the Block has one. */
  variantField?: string
}

const thumbnail = (slug: string) => `/block-thumbnails/${slug}.svg`

const emptyRichText = (text: string): BlockDefaults<"richText">["content"] => ({
  root: {
    type: "root",
    version: 1,
    direction: "ltr",
    format: "",
    indent: 0,
    children: [
      {
        type: "paragraph",
        version: 1,
        direction: "ltr",
        format: "",
        indent: 0,
        children: [
          {
            type: "text",
            version: 1,
            text,
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
          },
        ],
      },
    ],
  },
})

/**
 * Every Page Block the Admin offers: its label, group, picker thumbnail and
 * the values a new one starts with. The compiler asks for an entry whenever
 * a Block is added to the Payload config, and `catalogue.test.ts` checks the
 * entries against it.
 */
export const catalogue: { [T in BlockType]: CatalogueEntry<T> } = {
  hero: {
    blockType: "hero",
    slug: "hero",
    label: "Hero",
    group: "Heroes",
    description: "The opening statement of a Page: a big heading, a button.",
    thumbnail: thumbnail("hero"),
    defaults: {
      blockType: "hero",
      heading: "Welcome",
      subheading: "Say a little about your place.",
    },
    takesBackground: false,
  },
  richText: {
    blockType: "richText",
    slug: "rich-text",
    label: "Rich text",
    group: "Content",
    description: "Free-form text with headings, lists and links.",
    thumbnail: thumbnail("rich-text"),
    defaults: {
      blockType: "richText",
      content: emptyRichText("Write something here."),
      background: "default",
    },
    takesBackground: true,
  },
  callToAction: {
    blockType: "callToAction",
    slug: "call-to-action",
    label: "Call to action",
    group: "Content",
    description: "A short pitch with one button.",
    thumbnail: thumbnail("call-to-action"),
    defaults: {
      blockType: "callToAction",
      heading: "Ready to book your stay?",
      button: { label: "Get in touch", href: "/contact" },
      style: "primary",
      background: "default",
    },
    takesBackground: true,
  },
}

/** The entries in the order the Admin offers them. */
export const catalogueEntries: CatalogueEntry[] = Object.values(
  catalogue
) as CatalogueEntry[]

/** The entry for a catalogue page's slug, if there is one. */
export function entryBySlug(slug: string): CatalogueEntry | undefined {
  return catalogueEntries.find((entry) => entry.slug === slug)
}
