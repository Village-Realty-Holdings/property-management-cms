import type { Payload } from "payload"

import { catalogue } from "../blocks/catalogue"
import type { Page, User } from "../payload-types"

/**
 * The starter Page Templates: Pages (Drafts, marked as Page Templates) that a
 * Site can add to start new Pages from. They are ordinary Pages afterwards:
 * Staff edit, rename or delete them like any other.
 *
 *   Home      the structure of the seeded Sites' Home Pages
 *   Tuck-in   an announcement that a company has joined the brand, with what
 *             it means for owners and for guests (as on pclodge.com)
 */

type Blocks = NonNullable<Page["blocks"]>
type RichText = Extract<Blocks[number], { blockType: "richText" }>["content"]

type Access = {
  overrideAccess: false
  user: (User & { collection: "users" }) | null
}

export type StarterTemplate = { path: string; title: string; blocks: Blocks }

const node = (type: string, children: object[], extra: object = {}) => ({
  type,
  version: 1,
  direction: "ltr",
  format: "",
  indent: 0,
  children,
  ...extra,
})
const text = (value: string, bold = false) => ({
  type: "text",
  version: 1,
  text: value,
  detail: 0,
  format: bold ? 1 : 0,
  mode: "normal",
  style: "",
})
const heading = (value: string) => node("heading", [text(value)], { tag: "h2" })
const paragraph = (value: string) =>
  node("paragraph", [text(value)], { textFormat: 0 })
/** A bold title on its own line, then the text. */
const point = (title: string, body: string) =>
  node(
    "paragraph",
    [text(title, true), { type: "linebreak", version: 1 }, text(body)],
    { textFormat: 0 }
  )
const richText = (...children: object[]): Blocks[number] => ({
  blockType: "richText",
  content: { root: node("root", children) } as unknown as RichText,
  background: "default",
})

const block = <T extends keyof typeof catalogue>(blockType: T) =>
  ({ ...catalogue[blockType].defaults }) as unknown as Blocks[number]

const home: StarterTemplate = {
  path: "/templates/home",
  title: "Home template",
  blocks: [
    block("searchHero"),
    block("featuredRentals"),
    block("steps"),
    block("imageText"),
    block("features"),
    block("ownerBand"),
    block("testimonials"),
    block("callToAction"),
  ],
}

const tuckIn: StarterTemplate = {
  path: "/templates/tuck-in",
  title: "Tuck-in template",
  blocks: [
    {
      blockType: "hero",
      heading: "[Company] Joins [Our Brand]!",
      subheading:
        "[Company] is now part of [Our Brand]. Owners and guests: here's what the change means for you.",
    },
    richText(
      heading("What Owners Can Expect"),
      paragraph(
        "[Our Brand] is thrilled to welcome [Company] to the family. This partnership is designed to elevate your ownership experience while building on the service and care you already know."
      ),
      paragraph(
        "As an owner, you'll benefit from enhanced services, expanded marketing reach, and an unwavering focus on maximizing your property's revenue."
      ),
      point(
        "Proven Property Management",
        "Our dedicated operations team keeps your property guest-ready, protected, and performing at its best."
      ),
      point(
        "More Visibility, More Bookings",
        "Your property will be showcased across top channels to attract more qualified guests and generate stronger returns."
      ),
      point(
        "Dedicated Owner Support",
        "Work directly with our owner team, who provide personalized support, proactive communication, and guidance to keep your property well-maintained and consistently profitable."
      ),
      paragraph("We're excited to begin this new chapter with you.")
    ),
    {
      blockType: "callToAction",
      heading: "Questions about your property?",
      button: { label: "Learn More", href: "/owners" },
      style: "primary",
      background: "muted",
    },
    richText(
      heading("Welcome, Guests!"),
      paragraph(
        "[Company] is now part of the [Our Brand] family, and we're excited to welcome you to this next chapter."
      ),
      point(
        "What This Means for You",
        "Your bookings are secure. All existing reservations are confirmed, and you'll continue to receive the reliable service you're used to."
      ),
      point(
        "The Same Experience You Love",
        "We share a commitment to exceptional guest experiences, so you can expect the same comfort, cleanliness, and hospitality."
      ),
      point(
        "A Greater Selection of Stays",
        "Choose from a wide variety of homes with the space, amenities, and style that fit your ideal vacation."
      ),
      point(
        "We're Here to Help",
        "Have questions about an existing or future stay? Reach us at [phone number]."
      )
    ),
    {
      blockType: "callToAction",
      heading: "Find your next stay",
      button: { label: "Explore Our Properties", href: "/" },
      style: "primary",
      background: "default",
    },
  ],
}

export const STARTER_TEMPLATES: readonly StarterTemplate[] = [home, tuckIn]

export type StarterResult = {
  path: string
  title: string
  action: "created" | "unchanged"
}

/**
 * Adds each starter Page Template whose path no Page has yet, as a Draft. A
 * Page already at the path is left as it is, whatever it holds, so Staff's
 * changes to a starter survive and running this again changes nothing.
 */
export async function ensureStarterTemplates(
  payload: Payload,
  access: Access
): Promise<StarterResult[]> {
  const results: StarterResult[] = []
  for (const { path, title, blocks } of STARTER_TEMPLATES) {
    const { totalDocs } = await payload.count({
      collection: "pages",
      where: { path: { equals: path } },
      ...access,
    })
    if (totalDocs === 0) {
      await payload.create({
        collection: "pages",
        data: { path, title, blocks, isTemplate: true, _status: "draft" },
        draft: true,
        depth: 0,
        ...access,
      })
    }
    results.push({
      path,
      title,
      action: totalDocs === 0 ? "created" : "unchanged",
    })
  }
  return results
}
