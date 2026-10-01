import type {
  OwnRegionBlockType,
  Region,
  RegionBlockOf,
  RegionBlockType,
} from "./types"

type Base<T extends RegionBlockType> = {
  blockType: T
  /** URL- and file-safe name: the thumbnail's file. */
  slug: string
  /** As the Admin and the picker name it. */
  label: string
  /** One line for the picker. */
  description: string
  /** `/block-thumbnails/<slug>.svg`, served from `public/`. */
  thumbnail: string
  /** The region the picker offers it in. */
  region: Region
}

/**
 * A region Block's entry. A Block that only one region takes has its own
 * component and the `defaults` a new one starts with. Newsletter and Call to
 * action are page Blocks the Footer also takes (`shared`): they render
 * through the page Block registry, and their defaults are the page
 * catalogue's.
 */
export type RegionCatalogueEntry<T extends RegionBlockType = RegionBlockType> =
  T extends OwnRegionBlockType
    ? Base<T> & {
        shared: false
        defaults: Omit<RegionBlockOf<T>, "id" | "blockName">
      }
    : Base<T> & { shared: true }

const thumbnail = (slug: string) => `/block-thumbnails/${slug}.svg`

/**
 * Every Block a Layout's Header or Footer takes: its label, picker thumbnail
 * and the region that allows it. The compiler asks for an entry whenever a
 * Block is added to a region's Payload config, and `regions.test.tsx` checks
 * the entries against it.
 */
export const regionCatalogueByType: {
  [T in RegionBlockType]: RegionCatalogueEntry<T>
} = {
  logo: {
    blockType: "logo",
    slug: "logo",
    label: "Logo",
    description: "The Brand's logo, or its name, linking Home.",
    thumbnail: thumbnail("logo"),
    region: "header",
    shared: false,
    defaults: { blockType: "logo", size: "medium", showTagline: false },
  },
  navigation: {
    blockType: "navigation",
    slug: "navigation",
    label: "Navigation",
    description: "The menu: links to Pages or URLs, with dropdowns.",
    thumbnail: thumbnail("navigation"),
    region: "header",
    shared: false,
    defaults: {
      blockType: "navigation",
      items: [
        { label: "Home", link: { type: "url", url: "/" } },
        { label: "Contact", link: { type: "url", url: "/contact" } },
      ],
    },
  },
  headerActions: {
    blockType: "headerActions",
    slug: "header-actions",
    label: "Header actions",
    description: "A phone number, a button and a login link.",
    thumbnail: thumbnail("header-actions"),
    region: "header",
    shared: false,
    defaults: {
      blockType: "headerActions",
      showPhone: true,
      button: { label: "Book now", href: "/contact" },
    },
  },
  utilityStrip: {
    blockType: "utilityStrip",
    slug: "utility-strip",
    label: "Utility strip",
    description: "A thin strip above the Header: one line and a few links.",
    thumbnail: thumbnail("utility-strip"),
    region: "header",
    shared: false,
    defaults: {
      blockType: "utilityStrip",
      text: "Free cancellation on every stay",
    },
  },
  footerColumns: {
    blockType: "footerColumns",
    slug: "footer-columns",
    label: "Footer columns",
    description:
      "Columns of links, the address, opening hours or social links.",
    thumbnail: thumbnail("footer-columns"),
    region: "footer",
    shared: false,
    defaults: {
      blockType: "footerColumns",
      columns: [
        { heading: "Visit us", content: "address" },
        { heading: "Follow us", content: "social" },
      ],
    },
  },
  legalBar: {
    blockType: "legalBar",
    slug: "legal-bar",
    label: "Legal bar",
    description: "The copyright line and legal links.",
    thumbnail: thumbnail("legal-bar"),
    region: "footer",
    shared: false,
    defaults: { blockType: "legalBar", text: "© {year} {name}" },
  },
  newsletter: {
    blockType: "newsletter",
    slug: "newsletter",
    label: "Newsletter",
    description: "A heading and an email form.",
    thumbnail: thumbnail("newsletter"),
    region: "footer",
    shared: true,
  },
  callToAction: {
    blockType: "callToAction",
    slug: "call-to-action",
    label: "Call to action",
    description: "A short pitch with one button.",
    thumbnail: thumbnail("call-to-action"),
    region: "footer",
    shared: true,
  },
}

/** The order the picker offers them in, which is the Payload config's. */
const order: Record<Region, RegionBlockType[]> = {
  header: ["logo", "navigation", "headerActions", "utilityStrip"],
  footer: ["footerColumns", "legalBar", "newsletter", "callToAction"],
}

/** The entry for a region Block type. */
export function regionCatalogueEntry<T extends RegionBlockType>(
  blockType: T
): RegionCatalogueEntry<T> {
  return regionCatalogueByType[blockType]
}

/** The entries for the Blocks `region` takes, in the order the picker offers them. */
export function regionCatalogue(region: Region): RegionCatalogueEntry[] {
  return order[region].map((type) => regionCatalogueByType[type])
}

/** Whether `region` takes the Block stored under `blockType`. */
export function regionTakes(region: Region, blockType: string): boolean {
  return (
    Object.hasOwn(regionCatalogueByType, blockType) &&
    regionCatalogueByType[blockType as RegionBlockType].region === region
  )
}
