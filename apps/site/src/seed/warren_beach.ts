import path from "node:path"
import { fileURLToPath } from "node:url"

import type { Page } from "../payload-types"
import { presetInputs, WARREN_BEACH } from "../theme"
import type { SeedModule } from "./index"

/**
 * The seed of the `warren_beach` Site: Warren Beach Rentals, the Emerald
 * Coast (Destin, 30A and Panama City Beach) company at warrenbeachrentals.com.
 *
 * The copy, the section order, the logo and the photos come from
 * research/brand-extraction (research/brands/warren-beach: manifest.md, copy/,
 * screenshots/, logo/ and photos/). The logo and photos are kept in
 * apps/site/seed/warren-beach/, so the seed needs nothing outside the app.
 * The rental-* photos are not: Rentals are fixtures (src/site/fixtures), not
 * Media.
 *
 * Written with the helpers of `seed` (src/seed/upsert.ts), so running it a
 * second time changes nothing.
 */

/** Where the logo and photos are kept. */
const ASSETS = fileURLToPath(
  new URL("../../seed/warren-beach/", import.meta.url)
)
const asset = (...parts: string[]) => path.join(ASSETS, ...parts)

const CREDIT = "© Warren Beach Rentals"

type Blocks = NonNullable<Page["blocks"]>

/** The Lexical nodes a Rich text Block stores, for headings and paragraphs. */
function richText(
  ...parts: { tag?: "h1" | "h2" | "h3"; text: string }[]
): Extract<Blocks[number], { blockType: "richText" }>["content"] {
  const node = (type: string, children: object[], extra: object = {}) => ({
    type,
    version: 1,
    direction: "ltr",
    format: "",
    indent: 0,
    children,
    ...extra,
  })
  const text = (value: string) => ({
    type: "text",
    version: 1,
    text: value,
    detail: 0,
    format: 0,
    mode: "normal",
    style: "",
  })
  return {
    root: node(
      "root",
      parts.map((part) =>
        part.tag
          ? node("heading", [text(part.text)], { tag: part.tag })
          : node("paragraph", [text(part.text)], { textFormat: 0 })
      )
    ),
  } as unknown as Extract<Blocks[number], { blockType: "richText" }>["content"]
}

export const seed: SeedModule = async (seed) => {
  // Fonts: the three families the real site uses, imported from Google Fonts
  // and served by the Site itself (Source Sans 3 is Source Sans Pro under its
  // new name; Lora and Work Sans are the Owners page's).
  const sourceSans = await seed.font({
    family: "Source Sans 3",
    kind: "sans",
    weights: [400, 500, 600, 700],
  })
  const lora = await seed.font({
    family: "Lora",
    kind: "serif",
    weights: [400],
  })
  const workSans = await seed.font({
    family: "Work Sans",
    kind: "sans",
    weights: [400, 500],
  })

  // Media: the logo and the photos of the real site.
  const logo = await seed.media({
    file: asset("logo", "WARRENgroupLogoFINAL.webp"),
    alt: "Warren Beach Rentals: a serif W with three wave lines, and Destin, 30A and PCB beneath the name",
    credit: CREDIT,
  })
  const icon = await seed.media({
    file: asset("logo", "WARRENgroupIconSmall.jpg"),
    alt: "Warren Beach Rentals icon: the W with its wave lines",
    credit: CREDIT,
  })
  const favicon = await seed.media({
    file: asset("logo", "favicon-192.jpg"),
    alt: "Warren Beach Rentals favicon",
    credit: CREDIT,
  })
  const photo = (file: string, alt: string) =>
    seed.media({ file: asset("photos", file), alt, credit: CREDIT })
  const hero = await photo(
    "hero-beach-panama-city.webp",
    "White sand and the Gulf of Mexico at Panama City Beach"
  )
  const snowbird = await photo(
    "amenity-snowbird-waterfront.webp",
    "A waterfront Snowbird rental beside the water"
  )
  const petFriendly = await photo(
    "amenity-pet-friendly.webp",
    "A dog on the beach, where pets are welcome"
  )
  const privatePool = await photo(
    "amenity-private-pool.webp",
    "A private pool at a beach house"
  )
  const heatedPool = await photo(
    "amenity-heated-pool.webp",
    "A heated pool at a vacation rental"
  )
  const hotTub = await photo(
    "amenity-hot-tub.webp",
    "A hot tub at a vacation rental"
  )
  const ownersHouse = await photo(
    "owners-hero-house.webp",
    "A modern white beach house at dusk"
  )
  // Two more photos from the Owners page, kept in Media for the Staff to use.
  await photo(
    "beach-houses-banner.webp",
    "A row of beach houses along the Emerald Coast"
  )
  await photo(
    "owners-cta-couple-beach.webp",
    "A couple walking on the beach at sunset"
  )

  // Theme: the Warren Beach preset, in the stored Fonts.
  const fonts = [sourceSans, lora, workSans].map(({ id, doc }) => ({
    key: `font:${id}`,
    family: doc.family,
    files: doc.files ?? [],
  }))
  await seed.theme(presetInputs(WARREN_BEACH, fonts))

  await seed.brand({
    name: "Warren Beach Rentals",
    tagline: "Destin • 30A • PCB",
    logo: logo.id,
    contact: {
      phone: "(850) 231-0835",
      address: "169 Griffin Blvd, Unit 120\nPanama City Beach, FL 32413",
    },
    social: [
      {
        platform: "facebook",
        url: "https://www.facebook.com/WarrenBeachRentals",
      },
      {
        platform: "instagram",
        url: "https://www.instagram.com/warrenbeachrentals/",
      },
    ],
  })

  await seed.seo({
    titlePattern: "%s · {name}",
    description:
      "Hand-picked Panama City Beach, 30A and Destin vacation rentals from Warren Beach Rentals, a family-owned company. Book direct for the best rates.",
    image: icon.id,
    favicon: favicon.id,
    // An internal demo: not for search engines.
    allowIndexing: false,
  })

  const newsletter = {
    blockType: "newsletter",
    heading: "Subscribe to our emails",
    text: "for the latest news, local events, and more!",
    buttonLabel: "Subscribe",
    background: "primary",
  } as const

  // Pages: the real sections, in the real order (screenshots/*.jpg).
  await seed.page({
    path: "/",
    title: "Home",
    blocks: [
      {
        blockType: "searchHero",
        heading: "Book Your Emerald Coast Vacation Rental",
        subheading: "White Sands & Sunshine Await",
        image: hero.id,
        searchLabel: "Search",
        locations: [
          { name: "Destin" },
          { name: "30A" },
          { name: "Panama City Beach" },
          { name: "Miramar Beach" },
          { name: "Navarre Beach" },
          { name: "Santa Rosa Beach" },
          { name: "Rosemary Beach" },
        ],
      },
      {
        blockType: "featuredRentals",
        heading: "Featured Emerald Coast Rentals",
        count: 8,
        variant: "carousel",
        background: "default",
      },
      {
        blockType: "amenities",
        heading: "Guest Favorite Rental Amenities",
        intro:
          "From the serene satisfaction of waking up to Gulf views to the joy of pet-friendly beach homes where every family member is welcome, we offer Florida Panhandle vacation rentals with an array of amenities to elevate your stay.",
        variant: "mosaic",
        items: [
          { label: "Snowbird Rentals", image: snowbird.id },
          { label: "Pet Friendly", image: petFriendly.id },
          { label: "Private Pool", image: privatePool.id },
          { label: "Heated Pool", image: heatedPool.id },
          { label: "Hot Tubs", image: hotTub.id },
        ],
        background: "default",
      },
      {
        blockType: "largeGroupRentals",
        heading: "Vacations are better together",
        minSleeps: 12,
        background: "muted",
      },
      newsletter,
    ],
    seo: {
      title: "Emerald Coast Vacation Rentals",
      description:
        "Book your Emerald Coast vacation rental in Destin, 30A or Panama City Beach. White sands and sunshine await.",
      image: hero.id,
    },
  })

  const rentals = await seed.page({
    path: "/rentals",
    title: "Rentals",
    blocks: [
      {
        blockType: "richText",
        content: richText(
          { tag: "h1", text: "Warren Beach Rentals" },
          {
            text: "Discover hand-picked Panama City Beach, 30A, and Destin vacation rentals with Warren Beach Rentals, a trusted, family-owned company specializing in luxury beachfront condos and private beach homes along Florida’s Gulf Coast. From Gulf front estates with private pools to family-friendly condos near Pier Park, Rosemary Beach, and Scenic 30A, every property is professionally maintained and selected for comfort, cleanliness, and an effortless guest experience. Use the filters below to browse by location, bedrooms, or amenities and book direct with us to enjoy the best rates, personal service, and a local team that has been creating unforgettable beach vacations for more than 28 years.",
          }
        ),
        background: "default",
      },
      {
        blockType: "rentalGrid",
        heading: "Search Vacation Rentals",
        pageSize: 12,
        background: "default",
      },
      newsletter,
    ],
    seo: {
      title: "Vacation Rentals in Panama City Beach, 30A and Destin",
      description:
        "Browse hand-picked beachfront condos and private beach homes along Florida’s Gulf Coast, and book direct with Warren Beach Rentals.",
    },
  })

  const owners = await seed.page({
    path: "/owners",
    title: "Owners",
    blocks: [
      {
        blockType: "hero",
        heading: "Join Our Exclusive Collection of Premier Vacation Homes",
        image: ownersHouse.id,
      },
      {
        blockType: "form",
        heading: "Get Your Free Rental Projection",
        intro:
          "Stop guessing. See what your property can earn. Along with your free rental analysis, our team will give you real earnings data and expert advice tailored to your rental’s potential.",
        formFields: ["name", "email", "phone", "message"],
        submitLabel: "Get My Rental Projection",
        successMessage:
          "Thank you. We have received your request and our team will be in touch with your rental projection.",
        background: "default",
      },
      {
        blockType: "ownerBand",
        heading: "Your Home Deserves the Best—Reach Out to Dena",
        pitch:
          "If you’re curious where your rental stands, reach out to Dena, our Business Development Executive. She'll be happy to put together a complimentary revenue projection and talk it through with you.",
        benefits: [
          { text: "A complimentary revenue projection" },
          {
            text: "Real earnings data and expert advice tailored to your rental’s potential",
          },
        ],
        cta: { label: "Let's Chat", href: "/contact" },
        background: "primary",
      },
      newsletter,
    ],
    seo: {
      title: "Property Management for Vacation Homes",
      description:
        "Join our exclusive collection of premier vacation homes. Get a free rental projection from Warren Beach Rentals.",
      image: ownersHouse.id,
    },
  })

  const contact = await seed.page({
    path: "/contact",
    title: "Contact",
    blocks: [
      {
        blockType: "richText",
        content: richText(
          { tag: "h1", text: "Contact Us" },
          {
            text: "Have a question? We’re here to help! Send us a message, and we’ll get back with you as soon as possible.",
          }
        ),
        background: "default",
      },
      {
        blockType: "form",
        heading: "Message Us",
        formFields: ["name", "email", "message"],
        submitLabel: "Send",
        successMessage:
          "Thank you. We have received your message and will get back with you as soon as possible.",
        background: "default",
      },
      {
        blockType: "location",
        heading: "Contact Information",
        address: "169 Griffin Blvd, Unit 120\nPanama City Beach, FL 32413",
        text: "850.231.0835\nMon-Sat Hours: 9AM - 5PM\nSun Hours: 10AM - 3PM",
        map: "card",
        background: "muted",
      },
      newsletter,
    ],
    seo: {
      title: "Contact Us",
      description:
        "Have a question? Send Warren Beach Rentals a message, or call (850) 231-0835.",
    },
  })

  // Layout: the default. Its Navigation links to the Pages by relationship,
  // so it follows them if a path changes.
  const toPage = (page: { id: number }) => ({
    type: "page" as const,
    page: page.id,
  })
  // The guide (a blog) is not one of the four seeded Pages: its links go to
  // the real site, where it lives.
  const realSite = (path: string) => ({
    type: "url" as const,
    url: `https://warrenbeachrentals.com${path}`,
  })
  const feature = (label: string) => ({
    label,
    column: "Search by Feature",
    link: toPage(rentals),
  })
  const type = (label: string) => ({
    label,
    column: "Search by Type",
    link: toPage(rentals),
  })
  const location = (label: string) => ({
    label,
    column: "Search by Location",
    link: toPage(rentals),
  })

  await seed.layout({
    name: "Default",
    isDefault: true,
    header: [
      { blockType: "logo", size: "large", showTagline: false },
      {
        blockType: "navigation",
        items: [
          {
            label: "Vacation Rentals",
            display: "mega",
            children: [
              feature("Pet Friendly"),
              feature("Private Pool"),
              feature("Beachfront"),
              feature("Heated Pool"),
              feature("Hot Tub"),
              type("House"),
              type("Condo"),
              type("Townhouse"),
              location("30A"),
              location("Destin"),
              location("Panama City Beach"),
              location("Miramar Beach"),
              location("Navarre Beach"),
              location("Santa Rosa Beach"),
              location("Rosemary Beach"),
              location("Seagrove Beach"),
              location("Seacrest Beach"),
              location("Inlet Beach"),
              location("Carillon Beach"),
              location("Sunnyside Beach"),
            ],
          },
          { label: "Specials", link: toPage(rentals) },
          { label: "Snowbird Rentals", link: toPage(rentals) },
          {
            label: "Emerald Coast Guide",
            children: [
              { label: "Blog", link: realSite("/blog/") },
              { label: "Things to Do", link: realSite("/things-to-do/") },
            ],
          },
          {
            label: "About Us",
            children: [
              { label: "Property Management", link: toPage(owners) },
              { label: "Contact Us", link: toPage(contact) },
            ],
          },
          { label: "Property Management", link: toPage(owners) },
        ],
      },
      // The phone number is the Brand's.
      { blockType: "headerActions", showPhone: true },
    ],
    footer: [
      {
        blockType: "footerColumns",
        columns: [
          {
            heading: "Vacation Rentals",
            content: "links",
            links: [
              { label: "Pet Friendly", link: toPage(rentals) },
              { label: "Beach Front", link: toPage(rentals) },
              { label: "Heated Pool", link: toPage(rentals) },
              { label: "Private Pool", link: toPage(rentals) },
              { label: "Hot Tub", link: toPage(rentals) },
              { label: "Search by Rental Name", link: toPage(rentals) },
            ],
          },
          {
            heading: "Warren Beach Rentals",
            content: "address",
          },
          {
            heading: "Hours",
            content: "hours",
            hours: "Mon-Sat: 9AM - 5PM\nSun Hours: 10AM - 3PM",
          },
          {
            heading: "About Us",
            content: "links",
            links: [
              { label: "Property Management", link: toPage(owners) },
              { label: "Contact Us", link: toPage(contact) },
            ],
          },
          { heading: "Follow us", content: "social" },
        ],
      },
      {
        blockType: "legalBar",
        text: "© Copyright {year} {name} All Rights Reserved.",
      },
    ],
  })
}
