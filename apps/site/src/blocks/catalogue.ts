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
  featuredRentals: {
    blockType: "featuredRentals",
    slug: "featured-rentals",
    label: "Featured rentals",
    group: "Rentals",
    description:
      "The Site's first few Rentals as cards, in a carousel or a grid.",
    thumbnail: thumbnail("featured-rentals"),
    defaults: {
      blockType: "featuredRentals",
      heading: "Featured rentals",
      count: 3,
      variant: "grid",
      background: "default",
    },
    takesBackground: true,
    variantField: "variant",
  },
  largeGroupRentals: {
    blockType: "largeGroupRentals",
    slug: "large-group-rentals",
    label: "Large-group rentals",
    group: "Rentals",
    description: "The Rentals that sleep at least a number of guests you set.",
    thumbnail: thumbnail("large-group-rentals"),
    defaults: {
      blockType: "largeGroupRentals",
      heading: "Room for the whole group",
      minSleeps: 12,
      background: "default",
    },
    takesBackground: true,
  },
  rentalGrid: {
    blockType: "rentalGrid",
    slug: "rental-grid",
    label: "Rental grid",
    group: "Rentals",
    description:
      "Every Rental in a grid, with filter chips, a sort and simple pagination.",
    thumbnail: thumbnail("rental-grid"),
    defaults: {
      blockType: "rentalGrid",
      heading: "Our homes",
      pageSize: 6,
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
  testimonials: {
    blockType: "testimonials",
    slug: "testimonials",
    label: "Testimonials",
    group: "Social proof",
    description:
      "Guest quotes with a name, a role line and a star rating, in a carousel or a grid.",
    thumbnail: thumbnail("testimonials"),
    defaults: {
      blockType: "testimonials",
      heading: "What our guests say",
      variant: "carousel",
      testimonials: [
        {
          quote:
            "A spotless home, a warm welcome and a view we still talk about.",
          name: "Alex Morgan",
          role: "Stayed for a week in June",
          rating: 5,
        },
        {
          quote: "Easy to book, and the team answered every question quickly.",
          name: "Sam Rivera",
          role: "Family trip",
          rating: 5,
        },
      ],
      background: "default",
    },
    takesBackground: true,
    variantField: "variant",
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
  ownerBand: {
    blockType: "ownerBand",
    slug: "owner-band",
    label: "Owner band",
    group: "Content",
    description:
      "A pitch to property owners: benefits and a button, usually on the dark surface.",
    thumbnail: thumbnail("owner-band"),
    defaults: {
      blockType: "ownerBand",
      heading: "Own a home? Let us look after it.",
      pitch:
        "We handle bookings, guests and upkeep, so your home earns while you enjoy it.",
      benefits: [
        { text: "Full-service management, from listing to turnover" },
        { text: "Monthly owner statements you can read at a glance" },
        { text: "Local team on call, every day" },
      ],
      cta: { label: "Talk to us about your home", href: "/contact" },
      background: "dark",
    },
    takesBackground: true,
  },
  newsletter: {
    blockType: "newsletter",
    slug: "newsletter",
    label: "Newsletter",
    group: "Forms",
    description: "A heading, some text and a visual-only email form.",
    thumbnail: thumbnail("newsletter"),
    defaults: {
      blockType: "newsletter",
      heading: "Stay in the loop",
      text: "New homes, seasonal offers and local tips, once a month.",
      emailPlaceholder: "Your email address",
      buttonLabel: "Subscribe",
      background: "default",
    },
    takesBackground: true,
  },
  blogTeaser: {
    blockType: "blogTeaser",
    slug: "blog-teaser",
    label: "Blog teaser",
    group: "Content",
    description:
      "The Site's first three blog posts as cards, each linking out.",
    thumbnail: thumbnail("blog-teaser"),
    defaults: {
      blockType: "blogTeaser",
      heading: "From the journal",
      background: "default",
    },
    takesBackground: true,
  },
  location: {
    blockType: "location",
    slug: "location",
    label: "Location",
    group: "Content",
    description:
      "An address and some text beside a static map image or a map card.",
    thumbnail: thumbnail("location"),
    defaults: {
      blockType: "location",
      heading: "Find us",
      address: "12 Harbour Road, Seaside Bay",
      map: "card",
      background: "default",
    },
    takesBackground: true,
    variantField: "map",
  },
  faq: {
    blockType: "faq",
    slug: "faq",
    label: "FAQ",
    group: "Content",
    description: "Question and answer pairs in an accordion.",
    thumbnail: thumbnail("faq"),
    defaults: {
      blockType: "faq",
      heading: "Frequently asked questions",
      questions: [
        {
          question: "What time is check-in?",
          answer: "Check-in is from 4pm and check-out is by 10am.",
        },
        {
          question: "Can I bring a pet?",
          answer: "Some homes welcome pets. Look for the pet-friendly label.",
        },
      ],
      background: "default",
    },
    takesBackground: true,
  },
  form: {
    blockType: "form",
    slug: "form",
    label: "Form",
    group: "Forms",
    description:
      "A visual-only form with the fields you choose. It stores nothing.",
    thumbnail: thumbnail("form"),
    defaults: {
      blockType: "form",
      heading: "Get in touch",
      formFields: ["name", "email", "message"],
      submitLabel: "Send",
      successMessage:
        "Thank you. We have received your message and will be in touch soon.",
      background: "default",
    },
    takesBackground: true,
  },
  button: {
    blockType: "button",
    slug: "button",
    label: "Button",
    group: "Content",
    description: "One button: a label and a link.",
    thumbnail: thumbnail("button"),
    defaults: {
      blockType: "button",
      link: { label: "Find out more", href: "/contact" },
      style: "primary",
      align: "start",
    },
    takesBackground: false,
  },
  image: {
    blockType: "image",
    slug: "image",
    label: "Image",
    group: "Content",
    description: "One image, at its own shape or cropped, with a caption.",
    thumbnail: thumbnail("image"),
    defaults: {
      blockType: "image",
      aspect: "original",
    },
    takesBackground: false,
  },
  container: {
    blockType: "container",
    slug: "container",
    label: "Container",
    group: "Content",
    description: "Holds other Blocks, as a stack or as columns side by side.",
    thumbnail: thumbnail("container"),
    defaults: {
      blockType: "container",
      columns: "1",
      gap: "medium",
      align: "top",
      width: "page",
      background: "default",
      children: [],
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
