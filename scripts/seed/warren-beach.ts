/** Warren Beach Rentals: copy and photos from warrenbeachrentals.com; rentals from the Emerald Coast region of the provider. */
import type { SiteContent } from './site'

const UPLOADS = 'https://warrenbeachrentals.com/wp-content/uploads/2026/03'
const img = (file: string, filename: string, alt: string) => ({ url: `${UPLOADS}/${file}`, filename, alt })

const pets = img('Pet-Friendly-Beach.webp', 'pet-friendly-beach.webp', 'A dog running on the beach')
const beach = img('Warren-Beach-Rentals-1-1024x765.webp', 'warren-beach-rentals.webp', 'Beach chairs facing the Gulf of Mexico')
const pool = img('Private-Pool-2.webp', 'private-pool.webp', 'Private pool behind a beach house')

export const warrenBeach: SiteContent = {
  name: 'Warren Beach Rentals',
  region: 'emerald-coast',
  themePreset: 'warren-beach-classic',
  logins: { guest: 'https://warrenbeachrentals.trackhs.com/guest/', owner: 'https://warrenbeachrentals.trackhs.com/owner/' },
  contact: {
    phone: '850.231.0835',
    address: '169 Griffin Blvd, Unit 120\nPanama City Beach, FL 32413',
    hours: 'Mon to Sat 9 AM to 5 PM\nSun 10 AM to 3 PM',
  },
  social: [
    { platform: 'facebook', url: 'https://www.facebook.com/WarrenBeachRentals' },
    { platform: 'instagram', url: 'https://www.instagram.com/warrenbeachrentals/' },
  ],
  images: {
    logo: img('WARRENgroupLogoFINAL.webp', 'warren-beach-rentals-logo.webp', 'Warren Beach Rentals'),
    icon: img('WARRENgroupIconSmall.jpg', 'warren-beach-rentals-icon.jpg', 'Warren Beach Rentals'),
    hero: img('Warren-Beach-Waterfront.webp', 'warren-beach-waterfront.webp', 'Gulf-front homes on white sand along the Emerald Coast'),
    management: pool,
    owner: beach,
  },
  meta: {
    title: 'Florida Panhandle Vacation Rentals',
    description: 'Beach homes and condos from Panama City Beach to 30A, Destin and Navarre Beach. Family-owned on the Emerald Coast since 1998.',
    suffix: ' | Warren Beach Rentals',
  },
  hero: {
    title: 'Book your Emerald Coast vacation rental',
    text: 'White sands and sunshine await. Family-owned beach homes and condos from Panama City Beach to 30A, Destin and Navarre Beach.',
  },
  search: {
    title: 'Vacation rentals',
    text: 'Every home and condo we manage from Panama City Beach to 30A, Destin and Navarre Beach, with live availability.',
  },
  featured: {
    heading: 'Featured Emerald Coast rentals',
    intro: 'Hand-picked homes and condos with real-time availability, from Panama City Beach to 30A.',
  },
  amenities: {
    heading: 'Guest favorite amenities',
    intro:
      'From waking up to Gulf views to pet-friendly beach homes where every family member is welcome, our Florida Panhandle rentals come with the amenities that make a stay.',
    items: [
      { title: 'Pet friendly', category: 'Bring the dog', image: pets, text: 'Homes and condos that welcome dogs, close to beaches where they can run.', linkUrl: '/vacation-rentals?pets=1', linkLabel: 'Pet-friendly rentals' },
      { title: 'Private pool', category: 'Just for you', image: pool, text: 'Your own pool in the backyard, a few steps from the sand.', linkUrl: '/vacation-rentals', linkLabel: 'Homes with a pool' },
      { title: 'Heated pool', category: 'Year round', image: img('Private-heated-poool.jpg', 'private-heated-pool.jpg', 'Heated private pool at dusk'), text: 'Swim in January. Heated pools keep the off season warm.', linkUrl: '/vacation-rentals', linkLabel: 'Heated pool rentals' },
      { title: 'Hot tub', category: 'Unwind', image: img('Hot-Tub-2.jpg', 'hot-tub.jpg', 'View of a private pool and hot tub'), text: 'End a beach day in the bubbles under the stars.', linkUrl: '/vacation-rentals', linkLabel: 'Rentals with a hot tub' },
      { title: 'Beachfront', category: 'On the sand', image: beach, text: 'Gulf views from the balcony and the beach at the bottom of the stairs.', linkUrl: '/vacation-rentals', linkLabel: 'Beachfront rentals' },
      { title: 'Snowbird stays', category: 'Monthly rates', image: img('Hot-Tub.jpg', 'hot-tub-winter.jpg', 'Hot tub on a covered patio'), text: 'Monthly rates from November through March for longer winter stays.', linkUrl: '/vacation-rentals', linkLabel: 'Snowbird rentals' },
    ],
  },
  groups: { heading: 'Vacations are better together', intro: 'Find vacation rentals for large groups along the Florida Panhandle.', bedrooms: 3, guests: 8 },
  management: {
    title: 'Vacation rental management on the Emerald Coast',
    text: 'Family-owned since 1998, we manage beach homes and condos from Panama City Beach to Navarre Beach. Local staff, honest statements and guests who come back.',
    cards: [
      { title: 'Marketing and pricing', text: 'Professional photography, listings on every major channel and nightly rates tuned to local demand.' },
      { title: 'Guest care', text: 'A local team answers calls seven days a week, handles check-in and is on site within the hour when something needs fixing.' },
      { title: 'Housekeeping and inspections', text: 'Hotel-standard cleaning after every stay, with an inspection before the next guest arrives.' },
    ],
  },
  owner: {
    heading: 'Own a home on the Emerald Coast?',
    text: 'Find out how much more your home could earn with local, full-service management. Family-owned since 1998.',
    benefits: [
      'Nightly rates tuned to local demand',
      'Professional photography and listings on every major channel',
      'Hotel-standard housekeeping and inspections',
      'Owner portal with real-time statements',
    ],
  },
  footer: {
    tagline: 'Vacation rentals from Panama City Beach to 30A, Destin and Navarre Beach.',
    copyright: 'Warren Beach Rentals. All rights reserved.',
  },
}
