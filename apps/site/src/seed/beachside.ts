import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { BEACHSIDE, presetInputs } from "../theme"
import type { SeedModule } from "./index"
import type { MediaData, PageData, Seeder } from "./upsert"

/**
 * The seed of the `beachside` Site: Beachside Vacations, an invented brand
 * (spec Phase 6). Fraunces and Nunito Sans imported from Google Fonts, the
 * Beachside Theme preset, the Brand with its SVG wordmark, SEO, a default
 * Layout with its menu, and four Pages. Everything here is invented copy.
 *
 * Photos are from Unsplash. They live in seed/beachside/, next to
 * attribution.json, which names each photo's author, source and licence; the
 * seed stores those on the Media. The Rentals' and blog posts' photos are
 * fixtures (src/site/fixtures/beachside.ts), not Media.
 */

const seedDir = fileURLToPath(new URL("../../seed/beachside/", import.meta.url))

type Attribution = { author: string; sourceUrl: string; licence: string }

const attributions = JSON.parse(
  readFileSync(`${seedDir}attribution.json`, "utf8")
) as Record<string, Attribution>

/** A stock photo from seed/beachside/, with its attribution. */
function photo(filename: string, alt: string): MediaData {
  const attribution = attributions[filename]
  if (!attribution) {
    throw new Error(
      `seed/beachside/attribution.json has no entry for ${filename}. Every photo needs its author, source and licence.`
    )
  }
  return {
    file: `${seedDir}${filename}`,
    alt,
    credit: `Photo: ${attribution.author} on Unsplash`,
    attribution: {
      author: attribution.author,
      sourceUrl: attribution.sourceUrl,
      licence: attribution.licence,
    },
  }
}

const SITE_PHONE = "+1 (555) 010-0142"

async function seedFonts(seed: Seeder) {
  // The spec asks for Fraunces at 600. The Theme's Bold is 700, so both are
  // stored and either is served.
  await seed.font({ family: "Fraunces", kind: "serif", weights: [600, 700] })
  await seed.font({
    family: "Nunito Sans",
    kind: "sans",
    weights: [400, 600, 700],
  })
  await seed.theme(
    presetInputs(BEACHSIDE, [
      { key: await seed.fontKey("Fraunces"), family: "Fraunces" },
      { key: await seed.fontKey("Nunito Sans"), family: "Nunito Sans" },
    ])
  )
}

export const seed: SeedModule = async (seed) => {
  await seedFonts(seed)

  // Media: the wordmark (drawn for the brand), then the photos.
  const wordmark = await seed.media({
    file: `${seedDir}wordmark.svg`,
    alt: "Beachside Vacations",
    credit: "Drawn for Beachside Vacations",
  })
  const hero = await seed.media(
    photo(
      "hero-shoreline-dawn.webp",
      "Waves rolling onto a quiet beach under a pink and purple dawn sky"
    )
  )
  const amenityPool = await seed.media(
    photo(
      "amenity-pool.webp",
      "A private swimming pool in front of a beach house with palm trees"
    )
  )
  const amenityDeck = await seed.media(
    photo(
      "amenity-deck.webp",
      "A wooden chair and a lamp on a balcony with the ocean behind"
    )
  )
  const amenityDining = await seed.media(
    photo(
      "amenity-beach-dining.webp",
      "A table and chairs on a wooden deck above a pebble beach"
    )
  )
  const amenityLiving = await seed.media(
    photo(
      "amenity-living-room.webp",
      "A bright open living room with a sofa, a wood TV stand and big windows"
    )
  )
  const amenityLounge = await seed.media(
    photo(
      "amenity-lounge.webp",
      "A swimming pool seen through tall glass doors from a sunlit lounge"
    )
  )

  await seed.brand({
    name: "Beachside Vacations",
    tagline: "Sun, sand and a home by the sea.",
    logo: wordmark.id,
    contact: {
      phone: SITE_PHONE,
      email: "hello@beachside.example",
      address: "12 Seagrass Lane\nPelican Key",
    },
    social: [
      { platform: "facebook", url: "https://www.facebook.com/" },
      { platform: "instagram", url: "https://www.instagram.com/" },
    ],
  })

  await seed.seo({
    titlePattern: "%s · {name}",
    description:
      "Beach homes for every kind of week: pools, decks and the sea a few steps away. Book direct with Beachside Vacations.",
    image: hero.id,
    // An invented brand for internal demos: keep it out of search engines.
    allowIndexing: false,
  })

  const pages = {
    home: await seed.page(
      home(hero.id, [
        { label: "Private pools", image: amenityPool.id },
        { label: "Ocean-view decks", image: amenityDeck.id },
        { label: "Beachfront dining", image: amenityDining.id },
        { label: "Open living spaces", image: amenityLiving.id },
        { label: "Sunlit lounges", image: amenityLounge.id },
      ])
    ),
    rentals: await seed.page(rentals()),
    owners: await seed.page(owners()),
    contact: await seed.page(contact()),
  }

  // The menu links to the Pages themselves, so it follows them if a path
  // changes. The Layout comes after the Pages for that reason.
  const toPage = (id: number) => ({ type: "page" as const, page: id })
  await seed.layout({
    name: "Default",
    isDefault: true,
    paths: [],
    header: [
      { blockType: "logo", size: "medium", showTagline: false },
      {
        blockType: "navigation",
        items: [
          { label: "Rentals", link: toPage(pages.rentals.id) },
          { label: "Owners", link: toPage(pages.owners.id) },
          { label: "Contact", link: toPage(pages.contact.id) },
        ],
      },
      {
        blockType: "headerActions",
        showPhone: true,
        button: { label: "Book your stay", href: "/rentals" },
      },
    ],
    footer: [
      {
        blockType: "footerColumns",
        columns: [
          {
            heading: "Explore",
            content: "links",
            links: [
              { label: "Home", link: toPage(pages.home.id) },
              { label: "Rentals", link: toPage(pages.rentals.id) },
              { label: "Owners", link: toPage(pages.owners.id) },
              { label: "Contact", link: toPage(pages.contact.id) },
            ],
          },
          { heading: "Find us", content: "address" },
          { heading: "Follow us", content: "social" },
        ],
      },
      { blockType: "legalBar", text: "© {year} {name}" },
    ],
  })
}

type AmenityTile = { label: string; image: number }

function home(heroImage: number, tiles: AmenityTile[]): PageData {
  return {
    path: "/",
    title: "Home",
    blocks: [
      {
        blockType: "searchHero",
        eyebrow: "Beachside Vacations",
        heading: "Find your home by the sea",
        accentWord: "by the sea",
        subheading:
          "Ten hand-picked beach homes with pools, decks and the water a few steps away. Pick your dates and come on down.",
        image: heroImage,
        searchLabel: "Search homes",
        locations: [
          { name: "Pelican Key" },
          { name: "Coral Point" },
          { name: "Driftwood Bay" },
          { name: "Gull Harbour" },
          { name: "Saltgrass Point" },
        ],
      },
      {
        blockType: "featuredRentals",
        heading: "Featured beach homes",
        count: 6,
        variant: "grid",
        background: "default",
      },
      {
        blockType: "amenities",
        heading: "Everything for an easy week",
        intro:
          "Every Beachside home comes with the things you will actually use, and a local team a phone call away.",
        variant: "mosaic",
        items: tiles,
        background: "muted",
      },
      {
        blockType: "testimonials",
        heading: "Guests love the shore",
        variant: "grid",
        testimonials: [
          {
            quote:
              "We woke up to the sound of the waves every morning. The kids did not want to leave, and honestly neither did we.",
            name: "Maya R.",
            role: "Stayed a week in Pelican Key",
            rating: 5,
          },
          {
            quote:
              "The pool, the deck and a kitchen that had everything. Check-in took two minutes and the team answered every question.",
            name: "Daniel and Priya K.",
            role: "Family trip to Coral Point",
            rating: 5,
          },
          {
            quote:
              "Booking was simple and the home was even better than the photos. We have already picked dates for next summer.",
            name: "Tom A.",
            role: "Long weekend in Driftwood Bay",
            rating: 5,
          },
        ],
        background: "default",
      },
      {
        blockType: "newsletter",
        heading: "Beach-week ideas, once a month",
        text: "New homes, local tips and early access to summer dates. No spam, and you can leave whenever you like.",
        emailPlaceholder: "Your email address",
        buttonLabel: "Subscribe",
        background: "muted",
      },
    ],
    seo: {
      title: "Beach homes for every kind of week",
      description:
        "Find your home by the sea: pools, decks and the water a few steps away. Search Beachside Vacations' hand-picked beach homes.",
      image: heroImage,
    },
  }
}

function rentals(): PageData {
  return {
    path: "/rentals",
    title: "Rentals",
    blocks: [
      {
        blockType: "rentalGrid",
        heading: "All our beach homes",
        pageSize: 6,
        background: "default",
      },
      {
        blockType: "faq",
        heading: "Booking questions",
        questions: [
          {
            question: "What time can we check in and out?",
            answer:
              "Check-in is from 4 pm and check-out is by 10 am. If your home is free the night before, we are happy to arrange an early arrival.",
          },
          {
            question: "Can we bring our dog?",
            answer:
              "Some homes welcome pets. Look for the pet-friendly badge on a home, and let us know about your dog when you book.",
          },
          {
            question: "What does it cost, and when do we pay?",
            answer:
              "You pay a deposit when you book and the balance 30 days before you arrive. The price you see includes cleaning and linens.",
          },
          {
            question: "Are linens and beach gear included?",
            answer:
              "Yes. Every home has fresh linens and towels, and most have beach chairs, umbrellas and a cooler waiting for you.",
          },
          {
            question: "What if our plans change?",
            answer:
              "Cancel up to 30 days before arrival for a full refund of your deposit. After that, we will help you move your dates where we can.",
          },
        ],
        background: "muted",
      },
    ],
    seo: {
      title: "Beach home rentals",
      description:
        "Browse every Beachside beach home: sizes from a cosy bungalow to a sixteen-guest house, most with a pool or a deck by the water.",
    },
  }
}

function owners(): PageData {
  return {
    path: "/owners",
    title: "Owners",
    blocks: [
      {
        blockType: "hero",
        eyebrow: "For homeowners",
        heading: "Your beach home, in good hands",
        accentWord: "good hands",
        subheading:
          "We market, book and look after your home, so you enjoy the income and your own weeks by the sea.",
        cta: { label: "Get a free estimate", href: "/contact" },
      },
      {
        blockType: "steps",
        heading: "How it works",
        intro: "From first hello to first guests, in three steps.",
        steps: [
          {
            title: "Tell us about your home",
            text: "Share the address and a few details. We reply within one business day with a rental estimate.",
          },
          {
            title: "We get it ready",
            text: "Photos, a listing written in our voice, pricing and a cleaning routine, all set up for you.",
          },
          {
            title: "Guests arrive, you relax",
            text: "We handle bookings, check-in and every late-night question, and send you a clear statement each month.",
          },
        ],
        background: "default",
      },
      {
        blockType: "stats",
        heading: "Beachside by the numbers",
        stats: [
          { value: "4.9", label: "Average guest rating" },
          { value: "68%", label: "Guests who book us again" },
          { value: "10", label: "Homes on our coast" },
          { value: "24/7", label: "Local team on call" },
        ],
        background: "muted",
      },
      {
        blockType: "ownerBand",
        heading: "Own a home by the water?",
        pitch:
          "Join the small collection of homes we look after, and we will treat yours like our own.",
        benefits: [
          { text: "Full service, from listing to turnover" },
          { text: "A monthly statement you can read at a glance" },
          { text: "Your own weeks blocked whenever you like" },
        ],
        cta: { label: "Talk to our owner team", href: "/contact" },
        background: "dark",
      },
      {
        blockType: "faq",
        heading: "Questions from owners",
        questions: [
          {
            question: "What does Beachside charge?",
            answer:
              "We take a share of the rent we earn for you and nothing else. There are no set-up fees, and the estimate we send you shows exactly what you would keep.",
          },
          {
            question: "Can I still use my home?",
            answer:
              "Of course. Block the dates you want from your owner page and we will keep them free.",
          },
          {
            question: "Who looks after the house between guests?",
            answer:
              "Our local team cleans, restocks and checks every home after each stay, and sorts out maintenance before you have to ask.",
          },
          {
            question: "How soon could my home be listed?",
            answer:
              "Usually within two weeks of your first call, once the photos are taken and the listing is written.",
          },
        ],
        background: "default",
      },
      {
        blockType: "form",
        heading: "Get your free rental estimate",
        intro:
          "Tell us about your home and we will be in touch within one business day.",
        formFields: ["name", "email", "phone", "propertyAddress", "message"],
        submitLabel: "Request my estimate",
        successMessage:
          "Thank you. Our owner team will be in touch within one business day.",
        background: "muted",
      },
    ],
    seo: {
      title: "Homeowners: let us look after your beach home",
      description:
        "Beachside Vacations markets, books and looks after your beach home. See how it works and ask for a free rental estimate.",
    },
  }
}

function contact(): PageData {
  return {
    path: "/contact",
    title: "Contact",
    blocks: [
      {
        blockType: "location",
        heading: "Visit us at the shore",
        address: "12 Seagrass Lane\nPelican Key",
        text: `Drop in for a coffee and a chat about your stay. We are open Monday to Saturday, 9 am to 5 pm, and you can call us on ${SITE_PHONE}.`,
        map: "card",
        background: "default",
      },
      {
        blockType: "form",
        heading: "Send us a message",
        intro:
          "Questions about a home or your dates? Write to us and we will reply the same day.",
        formFields: ["name", "email", "phone", "dates", "message"],
        submitLabel: "Send message",
        successMessage:
          "Thank you. We have your message and will reply the same day.",
        background: "muted",
      },
    ],
    seo: {
      title: "Contact Beachside Vacations",
      description:
        "Visit, call or write to the Beachside Vacations team. We are on Pelican Key and answer the same day.",
    },
  }
}
