import { bullets, heading, richText, type RichText } from "../lexical"

/**
 * The demo Sites' content, as data. `seed()` (./index.ts) writes it; nothing
 * here touches Payload.
 */

export type LocationLevel = "destination" | "area" | "complex"

/** An Amenity, looked up by Feed ID first, then by name. */
export type AmenityRef = { feedIds: string[]; names: string[] }

export type ListSpec = {
  slug: string
  title: string
  intro: string
  amenity?: AmenityRef
  minSleeps?: number
  petsAllowed?: boolean
  sort?: "featured" | "rating" | "sleeps" | "bedrooms" | "name"
}

export type GuideSpec = {
  slug: string
  title: string
  excerpt: string
  body: RichText
  /** Linked Locations: every Active Location at these Levels. */
  locationLevels: LocationLevel[]
  /** How many of the Site's Properties to link. */
  propertyCount: number
}

export type FaqItem = { question: string; answer: string }

export type SiteSpec = {
  slug: string
  name: string
  domain: string
  deploymentUrl: string
  feedAccountRef: string
  /** Set only for fields that exist in the loaded config (see ./sites.ts). */
  branding: Record<string, unknown>
  /** Old URLs to keep working (site.legacyUrls). */
  legacyUrls: {
    propertyPattern:
      | "none"
      | "cabin-rentals"
      | "property-details"
      | "rentals"
      | "root"
    redirects: { from: string; to: string }[]
  }
  /** Amenity Feed IDs offered as search filters, in order. */
  amenityFilters: string[]
  houseRules: string
  cancellationPolicy: string
  /** Word for the Site's Properties in copy, e.g. "cabins". */
  noun: string
  place: string
  hero: { heading: string; subheading: string }
  welcome: RichText
  faq: FaqItem[]
  about: RichText
  owners: RichText
  contact: RichText
  lists: ListSpec[]
  /** The list the Home Page's Property Grid shows. */
  featuredList: string
  guides: GuideSpec[]
}

const petFriendly = (noun: string): ListSpec => ({
  slug: "pet-friendly",
  title: "Pet-Friendly",
  intro: `Bring the whole family, four-legged members included. Every one of these ${noun} welcomes pets.`,
  petsAllowed: true,
  sort: "rating",
})

export const demoSites: SiteSpec[] = [
  {
    slug: "demo-mountain",
    legacyUrls: {
      propertyPattern: "cabin-rentals",
      redirects: [{ from: "/about-us.html", to: "/about" }],
    },
    amenityFilters: [
      "hot-tub",
      "pet-friendly",
      "game-room",
      "fireplace",
      "mountain-view",
      "ev-charger",
    ],
    name: "Demo Mountain",
    domain: "demo-mountain.localhost",
    deploymentUrl: "http://localhost:3200",
    feedAccountRef: "demo-mountain",
    branding: {
      primaryColor: "#1F4D3A",
      accentColor: "#D98E04",
      fontPairing: "rustic",
      tagline: "Cabins with a view, fires with a crackle.",
      phone: "+1 (435) 555-0142",
      email: "stay@demo-mountain.localhost",
      address: "12 Timberline Road, Park City, UT 84060",
      social: [
        { platform: "instagram", url: "https://instagram.com/demomountain" },
        { platform: "facebook", url: "https://facebook.com/demomountain" },
      ],
    },
    houseRules:
      "No smoking indoors. Quiet hours 10pm to 8am. Maximum occupancy as listed. Please keep the hot tub cover on when not in use.",
    cancellationPolicy:
      "Full refund when cancelled 30 or more days before arrival. 50% refund 14 to 29 days before arrival. No refund within 14 days. The damage deposit is returned within 7 days of departure.",
    noun: "cabins",
    place: "the mountains",
    hero: {
      heading: "Your basecamp in the mountains",
      subheading:
        "Hand-picked cabins and chalets minutes from the lifts, the trails and the town.",
    },
    welcome: richText(
      heading("Mountain stays, done properly"),
      "We look after every home ourselves: firewood stacked, hot tubs checked, and a local team a phone call away.",
      bullets([
        "Ski-in/ski-out chalets and quiet cabins in the pines",
        "Homes for couples and for groups of twenty",
        "Book direct for the best rate",
      ])
    ),
    faq: [
      {
        question: "What time is check-in?",
        answer:
          "Check-in is from 4pm and check-out is by 10am. Early check-in can often be arranged, just ask.",
      },
      {
        question: "Do I need a four-wheel drive in winter?",
        answer:
          "Most of our homes are on plowed roads, but we recommend 4WD or chains from December to March.",
      },
      {
        question: "Are pets allowed?",
        answer:
          "Many of our cabins welcome dogs. Look for our Pet-Friendly list.",
      },
    ],
    about: richText(
      heading("Local since day one"),
      "Demo Mountain is a family-run rental company. We live here, ski here and look after every home as if it were our own.",
      "Our housekeeping and maintenance teams are local, so help is never far away."
    ),
    owners: richText(
      heading("List your mountain home with us"),
      "We market your home directly to guests who love the mountains, look after it between stays, and keep you informed every step of the way.",
      bullets([
        "Professional photography and listing copy",
        "Local housekeeping, maintenance and guest support",
        "Transparent monthly owner statements",
      ])
    ),
    contact: richText(
      heading("Talk to our team"),
      "Our office is open every day from 8am to 8pm. Call, email or use the form below and we'll get back to you the same day."
    ),
    lists: [
      {
        slug: "hot-tub-cabins",
        title: "Hot Tub Cabins",
        intro:
          "After a day on the slopes, nothing beats a soak under the stars. Every cabin here has a private hot tub.",
        amenity: { feedIds: ["hot-tub", "hottub"], names: ["hot tub"] },
        sort: "featured",
      },
      {
        slug: "large-groups",
        title: "Large Groups",
        intro:
          "Room for everyone: homes that sleep ten or more, for family reunions and ski trips with friends.",
        minSleeps: 10,
        sort: "sleeps",
      },
      petFriendly("cabins"),
    ],
    featuredList: "hot-tub-cabins",
    guides: [
      {
        slug: "best-winter-hikes",
        title: "The best winter hikes near town",
        excerpt:
          "Snowshoe trails for every level, from easy valley loops to summit views.",
        body: richText(
          "Winter doesn't mean staying indoors. These are our team's favourite snowshoe routes, all within a short drive of our cabins.",
          heading("Easy: the valley loop"),
          "A flat two-mile loop along the creek, perfect for families and first-timers.",
          heading("Challenging: the ridge trail"),
          "A steady climb to a viewpoint over the whole range. Start early and pack layers."
        ),
        locationLevels: ["destination", "area"],
        propertyCount: 2,
      },
      {
        slug: "apres-ski-guide",
        title: "Après-ski: our guide to the evenings",
        excerpt: "Where to eat, drink and warm up after the lifts close.",
        body: richText(
          "The mountain's evenings are as good as its days. Here's where our guests keep coming back to.",
          bullets([
            "Fondue by the fire at the old lodge",
            "Craft beer on Main Street",
            "Hot chocolate and live music at the base area",
          ])
        ),
        locationLevels: ["area", "complex"],
        propertyCount: 3,
      },
    ],
  },
  {
    slug: "demo-beach",
    legacyUrls: { propertyPattern: "property-details", redirects: [] },
    amenityFilters: [
      "beachfront",
      "pool",
      "ocean-view",
      "pet-friendly",
      "elevator",
      "wifi",
    ],
    name: "Demo Beach",
    domain: "demo-beach.localhost",
    deploymentUrl: "http://localhost:3201",
    feedAccountRef: "demo-beach",
    branding: {
      primaryColor: "#0E7C86",
      accentColor: "#FF6F59",
      fontPairing: "modern",
      tagline: "Sand between your toes, sea in view.",
      phone: "+1 (850) 555-0177",
      email: "hello@demo-beach.localhost",
      address: "400 Gulf Shore Drive, Destin, FL 32541",
      social: [
        { platform: "instagram", url: "https://instagram.com/demobeach" },
        { platform: "tiktok", url: "https://tiktok.com/@demobeach" },
      ],
    },
    houseRules:
      "No smoking. No parties or events. Please rinse sand off at the outdoor shower before coming inside. Pool hours 8am to 10pm.",
    cancellationPolicy:
      "Full refund when cancelled 45 or more days before arrival. 50% refund 30 to 44 days before arrival. No refund within 30 days. Travel insurance is recommended.",
    noun: "beach homes",
    place: "the coast",
    hero: {
      heading: "Wake up to the sound of the waves",
      subheading:
        "Beachfront condos and pool homes along the Gulf, managed by a local team.",
    },
    welcome: richText(
      heading("Beach days, sorted"),
      "From beachfront condos to family homes with a private pool, every stay comes with beach gear, local tips and a team on call.",
      bullets([
        "Steps from the sand",
        "Beach chairs and umbrellas included",
        "Book direct for the best rate",
      ])
    ),
    faq: [
      {
        question: "What time is check-in?",
        answer:
          "Check-in is from 4pm and check-out is by 10am, so our housekeepers have time to get everything ready.",
      },
      {
        question: "Is beach gear included?",
        answer:
          "Yes, every home comes with beach chairs and an umbrella. Many also have kayaks and bikes.",
      },
      {
        question: "Can I bring my dog?",
        answer: "Several homes welcome pets. See our Pet-Friendly list.",
      },
    ],
    about: richText(
      heading("Locals on the Gulf"),
      "Demo Beach has welcomed guests to the coast for over fifteen years. We know every home, every beach access and the best place for sunset.",
      "Our team lives here year-round and is always nearby when you need us."
    ),
    owners: richText(
      heading("Rent your beach home with confidence"),
      "We combine professional marketing with hands-on local care, so your home earns more and stays in top shape.",
      bullets([
        "Dynamic pricing tuned to the local market",
        "Inspections after every stay",
        "Owner portal with bookings and statements",
      ])
    ),
    contact: richText(
      heading("We're here to help"),
      "Our beachside office is open daily from 9am to 6pm. Send us a message and we'll reply within a few hours."
    ),
    lists: [
      {
        slug: "beachfront",
        title: "Beachfront",
        intro:
          "Nothing between you and the Gulf but sand. These homes sit right on the beach.",
        amenity: {
          feedIds: ["beachfront", "beach-front", "oceanfront"],
          names: ["beachfront", "beach front", "oceanfront"],
        },
        sort: "featured",
      },
      {
        slug: "pool-homes",
        title: "Pool Homes",
        intro:
          "Your own pool, steps from the beach. For lazy afternoons and evening swims.",
        amenity: {
          feedIds: ["pool", "private-pool"],
          names: ["private pool", "pool"],
        },
        sort: "rating",
      },
      petFriendly("beach homes"),
    ],
    featuredList: "beachfront",
    guides: [
      {
        slug: "best-beaches",
        title: "Our favourite beaches on the Gulf",
        excerpt:
          "Quiet coves, lively boardwalks and the best spots for sunset.",
        body: richText(
          "Every stretch of the coast has its own character. Here are the beaches our team keeps going back to.",
          heading("For families"),
          "Calm water, lifeguards in season and a short walk to ice cream.",
          heading("For sunset"),
          "Head west in the late afternoon: the dunes glow and the crowds thin out."
        ),
        locationLevels: ["destination", "area"],
        propertyCount: 2,
      },
      {
        slug: "rainy-day-ideas",
        title: "Rainy day ideas on the coast",
        excerpt: "Aquariums, seafood shacks and more for a day off the sand.",
        body: richText(
          "A rainy day at the beach can still be a great day. A few of our favourites:",
          bullets([
            "The aquarium and its touch pools",
            "A long seafood lunch at the harbour",
            "The outlet shops for a spot of retail therapy",
          ])
        ),
        locationLevels: ["area", "complex"],
        propertyCount: 3,
      },
    ],
  },
]
