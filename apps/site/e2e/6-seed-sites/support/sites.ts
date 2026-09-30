import {
  AVADA,
  BEACHSIDE,
  WARREN_BEACH,
  type ThemePreset,
} from "../../../src/theme"

/**
 * The three seeded Sites as the spec describes them (site-builder-milestone.md,
 * Phase 6), in the words the spec and the real sites use. The copy comes from
 * the real sites (research/brand-extraction, research/brands/<brand>/copy and
 * manifest.md): the seeds must carry the real copy in the real section order,
 * so each Page lists some of its lines in the order they appear.
 */

export type SitePage = {
  /** The Page's title, as the Admin's Pages list shows it. */
  title: string
  /** Real copy the Page shows, in this order (headings and short lines). */
  copy?: readonly string[]
  /** The Page Blocks, in order, as the Visual Editor's Outline names them. */
  blocks?: readonly string[]
  /** The real site's full-page screenshot to pair with ours. */
  reference?: string
}

export type SiteSpec = {
  /** `pnpm site <slug> …` and apps/site/.env.<slug>. */
  slug: "warren-beach" | "avada" | "beachside"
  /** The Postgres schema, which is also the key of the Site's fixtures. */
  schema: string
  /** The Site's own port (apps/site/.env.<slug>.example). */
  port: number
  /** The Brand name. */
  name: string
  /** Matches the Brand name wherever the Site writes it (logo alt, header). */
  namePattern: RegExp
  /** The brand preset the seeded Theme is. */
  preset: ThemePreset
  /** Families the seed adds to Assets › Fonts from Google Fonts. */
  fonts: readonly string[]
  /** The heading and body families the Site renders with. */
  headingFont: string
  bodyFont: string
  /** research/brands/<folder>, where the reference screenshots are. */
  brandFolder?: string
  /** The Brand's phone, in digits, shown in the Layout's Header or Footer. */
  phoneDigits?: string
  /** Real Rental names from the fixtures; Home shows at least one. */
  rentals?: readonly string[]
  pages: readonly SitePage[]
}

export const WARREN_BEACH_SITE: SiteSpec = {
  slug: "warren-beach",
  schema: "warren_beach",
  port: 3001,
  name: "Warren Beach Rentals",
  namePattern: /Warren Beach/i,
  preset: WARREN_BEACH,
  fonts: ["Source Sans 3", "Lora", "Work Sans"],
  headingFont: "Source Sans 3",
  bodyFont: "Source Sans 3",
  brandFolder: "warren-beach",
  phoneDigits: "8502310835",
  rentals: [
    "Aqua 2107",
    "122 Kelly St",
    "Crescent 217 Destin",
    "Calypso 2308W",
    "214 Toledo Place",
    "Seacrets",
    "Top Shelf",
    "Sea Lover",
    "Family Ties",
    "Bell & Tide",
    "Beach & Boat",
    "Villas at Laguna Beach 8",
  ],
  pages: [
    {
      title: "Home",
      reference: "home",
      copy: [
        "Book Your Emerald Coast Vacation Rental",
        "Featured Emerald Coast Rentals",
        "Guest Favorite Rental Amenities",
        "Vacations are better together",
        "Subscribe to our emails",
      ],
    },
    {
      title: "Rentals",
      reference: "rentals",
      copy: ["Warren Beach Rentals", "Search Vacation Rentals"],
    },
    {
      title: "Owners",
      reference: "owners",
      copy: [
        "Join Our Exclusive Collection of Premier Vacation Homes",
        "Get Your Free Rental Projection",
      ],
    },
    {
      title: "Contact",
      reference: "contact",
      copy: [
        "Contact Us",
        "Have a question? We’re here to help!",
        "Contact Information",
      ],
    },
  ],
}

export const AVADA_SITE: SiteSpec = {
  slug: "avada",
  schema: "avada",
  port: 3002,
  name: "Avada Properties",
  namePattern: /Avada/i,
  preset: AVADA,
  fonts: ["Montserrat"],
  headingFont: "Montserrat",
  bodyFont: "Montserrat",
  brandFolder: "avada",
  phoneDigits: "8653902860",
  rentals: [
    "Just Fur Relaxin'",
    "A Family Tradition",
    "The Blessing Cabin",
    "Bearfoot Splash Hideaway",
    "Whispering Pines",
    "Friends in High Places 2",
    "Serenity Awaits",
    "Yeti Lodge",
    "Blue Mist Vista",
    "An Indian Dream",
    "Majestic Overlook",
    "The Ruby 301",
  ],
  pages: [
    {
      title: "Home",
      reference: "home",
      copy: [
        "Find your Smoky Mountain stay",
        "Easy Booking",
        "Featured Smoky Mountain Rentals",
        "Book in Three Steps",
        "Close to What Matters",
        "Built Around the Guest Experience",
        "Own a Smoky Mountain Rental?",
        "What Guests Are Saying",
        "Subscribe to our emails",
      ],
    },
    {
      title: "Search",
      reference: "search",
      copy: ["Smoky Mountain Rentals"],
    },
    {
      title: "Owners",
      reference: "owners",
      copy: [
        "Property Management for Smoky Mountain Rentals",
        "We Take Care of Your Property & Guests",
        "Built Around Better Guest Decisions",
        "A Clear First Step for Owners",
        "Common Questions From Property Owners",
      ],
    },
    {
      title: "About",
      reference: "about",
      copy: [
        "Helping Guests and Owners Feel at Home in the Smokies",
        "Built for Clearer Smoky Mountain Stays",
        "Good Booking Experiences Start With Clarity",
      ],
    },
    {
      title: "Contact",
      reference: "contact",
      copy: [
        "Questions About a Stay or Your Smoky Mountain Rental?",
        "How Can We Help?",
      ],
    },
  ],
}

export const BEACHSIDE_SITE: SiteSpec = {
  slug: "beachside",
  schema: "beachside",
  port: 3003,
  name: "Beachside Vacations",
  namePattern: /Beachside/i,
  preset: BEACHSIDE,
  fonts: ["Fraunces", "Nunito Sans"],
  headingFont: "Fraunces",
  bodyFont: "Nunito Sans",
  pages: [
    {
      title: "Home",
      blocks: [
        "Search Hero",
        "Featured rentals",
        "Amenities",
        "Testimonials",
        "Newsletter",
      ],
    },
    { title: "Rentals", blocks: ["Rental grid", "FAQ"] },
    {
      title: "Owners",
      blocks: ["Hero", "Steps", "Stats", "Owner band", "FAQ", "Form"],
    },
    { title: "Contact", blocks: ["Location", "Form"] },
  ],
}

export const SITES: readonly SiteSpec[] = [
  WARREN_BEACH_SITE,
  AVADA_SITE,
  BEACHSIDE_SITE,
]

/**
 * The Avada photo the spec rules out for the Hero: a Shutterstock file
 * (research/brands/avada/manifest.md, `shutterstock_761073268`).
 */
export const AVADA_SHUTTERSTOCK_PHOTO =
  "research/brands/avada/photos/hero-sunrise-smokies.webp"

/** Beachside's palette as the spec gives it (verified against AA). */
export const BEACHSIDE_PALETTE = {
  "--primary": "#0e5e6f",
  "--accent": "#ff7f5c",
  "--accent-foreground": "#10323a",
  "--third": "#f2e3c9",
  "--foreground": "#10323a",
  "--surface-dark": "#0b2a31",
} as const

/** Avada's AA primary (spec Phase 6). */
export const AVADA_PRIMARY = "#ce4b25"
