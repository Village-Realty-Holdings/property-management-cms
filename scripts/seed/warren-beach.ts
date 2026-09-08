/**
 * Warren Beach: settings, theme, media, forms and the first pages. Copy and
 * photos come from warrenbeachrentals.com; rentals come from the property
 * provider, so the listing blocks fill themselves.
 */
import type { Payload } from 'payload'

import { findPreset } from '@/lib/themePresets'
import { pageLink, paragraphs, text, upsertForm, upsertGlobal, upsertMedia, upsertPage, urlLink, type TenantId } from './lib'

const UPLOADS = 'https://warrenbeachrentals.com/wp-content/uploads/2026/03'
const GUEST_LOGIN = 'https://warrenbeachrentals.trackhs.com/guest/'
const OWNER_LOGIN = 'https://warrenbeachrentals.trackhs.com/owner/'
const REGION = 'emerald-coast'

const images = {
  logo: { url: `${UPLOADS}/WARRENgroupLogoFINAL.webp`, filename: 'warren-beach-rentals-logo.webp', alt: 'Warren Beach Rentals' },
  icon: { url: `${UPLOADS}/WARRENgroupIconSmall.jpg`, filename: 'warren-beach-rentals-icon.jpg', alt: 'Warren Beach Rentals' },
  waterfront: { url: `${UPLOADS}/Warren-Beach-Waterfront.webp`, filename: 'warren-beach-waterfront.webp', alt: 'Gulf-front homes on white sand along the Emerald Coast' },
  beach: { url: `${UPLOADS}/Warren-Beach-Rentals-1-1024x765.webp`, filename: 'warren-beach-rentals.webp', alt: 'Beach chairs facing the Gulf of Mexico' },
  pets: { url: `${UPLOADS}/Pet-Friendly-Beach.webp`, filename: 'pet-friendly-beach.webp', alt: 'A dog running on the beach' },
  pool: { url: `${UPLOADS}/Private-Pool-2.webp`, filename: 'private-pool.webp', alt: 'Private pool behind a beach house' },
  heatedPool: { url: `${UPLOADS}/Private-heated-poool.jpg`, filename: 'private-heated-pool.jpg', alt: 'Heated private pool at dusk' },
  hotTub: { url: `${UPLOADS}/Hot-Tub-2.jpg`, filename: 'hot-tub.jpg', alt: 'View of a private pool and hot tub' },
  hotTubWinter: { url: `${UPLOADS}/Hot-Tub.jpg`, filename: 'hot-tub-winter.jpg', alt: 'Hot tub on a covered patio' },
}

export async function seedWarrenBeach(payload: Payload, tenant: TenantId) {
  // Media first: settings and pages point at it.
  const media = {} as Record<keyof typeof images, TenantId>
  for (const [key, image] of Object.entries(images)) {
    media[key as keyof typeof images] = await upsertMedia(payload, tenant, image)
  }

  const newsletterForm = await upsertForm(payload, tenant, {
    title: 'Newsletter',
    fields: [{ blockType: 'email', name: 'email', label: 'Email', required: true, width: 100 }],
    submitButtonLabel: 'Subscribe',
    confirmationType: 'message',
    confirmationMessage: paragraphs('Thanks! Check your inbox to confirm.'),
  })

  const managementForm = await upsertForm(payload, tenant, {
    title: 'Management inquiry',
    fields: [
      { blockType: 'text', name: 'name', label: 'Your name', required: true, width: 50 },
      { blockType: 'email', name: 'email', label: 'Email', required: true, width: 50 },
      { blockType: 'text', name: 'phone', label: 'Phone', width: 50 },
      { blockType: 'text', name: 'address', label: 'Property address', width: 50 },
      { blockType: 'textarea', name: 'message', label: 'Tell us about your home', width: 100 },
    ],
    submitButtonLabel: 'Request a projection',
    confirmationType: 'message',
    confirmationMessage: paragraphs('Thanks, we will be in touch within one business day.'),
  })

  // Pages that other pages link to come first; the search page links to itself, so it is written twice.
  const propertyPage = await upsertPage(payload, tenant, {
    title: 'Rental details',
    slug: 'property',
    layout: [
      { blockType: 'propertyDetail', source: 'param', bookLabel: 'Check availability' },
      {
        blockType: 'cta',
        richText: text('Questions about this rental?', 'Call 850.231.0835, Monday to Saturday 9 to 5 and Sunday 10 to 3.'),
        links: [urlLink('tel:+18502310835', 'Call us'), urlLink(GUEST_LOGIN, 'Guest login', { appearance: 'outline', newTab: true })],
      },
    ],
    meta: { title: 'Rental details', description: 'Photos, amenities, rates and reviews for this Warren Beach rental.' },
  })

  const searchHero = {
    blockType: 'hero',
    type: 'lowImpact',
    richText: text('Vacation rentals', 'Every home and condo we manage from Panama City Beach to 30A, Destin and Navarre Beach, with live availability.', 'h1'),
    links: [],
  }
  const searchPage = await upsertPage(payload, tenant, { title: 'Vacation rentals', slug: 'vacation-rentals', layout: [searchHero] })
  await upsertPage(payload, tenant, {
    title: 'Vacation rentals',
    slug: 'vacation-rentals',
    layout: [
      searchHero,
      {
        blockType: 'availabilitySearch',
        heading: 'Narrow your search',
        resultsPage: searchPage,
        showBedrooms: true,
        showNode: true,
        showPets: true,
        nodeScope: REGION,
        layout: 'bar',
        buttonLabel: 'Search',
      },
      {
        blockType: 'propertyListing',
        heading: null,
        intro: null,
        source: 'query',
        query: { nodeId: REGION, sort: 'featured', limit: 12, followSearchParams: true },
        view: 'grid',
        columns: '3',
        detailPage: propertyPage,
        emptyMessage: 'No rentals match. Try different dates or fewer filters.',
      },
    ],
    meta: {
      title: 'Vacation rentals',
      description: 'Search beach homes and condos from Panama City Beach to 30A, Destin and Navarre Beach.',
    },
  })

  const managementPage = await upsertPage(payload, tenant, {
    title: 'Property management',
    slug: 'property-management',
    layout: [
      {
        blockType: 'hero',
        type: 'mediumImpact',
        media: media.pool,
        richText: text(
          'Vacation rental management on the Emerald Coast',
          'Family-owned since 1998, we manage beach homes and condos from Panama City Beach to Navarre Beach. Local staff, honest statements and guests who come back.',
          'h1',
        ),
        links: [urlLink('#inquiry', 'Get a free rental projection'), urlLink(OWNER_LOGIN, 'Owner login', { appearance: 'outline', newTab: true })],
      },
      {
        blockType: 'section',
        heading: 'What we take care of',
        subheading: 'Everything between a booking and a five-star review.',
        layout: 'threeCards',
        width: 'container',
        padding: 'none',
        background: 'none',
        main: [{ blockType: 'content', columns: [{ size: 'full', richText: text('Marketing and pricing', 'Professional photography, listings on every major channel and nightly rates tuned to local demand.', 'h3') }] }],
        secondary: [{ blockType: 'content', columns: [{ size: 'full', richText: text('Guest care', 'A local team answers calls seven days a week, handles check-in and is on site within the hour when something needs fixing.', 'h3') }] }],
        third: [{ blockType: 'content', columns: [{ size: 'full', richText: text('Housekeeping and inspections', 'Hotel-standard cleaning after every stay, with an inspection before the next guest arrives.', 'h3') }] }],
      },
      {
        blockType: 'bookingSteps',
        heading: 'Getting started',
        intro: 'From first call to first booking in a few weeks.',
        steps: [
          { icon: 'phone', title: 'Talk to us', text: 'Tell us about your home. We send a rental projection based on comparable homes nearby.' },
          { icon: 'home', title: 'Get the home ready', text: 'We walk the property, photograph it and set up the listing and pricing.' },
          { icon: 'calendar', title: 'Start earning', text: 'Bookings arrive, statements land in the owner portal and the team handles the rest.' },
        ],
      },
      {
        blockType: 'formBlock',
        form: managementForm,
        enableIntro: true,
        introContent: text('Request a free rental projection', 'Tell us a little about your home and we will reply within one business day.'),
      },
    ],
    meta: {
      title: 'Property management',
      description: 'Full-service vacation rental management from Panama City Beach to Navarre Beach.',
    },
  })

  await upsertPage(payload, tenant, {
    title: 'Home',
    slug: 'home',
    layout: [
      {
        blockType: 'hero',
        type: 'highImpact',
        media: media.waterfront,
        richText: text(
          'Book your Emerald Coast vacation rental',
          'White sands and sunshine await. Family-owned beach homes and condos from Panama City Beach to 30A, Destin and Navarre Beach.',
          'h1',
        ),
        links: [pageLink(searchPage, 'Find a rental'), pageLink(managementPage, 'Property management', 'outline')],
      },
      {
        blockType: 'availabilitySearch',
        heading: 'Find your stay',
        resultsPage: searchPage,
        showBedrooms: true,
        showNode: true,
        showPets: true,
        nodeScope: REGION,
        layout: 'bar',
        buttonLabel: 'Search',
      },
      {
        blockType: 'propertyListing',
        heading: 'Featured Emerald Coast rentals',
        intro: 'Hand-picked homes and condos with real-time availability, from Panama City Beach to 30A.',
        source: 'query',
        query: { nodeId: REGION, sort: 'featured', limit: 6 },
        view: 'grid',
        columns: '3',
        detailPage: propertyPage,
        emptyMessage: 'No rentals match. Try different dates or fewer filters.',
      },
      {
        blockType: 'areaGuide',
        heading: 'Guest favorite amenities',
        intro:
          'From waking up to Gulf views to pet-friendly beach homes where every family member is welcome, our Florida Panhandle rentals come with the amenities that make a stay.',
        layout: 'cards',
        searchPage,
        items: [
          { title: 'Pet friendly', category: 'Bring the dog', image: media.pets, text: 'Homes and condos that welcome dogs, close to beaches where they can run.', linkUrl: '/vacation-rentals?pets=1', linkLabel: 'Pet-friendly rentals' },
          { title: 'Private pool', category: 'Just for you', image: media.pool, text: 'Your own pool in the backyard, a few steps from the sand.', linkUrl: '/vacation-rentals', linkLabel: 'Homes with a pool' },
          { title: 'Heated pool', category: 'Year round', image: media.heatedPool, text: 'Swim in January. Heated pools keep the off season warm.', linkUrl: '/vacation-rentals', linkLabel: 'Heated pool rentals' },
          { title: 'Hot tub', category: 'Unwind', image: media.hotTub, text: 'End a beach day in the bubbles under the stars.', linkUrl: '/vacation-rentals', linkLabel: 'Rentals with a hot tub' },
          { title: 'Beachfront', category: 'On the sand', image: media.beach, text: 'Gulf views from the balcony and the beach at the bottom of the stairs.', linkUrl: '/vacation-rentals', linkLabel: 'Beachfront rentals' },
          { title: 'Snowbird stays', category: 'Monthly rates', image: media.hotTubWinter, text: 'Monthly rates from November through March for longer winter stays.', linkUrl: '/vacation-rentals', linkLabel: 'Snowbird rentals' },
        ],
      },
      {
        blockType: 'propertyListing',
        heading: 'Vacations are better together',
        intro: 'Find vacation rentals for large groups along the Florida Panhandle.',
        source: 'query',
        query: { nodeId: REGION, bedrooms: 3, guests: 8, sort: 'sleeps-desc', limit: 8 },
        view: 'carousel',
        columns: '3',
        detailPage: propertyPage,
        emptyMessage: 'No rentals match. Try different dates or fewer filters.',
      },
      { blockType: 'promos', heading: 'Current specials', nodeId: REGION, limit: 3, ctaLabel: 'Book now', ctaPage: searchPage },
      {
        blockType: 'bookingSteps',
        heading: 'Book in three steps',
        intro: 'From first look to front door, booking takes a few minutes.',
        steps: [
          { icon: 'search', title: 'Pick your dates', text: 'Search real-time availability across every home we manage.' },
          { icon: 'card', title: 'Book securely', text: 'Instant confirmation, transparent fees, no surprises.' },
          { icon: 'key', title: 'Check in with a code', text: 'Your door code arrives the morning of arrival. No front desk.' },
        ],
      },
      { blockType: 'reviewsFeed', heading: 'What guests are saying', minRating: 4, limit: 6, layout: 'grid', showUnit: true, showSummary: true },
      {
        blockType: 'ownerCta',
        eyebrow: 'Property management',
        heading: 'Own a home on the Emerald Coast?',
        text: 'Find out how much more your home could earn with local, full-service management. Family-owned since 1998.',
        benefits: [
          { text: 'Nightly rates tuned to local demand' },
          { text: 'Professional photography and listings on every major channel' },
          { text: 'Hotel-standard housekeeping and inspections' },
          { text: 'Owner portal with real-time statements' },
        ],
        image: media.beach,
        links: [pageLink(managementPage, 'Get a free rental projection'), urlLink(OWNER_LOGIN, 'Owner login', { appearance: 'outline', newTab: true })],
        tone: 'accent',
      },
      {
        blockType: 'newsletter',
        heading: 'Subscribe to our emails',
        text: 'The latest news, local events and specials, about twice a month.',
        form: newsletterForm,
        buttonLabel: 'Subscribe',
        successMessage: 'Thanks! Check your inbox to confirm.',
        tone: 'band',
      },
    ],
    meta: {
      title: 'Florida Panhandle Vacation Rentals',
      description:
        'Beach homes and condos from Panama City Beach to 30A, Destin and Navarre Beach. Family-owned on the Emerald Coast since 1998.',
      image: media.waterfront,
    },
  })

  await upsertGlobal(payload, 'site-settings', tenant, {
    general: {
      siteName: 'Warren Beach Rentals',
      siteDescription:
        'Vacation rentals from Panama City Beach to 30A, Destin and Navarre Beach. Family-owned on the Emerald Coast since 1998.',
      favicon: media.icon,
    },
    seo: { defaultOgImage: media.waterfront, metaTitleSuffix: ' | Warren Beach Rentals', noIndex: true },
    social: {
      socialLinks: [
        { platform: 'facebook', url: 'https://www.facebook.com/WarrenBeachRentals' },
        { platform: 'instagram', url: 'https://www.instagram.com/warrenbeachrentals/' },
      ],
    },
  })

  await upsertGlobal(payload, 'header', tenant, {
    logo: media.logo,
    brand: 'Warren Beach Rentals',
    navItems: [
      { link: { type: 'reference', reference: { relationTo: 'pages', value: searchPage }, label: 'Vacation rentals' } },
      { link: { type: 'reference', reference: { relationTo: 'pages', value: managementPage }, label: 'Property management' } },
      { link: { type: 'custom', url: OWNER_LOGIN, label: 'Owner login', newTab: true } },
    ],
    ctaLink: { label: 'Guest login', url: GUEST_LOGIN, newTab: true },
  })

  await upsertGlobal(payload, 'footer', tenant, {
    tagline: 'Vacation rentals from Panama City Beach to 30A, Destin and Navarre Beach.',
    navItems: [
      { link: { type: 'reference', reference: { relationTo: 'pages', value: searchPage }, label: 'Vacation rentals' } },
      { link: { type: 'reference', reference: { relationTo: 'pages', value: managementPage }, label: 'Property management' } },
      { link: { type: 'custom', url: GUEST_LOGIN, label: 'Guest login', newTab: true } },
      { link: { type: 'custom', url: OWNER_LOGIN, label: 'Owner login', newTab: true } },
    ],
    contact: {
      phone: '850.231.0835',
      address: '169 Griffin Blvd, Unit 120\nPanama City Beach, FL 32413',
      hours: 'Mon to Sat 9 AM to 5 PM\nSun 10 AM to 3 PM',
    },
    copyright: 'Warren Beach Rentals. All rights reserved.',
  })

  const preset = findPreset('warren-beach-classic')!
  await upsertGlobal(payload, 'theme', tenant, { preset: preset.key, ...preset })
}
