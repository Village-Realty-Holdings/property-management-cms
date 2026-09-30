import { fileURLToPath } from "node:url"

import type { Page } from "../payload-types"
import { AVADA, presetInputs } from "../theme"
import type { SeedModule } from "./index"

/**
 * The seed of the `avada` Site, Avada Properties (spec Phase 6): the Brand,
 * SEO, Theme (the AVADA preset in Montserrat), Font, Media, the default
 * Layout and five Pages (Home, Search, Owners, About, Contact), written with
 * the helpers of `seed` (src/seed/upsert.ts).
 *
 * Fidelity: the logo, the AA primary `#ce4b25`, Montserrat, the real section
 * order and the real copy of avadaproperties.com, from the brand extraction
 * (research/brands/avada: copy/*.txt, manifest.md, screenshots/). The photos
 * are in apps/site/seed/avada/. The Shutterstock sunrise photo
 * (hero-sunrise-smokies.webp) is left out on purpose, and so are the Rental
 * photos, which belong to the Site's fixtures (src/site/fixtures/avada.ts).
 */

const file = (name: string) =>
  fileURLToPath(new URL(`../../seed/avada/${name}`, import.meta.url))

type PageBlock = NonNullable<Page["blocks"]>[number]

// ---------------------------------------------------------------------------
// Rich text

const text = (value: string) => ({
  type: "text",
  version: 1,
  text: value,
  detail: 0,
  format: 0,
  mode: "normal",
  style: "",
})

const element = (
  type: string,
  children: unknown[],
  extra: Record<string, unknown> = {}
) => ({
  type,
  version: 1,
  direction: "ltr",
  format: "",
  indent: 0,
  children,
  ...extra,
})

const heading = (tag: "h1" | "h2" | "h3", value: string) =>
  element("heading", [text(value)], { tag })
const paragraph = (value: string) => element("paragraph", [text(value)])
const bullets = (items: string[]) =>
  element(
    "list",
    items.map((item, index) =>
      element("listitem", [text(item)], { value: index + 1 })
    ),
    { listType: "bullet", start: 1, tag: "ul" }
  )

/** A rich text Block holding these Lexical nodes. */
function richText(
  nodes: unknown[],
  background?: "muted"
): Extract<PageBlock, { blockType: "richText" }> {
  return {
    blockType: "richText",
    content: {
      root: {
        type: "root",
        version: 1,
        direction: "ltr",
        format: "",
        indent: 0,
        children: nodes as never,
      },
    },
    ...(background ? { background } : {}),
  }
}

// ---------------------------------------------------------------------------
// The seed

export const seed: SeedModule = async (seed) => {
  // Font: Montserrat, everything on the real site. Weights 400 to 800 cover
  // body text (400), nav and eyebrows (600), headings (700) and the hero (800).
  await seed.font({
    family: "Montserrat",
    kind: "sans",
    weights: [400, 500, 600, 700, 800],
  })

  // Media: the logo and the marketing photos of the extraction.
  const logo = await seed.media({
    file: file("avada-logo.png"),
    alt: "Avada Properties: a hexagon badge with a sunset over mountain ridges",
    credit: "Avada Properties",
  })
  const photo = async (name: string, alt: string) =>
    (await seed.media({ file: file(name), alt, credit: "Avada Properties" })).id
  const ridges = await photo(
    "about-contact-hero-view.webp",
    "Layers of blue ridges rolling away into the haze of the Great Smoky Mountains"
  )
  const sunrise = await photo(
    "location-great-smokies.webp",
    "Sunrise glowing over a green valley in the Great Smoky Mountains"
  )
  const cabinAtDusk = await photo(
    "cabin-large-group.webp",
    "A large timber cabin on a hillside lit up under a pink dusk sky"
  )
  const livingRoom = await photo(
    "cabin-revetta-retreat.webp",
    "A cabin living room with a stone fireplace and tall windows onto the mountains"
  )
  await photo(
    "cabin-birchwood-lodge.webp",
    "A cabin deck with wicker chairs and a view of forested mountains"
  )
  await photo(
    "cabin-game-room.webp",
    "A cabin game room with a pool table and arcade machines under a pine ceiling"
  )
  await photo(
    "cabin-indoor-pool.webp",
    "A cabin's indoor pool opening onto a mountain view"
  )
  await photo(
    "cabin-misty-chalet.webp",
    "A hot tub on a cabin deck above the treetops"
  )
  await photo(
    "cabin-uncle-bucks.webp",
    "A log cabin behind a garden mini-golf course"
  )
  await photo(
    "cabin-firepit.webp",
    "A stone fire pit ringed with rocking chairs above a forested valley"
  )

  // Brand.
  await seed.brand({
    name: "Avada Properties",
    tagline: "Smoky Mountain Vacation Rentals",
    logo: logo.id,
    contact: {
      phone: "865-390-2860",
      email: "booking@avadaproperties.com",
      address: "1148 Wagner Dr, Suite 102, Sevierville, TN 37862",
    },
  })

  // SEO. The Sites are internal demos: they ask search engines to stay away.
  await seed.seo({
    titlePattern: "%s · {name}",
    description:
      "Avada Properties helps guests find the right Smoky Mountain stay and helps owners present their rentals with clarity, local context, and a smoother booking experience.",
    image: ridges,
    allowIndexing: false,
  })

  // Theme: the AVADA preset, with Montserrat now that it is stored.
  const montserrat = await seed.fontKey("Montserrat")
  await seed.theme(
    presetInputs(AVADA, [{ key: montserrat, family: "Montserrat" }])
  )

  // Pages. Their paths are short and stable: the Navigation links to the
  // Pages themselves, so the real site's long slugs aren't needed.
  const newsletter: PageBlock = {
    blockType: "newsletter",
    heading: "Subscribe to our emails",
    text: "for the latest news, local events, and more!",
    emailPlaceholder: "Email address",
    buttonLabel: "Subscribe",
    background: "dark",
  }

  const home = await seed.page({
    path: "/",
    title: "Home",
    seo: {
      title: "Smoky Mountain Vacation Rentals",
      description:
        "Find your Smoky Mountain stay: cabins and vacation homes in Pigeon Forge, Gatlinburg and Sevierville, Tennessee.",
      image: ridges,
    },
    blocks: [
      {
        blockType: "searchHero",
        eyebrow: "Pigeon Forge & Gatlinburg, Tennessee",
        heading: "Find your Smoky Mountain stay",
        accentWord: "Smoky Mountain",
        subheading:
          "Avada Properties helps guests find the right Smoky Mountain stay and helps owners present their rentals with clarity, local context, and a smoother booking experience.",
        image: sunrise,
        searchLabel: "Search",
        locations: [
          { name: "Pigeon Forge" },
          { name: "Gatlinburg" },
          { name: "Sevierville" },
          { name: "Wears Valley" },
        ],
      },
      {
        blockType: "trustStrip",
        variant: "items",
        items: [
          { icon: "calendar", text: "Easy Booking: Search, pick, confirm" },
          {
            icon: "users",
            text: "Family-Friendly Cabins: Comfortable for every group",
          },
          {
            icon: "map-pin",
            text: "Close to Attractions: Dollywood, parks, & more",
          },
          {
            icon: "headphones",
            text: "Local Guest Support: Questions answered quickly",
          },
        ],
      },
      {
        blockType: "featuredRentals",
        heading: "Featured Smoky Mountain Rentals",
        count: 12,
        variant: "carousel",
      },
      {
        blockType: "steps",
        heading: "Book in Three Steps",
        intro:
          "From your first search to confirmed dates — the process is built to be clear and low-friction.",
        steps: [
          {
            title: "Search Available Homes",
            text: "Filter by area, dates, and guest count to find homes that actually fit your trip.",
          },
          {
            title: "Review & Compare",
            text: "See full property details — photos, amenities, location context, and pricing before you decide.",
          },
          {
            title: "Book",
            text: "Complete your booking with confidence—we’ll make sure everything is ready, so you can simply arrive and relax.",
          },
        ],
        background: "muted",
      },
      {
        blockType: "imageText",
        heading: "Close to What Matters",
        text: "The right home base changes everything. Avada properties sit close to the scenic drives, Gatlinburg's main strip, Pigeon Forge's Parkway, Dollywood, national park trailheads, and the kind of views that make the Smokies worth the trip.",
        image: ridges,
        caption: "Great Smoky Mountains · Pigeon Forge & Gatlinburg, TN",
        imageSide: "left",
        points: [
          {
            icon: "sunrise",
            text: "Scenic Mountain Mornings: Cool air, ridge views, and a quiet start before the day fills up.",
          },
          {
            icon: "map-pin",
            text: "Easy Access to Attractions: Dollywood, Gatlinburg's Strip, outlet shopping, and national park trails all nearby.",
          },
          {
            icon: "house",
            text: "Comfortable Evenings at Home Base: Space to unwind, have dinner in, and let the group decompress after a full day.",
          },
        ],
      },
      {
        blockType: "features",
        heading: "Built Around the Guest Experience",
        intro:
          "Our focus is on making it easy to find, evaluate, and book the right Smoky Mountain rental — without the friction.",
        features: [
          {
            icon: "circle-check",
            title: "Simple Booking",
            text: "Clear listings, transparent pricing, and an easy booking or inquiry path. No confusing steps.",
          },
          {
            icon: "house",
            title: "Well-Presented Homes",
            text: "Properties are listed with enough detail to make an informed decision before you arrive.",
          },
          {
            icon: "message-circle",
            title: "Responsive Support",
            text: "Questions before your trip or during your stay get a real, timely response — not a bot.",
          },
          {
            icon: "map-pin",
            title: "Location-First Listings",
            text: "Every property is positioned with its location context so guests know what's nearby before booking.",
          },
        ],
      },
      {
        blockType: "ownerBand",
        heading: "Own a Smoky Mountain Rental?",
        pitch:
          "Avada Properties works with owners to present their homes clearly, attract better-fit guests, and support a smoother booking experience — so your property works as hard as it should.",
        benefits: [
          {
            text: "Better Fit Guests: Through clear, honest property positioning",
          },
          {
            text: "Free Projection: Understand your property's earning potential — no commitment",
          },
          {
            text: "Smoky Mountain Focus: Local market experience, not a generic national management company",
          },
        ],
        cta: {
          label: "Request A Free Rental Projection",
          href: "/owners",
        },
        background: "dark",
      },
      {
        blockType: "testimonials",
        heading: "What Guests Are Saying",
        variant: "grid",
        testimonials: [
          {
            quote:
              "The cabin was exactly as described — clean, well-equipped, and the location couldn't have been more convenient. We were at Dollywood in under 15 minutes and back in the mountains for dinner.",
            name: "Sarah M.",
            role: "Family trip — Pigeon Forge area",
            rating: 5,
          },
          {
            quote:
              "Any question we had before arrival was answered quickly. The home had everything we needed and the views from the porch were the best part of the trip.",
            name: "James & Linda T.",
            role: "Couples stay — Gatlinburg area",
            rating: 5,
          },
          {
            quote:
              "The easiest Smoky Mountain rental booking we've done. Property was clean and well-stocked. The kids woke up every morning excited to get back outside.",
            name: "The Ortega Family",
            role: "Group trip — Wears Valley area",
            rating: 5,
          },
        ],
      },
      {
        blockType: "callToAction",
        heading: "Ready to Find Your Smoky Mountain Stay?",
        body: "Browse available homes, check dates, and get your Smokies trip on the calendar.",
        button: { label: "Search Rentals", href: "/search" },
        style: "dark",
        background: "dark",
      },
      newsletter,
    ],
  })

  const search = await seed.page({
    path: "/search",
    title: "Search",
    seo: {
      title: "Smoky Mountain Rentals",
      description:
        "Discover the best cabins, vacation homes, and condo rentals in the Tennessee Smoky Mountains.",
    },
    blocks: [
      richText([
        heading("h1", "Smoky Mountain Rentals"),
        heading(
          "h2",
          "Discover the Best Cabins, Vacation Homes, and Condo Rentals In the Tennessee Smoky Mountains"
        ),
      ]),
      {
        blockType: "rentalGrid",
        heading: "Browse Vacation Rentals",
        pageSize: 24,
      },
      newsletter,
    ],
  })

  const owners = await seed.page({
    path: "/owners",
    title: "Owners",
    seo: {
      title: "Property Management for Smoky Mountain Rentals",
      description:
        "Avada Properties helps owners present their homes clearly, attract better-fit guests, and create a smoother booking experience in Pigeon Forge, Gatlinburg, and the Smoky Mountain area.",
      image: ridges,
    },
    blocks: [
      {
        blockType: "hero",
        eyebrow: "For Property Owners",
        heading: "Property Management for Smoky Mountain Rentals",
        subheading:
          "Avada Properties helps owners present their homes clearly, attract better-fit guests, and create a smoother booking experience in Pigeon Forge, Gatlinburg, and the Smoky Mountain area.",
        image: ridges,
        cta: {
          label: "Request A Free Rental Projection",
          href: "/contact",
        },
        trustStrip: [
          {
            icon: "map-pin",
            text: "Local Smoky Mountain Focus: Pigeon Forge, Gatlinburg & more",
          },
          {
            icon: "users",
            text: "Better-Fit Guests: Clearer listings attract the right inquiries",
          },
          {
            icon: "camera",
            text: "Clear Property Presentation: Photos, details & local context",
          },
          {
            icon: "headphones",
            text: "Guest Support: Local team helps guests decide",
          },
        ],
      },
      {
        blockType: "features",
        heading: "We Take Care of Your Property & Guests",
        intro:
          "We handle everything relating to your short–term rental, from promoting it on the right platforms and dealing with guests to keeping it in great shape and optimizing your returns. This means no hassle and more free time for you.",
        features: [
          {
            icon: "wrench",
            title: "Worry-free Maintenance & Protection",
            text: "Trust us to take care of your property and keep it safe. Our crew of specialists is available for same – day repairs, and we keep a constant eye on your cabin so your mind is free from worries.",
          },
          {
            icon: "camera",
            title: "Get Top-notch Marketing",
            text: "Get access to a team of former Airbnb talent, professional photographers, and skilled copywriters that will make your property look its best and boost your visibility on the right platforms.",
          },
          {
            icon: "smile",
            title: "No Stress with Guests",
            text: "Regain control of your time and let us deal with your guests and answer their questions and requests. Day and night, from pre-booking to check out and follow-up, we love hosting and caring for our guests.",
          },
          {
            icon: "wallet",
            title: "Increase Your Revenue",
            text: "Leverage our tech-geek rate optimization strategies to maximize your nightly fees and your occupancy. Expect a minimum of $2500 more in yearly revenues.",
          },
        ],
      },
      {
        blockType: "imageText",
        heading: "Built Around Better Guest Decisions",
        text: "Avada Properties focuses on presenting each home with clear details, local context, and a booking experience that helps guests feel confident before they inquire.",
        image: cabinAtDusk,
        imageSide: "right",
        points: [
          {
            icon: "map-pin",
            text: "Local area positioning that sets your property apart",
          },
          {
            icon: "circle-check",
            text: "Clear property details guests need before they decide",
          },
          {
            icon: "circle-check",
            text: "Guest-friendly booking flow reduces hesitation",
          },
          {
            icon: "shield-check",
            text: "Trust-building content — photos, policies, local cues",
          },
          {
            icon: "handshake",
            text: "Supportive owner communication throughout",
          },
        ],
      },
      {
        blockType: "features",
        heading: "What Avada Helps With",
        intro:
          "A focused set of services designed to help Smoky Mountain rental owners present their properties more clearly and attract better-fit guests.",
        features: [
          {
            icon: "house",
            title: "Listing Presentation",
            text: "Well-structured listing pages with clear photos, descriptions, amenity details, and location context.",
          },
          {
            icon: "message-circle",
            title: "Guest Communication",
            text: "Responsive guest support that answers questions, builds trust, and helps guests move toward inquiry.",
          },
          {
            icon: "calendar",
            title: "Booking Flow Support",
            text: "A clear, low-friction booking and inquiry path that helps guests go from browsing to requesting a stay.",
          },
          {
            icon: "star",
            title: "Property Positioning",
            text: "Each property is presented with its local advantages — proximity, views, access, and appeal — clearly communicated.",
          },
          {
            icon: "compass",
            title: "Local Market Context",
            text: "Smoky Mountain area knowledge helps position your property alongside what guests are actually searching for.",
          },
          {
            icon: "mail",
            title: "Owner Reporting & Communication",
            text: "Clear updates on property performance, guest feedback, and suggested improvements.",
          },
        ],
        background: "muted",
      },
      {
        blockType: "features",
        heading: "Designed to Help Owners Win Better Bookings",
        intro:
          "A clearer property presentation means guests feel more confident before they inquire — leading to better-fit stays and fewer last-minute surprises.",
        features: [
          {
            icon: "percent",
            title: "Low & All-inclusive Fee",
            text: "Our 20% management fee is among the lowest in the Pigeon Forge and Gatlinburg area. It covers marketing, guest relations, and property management. It also covers replacing minor items, such as air filters and light bulbs.",
          },
          {
            icon: "eye",
            title: "Transparency",
            text: "We don’t add extra fees to the work of vendors and handymen, and our in-house team works at a low hourly rate. We agree on everything upfront with you in absolute transparency. No hidden fees or unpleasant surprises. Ever.",
          },
          {
            icon: "mountain",
            title: "Market Know-how",
            text: "As leading players in the Smoky Mountains, we know what your guests expect and appreciate. We also know what they don’t expect, so we can save you money and time.",
          },
        ],
        background: "dark",
      },
      {
        blockType: "callToAction",
        heading: "Want to Understand Your Rental Potential?",
        body: "Share a few details about your Smoky Mountain property and Avada can help review fit, positioning, and potential next steps — with no pressure or commitment. We review: property fit for Avada's management approach; location, positioning, and appeal assessment; guest appeal and booking flow potential; recommended next steps for your property.",
        button: { label: "Get A Free Rental Projection", href: "/contact" },
        style: "primary",
      },
      {
        blockType: "steps",
        heading: "A Clear First Step for Owners",
        intro:
          "The process starts with a simple conversation — no pressure, just a clearer look at your property’s opportunity.",
        steps: [
          {
            title: "Share Your Property Details",
            text: "Tell us about the home, location, size, and current rental goals so we understand what you're working with.",
          },
          {
            title: "Avada Reviews the Opportunity",
            text: "We look at fit, positioning, guest appeal, and next-step potential for your specific property.",
          },
          {
            title: "Get a Clear Recommendation",
            text: "You'll receive guidance on whether Avada may be a good management fit and what the next step looks like.",
          },
        ],
      },
      {
        blockType: "callToAction",
        heading: "Local Knowledge Matters in the Smokies",
        body: "Guests aren’t just choosing a cabin — they’re choosing proximity, convenience, views, access, and confidence. Avada’s website and property presentation help communicate those local advantages clearly.",
        button: {
          label: "Get A Projection For Your Area",
          href: "/contact",
        },
        style: "secondary",
        background: "muted",
      },
      {
        blockType: "faq",
        heading: "Common Questions From Property Owners",
        questions: [
          {
            question: "What kinds of properties are a good fit for Avada?",
            answer:
              "Smoky Mountain vacation rentals in and around Pigeon Forge, Gatlinburg, Sevierville, and Wears Valley. Cabins, homes, and lodges that could benefit from clearer presentation and a stronger local identity.",
          },
          {
            question:
              "Can Avada help improve how my property is presented online?",
            answer:
              "Yes. Avada's focus is on clear property presentation — photos, descriptions, location context, amenity details, and a guest-friendly booking flow that helps your home show its value.",
          },
          {
            question: "Do I need professional photography?",
            answer:
              "Professional photography typically helps. Strong photos are one of the most important factors in how guests evaluate a property. Avada can advise on photography needs as part of the property review.",
          },
          {
            question: "How does the free rental projection work?",
            answer:
              "You share basic details about your property — location, size, amenities, and current goals. Avada reviews the information and provides guidance on fit, positioning, and potential next steps. No payment or commitment required.",
          },
          {
            question: "What happens after I submit my property details?",
            answer:
              "Avada will review the submission and follow up with a response. If there is a potential fit, we'll outline recommended next steps. If Avada is not the right match, we'll be upfront about that too.",
          },
        ],
      },
      {
        blockType: "testimonials",
        heading: "Hear From Our Owners",
        variant: "carousel",
        testimonials: [
          {
            quote:
              "The best part? Knowing that someone is really taking care of my guests. I love reading their reviews and learning how they find everything easily, and their whole experience with my cabin was stress free... Not only does Avada's team answer all their requests quickly, but they also handle all of my inquiries quickly too. In the end, all guests leave with unforgettable memories. I bought my cabin for my use, but it makes me happy to share this wonderfully unique place with others. Thankfully, Avada helps me to do so without worries. They continually look for ways to improve and grow, never ceasing to amaze us in how driven they are. The team has quickly gone from work partners to being considered like family. That's priceless.",
            name: "Jordan",
            role: "Owner of Treehouse",
            rating: 5,
          },
          {
            quote:
              "Avada Properties has proven to be one of the better revenue producers for owners in our market regarding overnight cabin rentals. As a realtor here who specializes in investment property that will have the ROI potential for clients, its crucial for me to have several exceptional references for owners who prefer to find a management company. When a few clients came to me about this company with their own experiences, and how they were receiving vastly larger net profits than with other management companies in our area previously, I had to get an understanding of what they were doing differently. It became quickly apparent to me this company was hyper focused on how to evolve with the market by keeping up with technology while utilizing the correct platforms to maximize profits. In addition, it is pleasing to see how they handle owners in aiding them to create as much uniqueness to their property, as well as giving life back into the cabin with any needed repairs prior to “going live” in order to reduce overall maintenance costs that can cripple an owner’s revenue by having to provide credits for complaints from guests for unsatisfactory stays; they understand the value of keeping up with your property so everyone wins.",
            name: "Amanda Gutmaker",
            role: "Local agent",
            rating: 5,
          },
          {
            quote:
              "Avada is the best vacation rental management firm in Sevier County Tennessee. My 3 cabins in Pigeon Forge were already performing well when I decided to test them out in early 2020 (just before COVID hit). Even with a global pandemic, Avada found a way to produce much better results for my cabins in 2020 than 2019. They are absolute experts at optimizing listings on AirBNB and VRBO. By 2021, they had generated more than double the gross revenue of what I had previously done without them in 2019. And now 2022 has been epic too. Beyond just their ability to maximize the revenue potential of my units, they also do a marvelous job of keeping the cabins in tip top shape. We visit our cabins once a year in the summer and I’ve been so pleasantly surprised by how well they have maintained them despite the intense pressure the guests put on our cabins. Avada handles guest issues lightning fast and most importantly for me, I don’t have to think about handling the problems that arise. The money rolls in without any headaches. My biggest regret is not having more cabins because with Avada managing, it is truly mailbox money",
            name: "Phil",
            role: "Owner of 3 cabins",
            rating: 5,
          },
          {
            quote:
              "Avada has empowered me to not worry a single bit about my Pigeon Forge area investments. It started with just one cabin and they DOUBLED the income from the previous manager. I've since gone on to buy 4 more over the past two years... And I keep shopping for more! I definitely couldn't do it without them!",
            name: "Gilbert",
            role: "Owner of Smoky Mountain Mansion",
            rating: 5,
          },
          {
            quote:
              "Managing a property is tough when you live hundreds of miles away. It helps to have a trustworthy partner - and someone with boots on the ground - to take care of your investment. Avada has a team that runs the business and provides me with the photos and receipts necessary to put my mind at ease. I can finally relax and let my investment flourish.",
            name: "Josh",
            role: "Owner of Cub's Cozy Den",
            rating: 5,
          },
          {
            quote:
              "Switching over to Avada was life changing. Justin, Shane and the entire crew are simply fantastic. With them your investment actually generates a return. My yearly revenues increased by over 50% from my previous manager. What a breath of fresh air it was! I can't believe I wasted almost ten years before making the switch!",
            name: "Randy",
            role: "Owner of Grand Pinnacle",
            rating: 5,
          },
          {
            quote:
              "With my previous managers, I had to wait days or sometimes longer to receive an email or a callback. Now I use Avada's owner's portal. It's so easy; they always get back to me before I even realize it. And if we need to jump on a call, I know the team will be happy and available to help instantly. I can't possibly describe how much stress that relieves knowing that they're on the ball and so quick to get back to us.",
            name: "Jeramiah",
            role: "Owner of Stay a Little Longer",
            rating: 5,
          },
        ],
      },
      {
        blockType: "callToAction",
        heading: "Ready to See If Your Property Is a Fit?",
        body: "Start with a free rental projection and a clearer look at how your Smoky Mountain rental could be positioned.",
        button: {
          label: "Request A Free Rental Projection",
          href: "/contact",
        },
        style: "dark",
        background: "dark",
      },
      newsletter,
    ],
  })

  const about = await seed.page({
    path: "/about",
    title: "About",
    seo: {
      title: "About Avada Properties",
      description:
        "Avada Properties helps guests find the right Smoky Mountain stay and helps owners present their rentals with clarity, local context, and a smoother booking experience.",
      image: ridges,
    },
    blocks: [
      {
        blockType: "hero",
        eyebrow: "About Avada Properties",
        heading: "Helping Guests and Owners Feel at Home in the Smokies",
        subheading:
          "Avada Properties helps guests find the right Smoky Mountain stay and helps owners present their rentals with clarity, local context, and a smoother booking experience.",
        image: ridges,
        cta: { label: "Browse Vacation Rentals", href: "/search" },
        trustStrip: [
          {
            icon: "map-pin",
            text: "Local Smoky Mountain Focus: Pigeon Forge, Gatlinburg & more",
          },
          {
            icon: "camera",
            text: "Clear Property Details: Photos, amenities & location",
          },
          {
            icon: "calendar",
            text: "Guest-Friendly Booking: Simple, low-friction inquiry flow",
          },
          {
            icon: "handshake",
            text: "Owner Support: Clear property presentation",
          },
        ],
      },
      {
        blockType: "imageText",
        heading: "Built for Clearer Smoky Mountain Stays",
        text: "Choosing a vacation rental should feel exciting, not confusing. Avada Properties was built around a simple idea: when guests understand the home, the location, and the booking path clearly, they can make better decisions — and owners can attract better-fit stays.\n\nWe're focused on the Smoky Mountain area because local knowledge matters. The right cabin in Gatlinburg is different from the right cabin in Wears Valley. A family of six needs different information than a couple looking for a quiet weekend escape.\n\nAvada presents each property with the details, context, and clarity that helps the right guests find the right home — and helps owners understand how their rental fits the market.",
        image: livingRoom,
        imageSide: "right",
      },
      {
        blockType: "features",
        heading: "Good Booking Experiences Start With Clarity",
        intro:
          "The decisions guests and owners make get better when the information they need is easier to find and understand.",
        features: [
          {
            icon: "map-pin",
            title: "Local Context Matters",
            text: "Guests need to understand proximity, access, views, and area fit — not just how many bedrooms a home has.",
          },
          {
            icon: "badge-check",
            title: "Details Build Trust",
            text: "Clear amenities, photos, policies, and stay expectations reduce uncertainty before a guest decides to inquire.",
          },
          {
            icon: "users",
            title: "Better Guests Start Earlier",
            text: "The right information helps guests self-select before they inquire — leading to better-fit stays for everyone.",
          },
          {
            icon: "house",
            title: "Owners Deserve Clear Presentation",
            text: "A strong property page should show what makes each rental worth choosing — not just list square footage.",
          },
        ],
        background: "muted",
      },
      richText([heading("h2", "A Better Experience on Both Sides")]),
      {
        blockType: "imageText",
        heading: "Find the Right Stay Faster",
        text: "For guests: Avada helps guests compare homes, understand location, review amenities, and move toward inquiry with fewer confusing steps.",
        imageSide: "left",
        points: [
          { icon: "compass", text: "Browse cabins by location and fit" },
          { icon: "circle-check", text: "Compare key property details" },
          { icon: "map-pin", text: "Understand local area cues" },
          { icon: "message-circle", text: "Ask questions before booking" },
        ],
      },
      {
        blockType: "imageText",
        heading: "Present Your Rental More Clearly",
        text: "For owners: Avada helps owners position their properties with stronger guest-facing details, local context, and a booking flow built around confidence.",
        imageSide: "right",
        points: [
          { icon: "camera", text: "Clear property presentation" },
          { icon: "users", text: "Better-fit guest inquiries" },
          { icon: "mountain", text: "Local Smoky Mountain positioning" },
          { icon: "percent", text: "Free rental projection available" },
        ],
      },
      richText(
        [
          heading("h2", "Rooted in the Places Guests Actually Care About"),
          paragraph(
            "Smoky Mountain travelers often choose based on more than the home itself. They care about drive times, views, attractions, dinner plans, park access, family activities, and how easy the trip will feel."
          ),
          bullets([
            "Pigeon Forge",
            "Gatlinburg",
            "Sevierville",
            "Wears Valley",
            "Dollywood Access",
            "National Park Access",
            "Mountain Views",
            "Family Stays",
            "Weekend Getaways",
          ]),
        ],
        "muted"
      ),
      {
        blockType: "steps",
        heading: "How Avada Makes the Experience Easier",
        intro:
          "Three things Avada focuses on to make the rental experience better for everyone involved.",
        steps: [
          {
            title: "Present the Home Clearly",
            text: "Photos, amenities, location cues, and stay details are organized so visitors can understand the property faster.",
          },
          {
            title: "Reduce Booking Friction",
            text: "A simple flow helps guests move from browsing to inquiry without unnecessary confusion or extra steps.",
          },
          {
            title: "Support Better Decisions",
            text: "Clearer information helps guests and owners move forward with more confidence — and fewer surprises.",
          },
        ],
      },
      {
        blockType: "features",
        heading: "A Better Experience for Both Sides of the Stay",
        intro:
          "Whether you're choosing a cabin for a family trip or deciding how to position your rental, Avada works toward the same goal: less confusion, clearer information, and better-fit outcomes.",
        features: [
          {
            icon: "thumbs-up",
            title: "Guest Confidence",
            text: "Guests who find the right home through clearer information are more confident before they inquire — and more satisfied with their stay.",
          },
          {
            icon: "eye",
            title: "Owner Clarity",
            text: "Owners whose properties are clearly presented attract better-fit inquiries and spend less time managing confusion before a booking.",
          },
          {
            icon: "handshake",
            title: "Local Trust",
            text: "A locally focused site that communicates Smoky Mountain identity builds more trust than a generic national rental platform.",
          },
        ],
        background: "muted",
      },
      {
        blockType: "features",
        heading: "A Local-Minded Team Focused on Better Stays",
        features: [
          {
            icon: "headphones",
            title: "Guest Support",
            text: "Guest experience: Helps guests find the right rental, answers questions, and supports the inquiry and booking process.",
          },
          {
            icon: "camera",
            title: "Property Presentation",
            text: "Listing quality: Works to ensure each rental listing is clearly presented with strong photos, details, and local context.",
          },
          {
            icon: "message-circle",
            title: "Owner Communication",
            text: "Owner relations: Supports property owners with clear updates, projection reviews, and positioning guidance.",
          },
        ],
      },
      {
        blockType: "callToAction",
        heading: "Ready to Find Your Smoky Mountain Stay?",
        body: "Browse available rentals or learn how Avada helps owners present their properties clearly.",
        button: { label: "Browse Vacation Rentals", href: "/search" },
        style: "dark",
        background: "dark",
      },
      newsletter,
    ],
  })

  const contact = await seed.page({
    path: "/contact",
    title: "Contact",
    seo: {
      title: "Contact Avada Properties",
      description:
        "Questions about a stay or your Smoky Mountain rental? Whether you're planning a trip, checking property details, or exploring property management, Avada can help.",
      image: ridges,
    },
    blocks: [
      {
        blockType: "hero",
        eyebrow: "Contact Avada Properties",
        heading: "Questions About a Stay or Your Smoky Mountain Rental?",
        subheading:
          "Whether you’re planning a trip, checking property details, or exploring property management, Avada can help point you in the right direction.",
        image: ridges,
        cta: { label: "Send A Message", href: "#send-a-message" },
        trustStrip: [
          {
            icon: "headphones",
            text: "Guest Support: Booking & stay questions",
          },
          {
            icon: "key",
            text: "Owner Questions: Management & projections",
          },
          {
            icon: "map-pin",
            text: "Local Smoky Mountain Focus: Pigeon Forge & Gatlinburg",
          },
          { icon: "check", text: "Clear Next Steps: Routed to right support" },
        ],
      },
      {
        blockType: "features",
        heading: "How Can We Help?",
        features: [
          {
            icon: "headphones",
            title: "Guest Support",
            text: "Questions about dates, availability, property details, amenities, or an existing inquiry — we can help guests get the right answer.",
          },
          {
            icon: "key",
            title: "Property Owners",
            text: "Interested in property management or learning how your Smoky Mountain rental could be positioned? We can review the opportunity.",
          },
          {
            icon: "message-circle",
            title: "General Questions",
            text: "Need help finding the right page, contact path, or next step? Send a general message and we'll route it appropriately.",
          },
        ],
        background: "muted",
      },
      {
        blockType: "form",
        heading: "Send a Message",
        intro:
          "Share a few details and Avada will route your message to the right support path.",
        formFields: ["name", "email", "phone", "message"],
        submitLabel: "Send Message",
        successMessage:
          "Thank you. Avada will review your message and follow up with next steps.",
      },
      {
        blockType: "features",
        heading: "Helpful Shortcuts",
        features: [
          {
            icon: "house",
            title: "Browse Vacation Rentals",
            text: "Compare available cabins and stay options",
          },
          {
            icon: "building-2",
            title: "View Property Management",
            text: "Learn how Avada supports Smoky Mountain owners",
          },
          {
            icon: "percent",
            title: "Request Free Rental Projection",
            text: "Start a no-pressure owner review",
          },
          {
            icon: "message-circle",
            title: "Read FAQ",
            text: "Find quick answers before sending a message",
          },
        ],
      },
      richText(
        [
          heading("h2", "Smoky Mountain Questions Are Usually Local Questions"),
          paragraph(
            "Guests often ask about drive times, nearby attractions, property fit, and whether a cabin works for their group. Owners often ask how their property should be positioned. Avada’s contact flow routes each question clearly."
          ),
          bullets([
            "Pigeon Forge",
            "Gatlinburg",
            "Sevierville",
            "Wears Valley",
            "Dollywood Access",
            "National Park Access",
            "Family Stays",
            "Owner Inquiries",
          ]),
        ],
        "muted"
      ),
      {
        blockType: "location",
        heading: "Serving the Smoky Mountain Area",
        address: "1148 Wagner Dr, Suite 102, Sevierville, TN 37862",
        text: "Pigeon Forge, TN — Serving the Smokies. Email booking@avadaproperties.com or call 865-390-2860. Expect a response within 24 hours.",
        map: "card",
      },
      richText([
        heading("h3", "Not sure who to contact?"),
        paragraph(
          "Send a general message and Avada can route it to the right guest support or owner support path — no need to figure out the perfect category first."
        ),
      ]),
      {
        blockType: "callToAction",
        heading: "Ready to Plan Your Smoky Mountain Next Step?",
        body: "Browse rentals, ask a question, or learn how Avada helps owners present their properties clearly.",
        button: { label: "Browse Vacation Rentals", href: "/search" },
        style: "dark",
        background: "dark",
      },
      newsletter,
    ],
  })

  // Layout: the real site has one Header and Footer on every Page, so one
  // default Layout covers it. The Navigation links to the Pages themselves.
  const page = (id: number) => ({ type: "page" as const, page: id })
  await seed.layout({
    name: "Default",
    isDefault: true,
    header: [
      { blockType: "logo", size: "medium", showTagline: true },
      {
        blockType: "navigation",
        items: [
          { label: "Vacation Rentals", link: page(search.id) },
          { label: "Property Management", link: page(owners.id) },
          { label: "About", link: page(about.id) },
        ],
      },
      {
        blockType: "headerActions",
        showPhone: true,
        button: { label: "Contact Us", href: "/contact" },
      },
    ],
    footer: [
      {
        blockType: "footerColumns",
        columns: [
          { heading: "Avada Properties", content: "address" },
          {
            heading: "Explore",
            content: "links",
            links: [
              { label: "Home", link: page(home.id) },
              { label: "Vacation Rentals", link: page(search.id) },
              { label: "Pigeon Forge", link: page(search.id) },
              { label: "Gatlinburg", link: page(search.id) },
              { label: "Sevierville", link: page(search.id) },
              { label: "All Properties", link: page(search.id) },
            ],
          },
          {
            heading: "Guest Support",
            content: "links",
            links: [{ label: "FAQ", link: page(owners.id) }],
          },
          {
            heading: "Quicklinks",
            content: "links",
            links: [{ label: "Contact Us", link: page(contact.id) }],
          },
          {
            heading: "Owner Resources",
            content: "links",
            links: [
              { label: "Property Management", link: page(owners.id) },
              { label: "Free Rental Projection", link: page(owners.id) },
              { label: "About Avada", link: page(about.id) },
            ],
          },
        ],
      },
      {
        blockType: "legalBar",
        text: "© {year} Avada Properties LLC. All rights reserved.",
      },
    ],
  })
}
