/**
 * Seeds one tenant's starter site from a content description: photos, the
 * newsletter and management inquiry forms, four published pages (home,
 * vacation-rentals, property, property-management), then the site settings,
 * header, footer and theme. Rentals, specials and reviews come from the
 * property provider, so those blocks fill themselves.
 */
import type { Payload } from 'payload'

import { findPreset } from '@/lib/themePresets'
import { pageLink, paragraphs, text, upsertForm, upsertGlobal, upsertMedia, upsertPage, urlLink, type TenantId } from './lib'

export type ImageSpec = { url: string; filename: string; alt: string }

export type SiteContent = {
  name: string
  /** Node id in the property provider that scopes search, listings and specials. */
  region: string
  themePreset: string
  logins: { guest: string; owner: string }
  contact: { phone: string; address: string; hours?: string }
  social: { platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube' | 'tiktok'; url: string }[]
  images: { logo: ImageSpec; icon: ImageSpec; hero: ImageSpec; management: ImageSpec; owner: ImageSpec }
  meta: { title: string; description: string; suffix: string }
  hero: { title: string; text: string }
  search: { title: string; text: string }
  featured: { heading: string; intro: string }
  amenities: {
    heading: string
    intro: string
    items: { title: string; category: string; image: ImageSpec; text: string; linkUrl: string; linkLabel: string }[]
  }
  groups: { heading: string; intro: string; bedrooms: number; guests: number }
  /** Real quotes from the tenant's site. When absent, the provider's reviews feed is shown. */
  testimonials?: { quote: string; author: string; role?: string; rating?: number }[]
  management: { title: string; text: string; cards: { title: string; text: string }[] }
  owner: { heading: string; text: string; benefits: string[] }
  footer: { tagline: string; copyright: string }
}

export async function seedSite(payload: Payload, tenant: TenantId, site: SiteContent) {
  const { region, logins } = site
  const searchSlug = 'vacation-rentals'

  // Media first: settings and pages point at it.
  const images = { ...site.images, ...Object.fromEntries(site.amenities.items.map((a) => [a.title, a.image])) } as Record<string, ImageSpec>
  const media: Record<string, TenantId> = {}
  for (const [key, image] of Object.entries(images)) media[key] = await upsertMedia(payload, tenant, image)

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

  const phoneHref = `tel:+1${site.contact.phone.replace(/\D/g, '')}`
  const hoursNote = site.contact.hours ? ` ${site.contact.hours.replace(/\n/g, ', ')}.` : ''

  // Pages that other pages link to come first; the search page links to itself, so it is written twice.
  const propertyPage = await upsertPage(payload, tenant, {
    title: 'Rental details',
    slug: 'property',
    layout: [
      { blockType: 'propertyDetail', source: 'param', bookLabel: 'Check availability' },
      {
        blockType: 'cta',
        richText: text('Questions about this rental?', `Call ${site.contact.phone}.${hoursNote}`),
        links: [urlLink(phoneHref, 'Call us'), urlLink(logins.guest, 'Guest login', { appearance: 'outline', newTab: true })],
      },
    ],
    meta: { title: 'Rental details', description: `Photos, amenities, rates and reviews for this ${site.name} rental.` },
  })

  const searchHero = { blockType: 'hero', type: 'lowImpact', richText: text(site.search.title, site.search.text, 'h1'), links: [] }
  const searchBar = (heading: string) => ({
    blockType: 'availabilitySearch',
    heading,
    resultsPage: 0 as TenantId,
    showBedrooms: true,
    showNode: true,
    showPets: true,
    nodeScope: region,
    layout: 'bar',
    buttonLabel: 'Search',
  })
  const listing = (extra: Record<string, unknown>) => ({
    blockType: 'propertyListing',
    source: 'query',
    view: 'grid',
    columns: '3',
    detailPage: propertyPage,
    emptyMessage: 'No rentals match. Try different dates or fewer filters.',
    ...extra,
  })

  const searchPage = await upsertPage(payload, tenant, { title: 'Vacation rentals', slug: searchSlug, layout: [searchHero] })
  await upsertPage(payload, tenant, {
    title: 'Vacation rentals',
    slug: searchSlug,
    layout: [
      searchHero,
      { ...searchBar('Narrow your search'), resultsPage: searchPage },
      listing({ heading: null, intro: null, query: { nodeId: region, sort: 'featured', limit: 12, followSearchParams: true } }),
    ],
    meta: { title: 'Vacation rentals', description: site.search.text },
  })

  const managementPage = await upsertPage(payload, tenant, {
    title: 'Property management',
    slug: 'property-management',
    layout: [
      {
        blockType: 'hero',
        type: 'mediumImpact',
        media: media.management,
        richText: text(site.management.title, site.management.text, 'h1'),
        links: [urlLink('#inquiry', 'Get a free rental projection'), urlLink(logins.owner, 'Owner login', { appearance: 'outline', newTab: true })],
      },
      {
        blockType: 'container',
        direction: 'column',
        gap: 'md',
        width: 'container',
        padding: 'none',
        background: 'none',
        blocks: [
          {
            blockType: 'content',
            columns: [{ size: 'full', richText: text('What we take care of', 'Everything between a booking and a five-star review.', 'h2') }],
          },
          {
            blockType: 'container2',
            direction: 'row',
            gap: 'md',
            background: 'none',
            blocks: site.management.cards.map((card) => ({
              blockType: 'container3',
              direction: 'column',
              gap: 'md',
              background: 'surface',
              blocks: [{ blockType: 'content', columns: [{ size: 'full', richText: text(card.title, card.text, 'h3') }] }],
            })),
          },
        ],
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
    meta: { title: 'Property management', description: site.management.text },
  })

  const reviews = site.testimonials
    ? {
        blockType: 'testimonials',
        heading: 'What guests are saying',
        layout: 'grid',
        items: site.testimonials.map((t) => ({ rating: 5, ...t })),
      }
    : { blockType: 'reviewsFeed', heading: 'What guests are saying', minRating: 4, limit: 6, layout: 'grid', showUnit: true, showSummary: true }

  await upsertPage(payload, tenant, {
    title: 'Home',
    slug: 'home',
    layout: [
      {
        blockType: 'hero',
        type: 'highImpact',
        media: media.hero,
        richText: text(site.hero.title, site.hero.text, 'h1'),
        links: [pageLink(searchPage, 'Find a rental'), pageLink(managementPage, 'Property management', 'outline')],
      },
      { ...searchBar('Find your stay'), resultsPage: searchPage },
      listing({ ...site.featured, query: { nodeId: region, sort: 'featured', limit: 6 } }),
      {
        blockType: 'areaGuide',
        heading: site.amenities.heading,
        intro: site.amenities.intro,
        layout: 'cards',
        searchPage,
        items: site.amenities.items.map(({ image: _image, ...item }) => ({ ...item, image: media[item.title] })),
      },
      listing({
        heading: site.groups.heading,
        intro: site.groups.intro,
        query: { nodeId: region, bedrooms: site.groups.bedrooms, guests: site.groups.guests, sort: 'sleeps-desc', limit: 8 },
        view: 'carousel',
      }),
      { blockType: 'promos', heading: 'Current specials', nodeId: region, limit: 3, ctaLabel: 'Book now', ctaPage: searchPage },
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
      reviews,
      {
        blockType: 'ownerCta',
        eyebrow: 'Property management',
        heading: site.owner.heading,
        text: site.owner.text,
        benefits: site.owner.benefits.map((b) => ({ text: b })),
        image: media.owner,
        links: [pageLink(managementPage, 'Get a free rental projection'), urlLink(logins.owner, 'Owner login', { appearance: 'outline', newTab: true })],
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
    meta: { title: site.meta.title, description: site.meta.description, image: media.hero },
  })

  await upsertGlobal(payload, 'site-settings', tenant, {
    general: { siteName: site.name, siteDescription: site.meta.description, favicon: media.icon },
    seo: { defaultOgImage: media.hero, metaTitleSuffix: site.meta.suffix, noIndex: true },
    social: { socialLinks: site.social },
  })

  const ref = (page: TenantId, label: string) => ({ link: { type: 'reference', reference: { relationTo: 'pages', value: page }, label } })
  const ext = (url: string, label: string) => ({ link: { type: 'custom', url, label, newTab: true } })

  await upsertGlobal(payload, 'header', tenant, {
    logo: media.logo,
    brand: site.name,
    navItems: [ref(searchPage, 'Vacation rentals'), ref(managementPage, 'Property management'), ext(logins.owner, 'Owner login')],
    ctaLink: { label: 'Guest login', url: logins.guest, newTab: true },
  })

  await upsertGlobal(payload, 'footer', tenant, {
    tagline: site.footer.tagline,
    navItems: [ref(searchPage, 'Vacation rentals'), ref(managementPage, 'Property management'), ext(logins.guest, 'Guest login'), ext(logins.owner, 'Owner login')],
    contact: site.contact,
    copyright: site.footer.copyright,
  })

  const preset = findPreset(site.themePreset)
  if (!preset) throw new Error(`unknown theme preset ${site.themePreset}`)
  await upsertGlobal(payload, 'theme', tenant, { preset: preset.key, ...preset })
}
