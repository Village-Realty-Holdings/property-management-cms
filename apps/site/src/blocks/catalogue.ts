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
  searchHero: {
    blockType: "searchHero",
    slug: "search-hero",
    label: "Search Hero",
    group: "Heroes",
    description:
      "A Hero with a booking search: dates, guests and location (visual only).",
    thumbnail: thumbnail("search-hero"),
    defaults: {
      blockType: "searchHero",
      heading: "Find your stay",
      subheading: "Search our homes by date, guests and place.",
      searchLabel: "Search",
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
  steps: {
    blockType: "steps",
    slug: "steps",
    label: "Steps",
    group: "Content",
    description: "Three or four numbered steps, each with a title and text.",
    thumbnail: thumbnail("steps"),
    defaults: {
      blockType: "steps",
      heading: "How it works",
      steps: [
        { title: "Tell us about your home", text: "Share a few details." },
        { title: "We set everything up", text: "Photos, listing and pricing." },
        { title: "Start earning", text: "We look after every stay." },
      ],
      background: "default",
    },
    takesBackground: true,
  },
  features: {
    blockType: "features",
    slug: "features",
    label: "Features",
    group: "Content",
    description: "A grid of icon, title and text.",
    thumbnail: thumbnail("features"),
    defaults: {
      blockType: "features",
      heading: "Why stay with us",
      features: [
        {
          icon: "sparkles",
          title: "Spotless homes",
          text: "Cleaned and checked before every stay.",
        },
        {
          icon: "map-pin",
          title: "Great locations",
          text: "A short walk from the sea.",
        },
        {
          icon: "headphones",
          title: "Real support",
          text: "A person on hand when you need one.",
        },
      ],
      background: "default",
    },
    takesBackground: true,
  },
  amenities: {
    blockType: "amenities",
    slug: "amenities",
    label: "Amenities",
    group: "Content",
    description:
      "What a stay includes, as a photo-tile mosaic or an icon list.",
    thumbnail: thumbnail("amenities"),
    defaults: {
      blockType: "amenities",
      heading: "Everything you need",
      variant: "icons",
      items: [
        { label: "Private pool", icon: "waves" },
        { label: "Fast Wi-Fi", icon: "wifi" },
        { label: "Free parking", icon: "square-parking" },
      ],
      background: "default",
    },
    takesBackground: true,
    variantField: "variant",
  },
  stats: {
    blockType: "stats",
    slug: "stats",
    label: "Stats",
    group: "Social proof",
    description: "Three or four figures, each with a label.",
    thumbnail: thumbnail("stats"),
    defaults: {
      blockType: "stats",
      heading: "By the numbers",
      stats: [
        { value: "120+", label: "Homes" },
        { value: "4.9", label: "Average guest rating" },
        { value: "15", label: "Years on the coast" },
      ],
      background: "default",
    },
    takesBackground: true,
  },
  imageText: {
    blockType: "imageText",
    slug: "image-text",
    label: "Image + text",
    group: "Content",
    description:
      "An image on the left or right beside text, with an optional icon list and caption.",
    thumbnail: thumbnail("image-text"),
    defaults: {
      blockType: "imageText",
      heading: "A home by the sea",
      text: "Say a little about what makes your place special.",
      imageSide: "left",
      background: "default",
    },
    takesBackground: true,
    variantField: "imageSide",
  },
  trustStrip: {
    blockType: "trustStrip",
    slug: "trust-strip",
    label: "Trust strip",
    group: "Social proof",
    description: "A strip of text or stat items, or of partner logos.",
    thumbnail: thumbnail("trust-strip"),
    defaults: {
      blockType: "trustStrip",
      variant: "items",
      items: [
        { stat: "4.9", text: "Average guest rating" },
        { text: "Free cancellation" },
        { text: "Local support, 7 days a week" },
      ],
      background: "default",
    },
    takesBackground: true,
    variantField: "variant",
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
