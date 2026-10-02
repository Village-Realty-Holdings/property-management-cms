import type { Payload } from "payload"

import { catalogue } from "../blocks/catalogue"
import { saveLayout } from "../layouts/record"
import type { Layout, Page, User } from "../payload-types"

/**
 * The starter Page Templates: Pages (Drafts, marked as Page Templates) that a
 * Site can add to start new Pages from. They are ordinary Pages afterwards:
 * Staff edit, rename or delete them like any other.
 *
 *   Home      the structure of the seeded Sites' Home Pages
 *   Tuck-in   an announcement that a company has joined the brand, as on
 *             pclodge.com: for owners, then for guests, each a Container of
 *             text across the page with its button under it (ADR-0007). It
 *             comes with its own Layout, "Tuck-in": the logo and phone number
 *             above, a copyright line below, no menu.
 *   Guest survey
 *             what a guest opens after a stay: a rating out of five stars,
 *             then a request for a review or a feedback form (the Guest
 *             survey Block). It comes with its own Layout, "Survey": the
 *             logo above, a copyright line and the privacy link below.
 */

type Blocks = NonNullable<Page["blocks"]>
type RichText = Extract<Blocks[number], { blockType: "richText" }>["content"]

type Access = {
  overrideAccess: false
  user: (User & { collection: "users" }) | null
}

export type StarterTemplate = {
  path: string
  title: string
  blocks: Blocks
  /** The Layout it picks, made with it when the Site has none of that name. */
  layout?: Pick<Layout, "name" | "header" | "footer">
}

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
const heading = (value: string, tag: "h1" | "h2" = "h2") =>
  node("heading", [text(value)], { tag })
const rule = () => ({ type: "horizontalrule", version: 1 })
const paragraph = (value: string) =>
  node("paragraph", [text(value)], { textFormat: 0 })
/** A bold title on its own line, then the text. */
const point = (title: string, body: string) =>
  node(
    "paragraph",
    [text(title, true), { type: "linebreak", version: 1 }, text(body)],
    { textFormat: 0 }
  )
/** A Block a Container holds. */
type Child = NonNullable<
  Extract<Blocks[number], { blockType: "container" }>["children"]
>[number]
/** Text across the page. */
const section = (...children: object[]): Child => ({
  blockType: "richText",
  content: { root: node("root", children) } as unknown as RichText,
  width: "wide",
  background: "default",
})
/** A button at the start of its line, to a Site path. */
const button = (label: string, href: string): Child => ({
  blockType: "button",
  link: { label, href },
  style: "primary",
  align: "start",
})
/** A stack of Blocks: a Container of one column. */
const stack = (...children: Child[]): Blocks[number] => ({
  blockType: "container",
  columns: "1",
  gap: "medium",
  align: "top",
  width: "page",
  background: "default",
  children,
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
  layout: {
    name: "Tuck-in",
    header: [
      { blockType: "logo", size: "large", showTagline: false },
      { blockType: "headerActions", showPhone: true },
    ],
    footer: [
      { blockType: "legalBar", text: "© {year} {name}. All rights reserved." },
    ],
  },
  blocks: [
    stack(
      section(
        heading("[Company] Joins [Our Brand]!", "h1"),
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
      button("Learn More", "/owners")
    ),
    stack(
      section(
        rule(),
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
      button("Explore Our Properties", "/rentals")
    ),
  ],
}

const guestSurvey: StarterTemplate = {
  path: "/templates/guest-survey",
  title: "Guest survey template",
  layout: {
    name: "Survey",
    header: [{ blockType: "logo", size: "large", showTagline: false }],
    footer: [
      {
        blockType: "legalBar",
        text: "© {year} {name}",
        links: [
          { label: "Privacy Policy", link: { type: "url", url: "/privacy" } },
        ],
      },
    ],
  },
  blocks: [block("guestSurvey")],
}

export const STARTER_TEMPLATES: readonly StarterTemplate[] = [
  home,
  tuckIn,
  guestSurvey,
]

/** The starters by name, for the Starter Kits that begin a Site from them. */
export const HOME_STARTER = home
export const TUCK_IN_STARTER = tuckIn
export const GUEST_SURVEY_STARTER = guestSurvey

export type StarterResult = {
  path: string
  title: string
  action: "created" | "unchanged"
}

/** The Layout of that name, made from `layout` when the Site has none. */
export async function ensureLayout(
  payload: Payload,
  access: Access,
  layout: NonNullable<StarterTemplate["layout"]>
): Promise<number> {
  const { docs } = await payload.find({
    collection: "layouts",
    where: { name: { equals: layout.name } },
    limit: 1,
    depth: 0,
    select: { name: true },
    ...access,
  })
  if (docs[0]) return docs[0].id
  if (!access.user) throw new Error("Sign in to add a Layout.")
  const made = await saveLayout(payload, {
    user: access.user,
    // Never the default, and no paths: only the Pages that pick it use it.
    data: { ...layout, paths: [], isDefault: false },
  })
  return made.id
}

/**
 * Adds each starter Page Template whose path no Page has yet, as a Draft,
 * with the Layout it picks. A Page already at the path is left as it is,
 * whatever it holds, so Staff's changes to a starter survive and running this
 * again changes nothing.
 */
export async function ensureStarterTemplates(
  payload: Payload,
  access: Access
): Promise<StarterResult[]> {
  const results: StarterResult[] = []
  for (const { path, title, blocks, layout } of STARTER_TEMPLATES) {
    const { totalDocs } = await payload.count({
      collection: "pages",
      where: { path: { equals: path } },
      ...access,
    })
    if (totalDocs === 0) {
      const layoutId = layout && (await ensureLayout(payload, access, layout))
      await payload.create({
        collection: "pages",
        data: {
          path,
          title,
          blocks,
          isTemplate: true,
          _status: "draft",
          ...(layoutId
            ? { layout: { mode: "specific" as const, layout: layoutId } }
            : {}),
        },
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
