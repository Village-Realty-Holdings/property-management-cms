import {
  HOME_STARTER,
  TUCK_IN_STARTER,
  type StarterTemplate,
} from "../pageTemplates/starters"

/**
 * The Starter Kits (apps/site ADR-0009): what a new Site is set up from, in
 * one go, from Tools. A kit is code: it names a Theme to start with and the
 * Pages to add (with the Layout they pick), and asks for whatever its Pages'
 * text needs. The Brand and SEO details are asked of every kit.
 *
 * A kit's Pages are added as Drafts and only where no Page has the path yet,
 * so applying a kit never replaces a Page.
 */

export type KitPage = {
  title: string
  path: string
  blocks: StarterTemplate["blocks"]
  /** The Layout the Page picks, made when the Site has none of that name. */
  layout?: StarterTemplate["layout"]
}

export type KitQuestion = {
  key: string
  label: string
  help: string
  /** The placeholder in the kit's text that the answer replaces. */
  token: string
}

export type StarterKit = {
  id: string
  name: string
  blurb: string
  /** What the kit adds, for its card. */
  includes: string[]
  /** The Theme preset it suggests (src/theme/presets.ts). */
  theme: string
  questions: KitQuestion[]
  pages: KitPage[]
}

/** Placeholders every kit's text may use, filled from the Brand. */
export const BRAND_TOKENS = {
  name: "[Our Brand]",
  phone: "[phone number]",
} as const

const TUCK_IN: StarterKit = {
  id: "tuck-in",
  name: "Tuck-in",
  blurb:
    "A one-page Site announcing that a company has joined the brand: what owners can expect, then a welcome for guests.",
  includes: [
    "A Home Page with the announcement",
    "The Tuck-in Layout: logo and phone number above, a copyright line below",
  ],
  theme: "classic",
  questions: [
    {
      key: "company",
      label: "Company joining",
      help: "The company that has joined the brand. It replaces [Company] in the announcement.",
      token: "[Company]",
    },
  ],
  pages: [
    {
      title: "Home",
      path: "/",
      blocks: TUCK_IN_STARTER.blocks,
      layout: TUCK_IN_STARTER.layout,
    },
  ],
}

const RENTAL_SITE: StarterKit = {
  id: "rental-site",
  name: "Rental site",
  blurb:
    "A Home Page for a rental brand: search, featured rentals, how it works, owners and testimonials.",
  includes: ["A Home Page with the Blocks of the Home Page Template"],
  theme: "harbour",
  questions: [],
  pages: [{ title: "Home", path: "/", blocks: HOME_STARTER.blocks }],
}

export const STARTER_KITS: readonly StarterKit[] = [TUCK_IN, RENTAL_SITE]

export function findStarterKit(id: unknown): StarterKit | undefined {
  return STARTER_KITS.find((kit) => kit.id === id)
}
