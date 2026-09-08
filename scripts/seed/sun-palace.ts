/** Sun Palace Vacation Homes: copy and photos from sunpalacevacationhomes.com; rentals from the Fort Myers Beach region of the provider. */
import type { SiteContent } from './site'

const UPLOADS = 'https://www.sunpalacevacationhomes.com/wp-content/uploads'
const img = (file: string, filename: string, alt: string) => ({ url: `${UPLOADS}/${file}`, filename, alt })

const pool = img('2024/02/Waterfront-Pool-scaled.webp', 'sun-palace-waterfront-pool.webp', 'Private pool on a canal in Fort Myers Beach')
const dock = img('2024/02/Waterfront-dock-2.jpg', 'sun-palace-waterfront-dock.jpg', 'Private dock behind a waterfront home')
const luxury = img('2024/02/Screen-Shot-2023-11-09-at-5.34-1.jpg', 'sun-palace-luxury-home.jpg', 'Luxury vacation home with pool')

export const sunPalace: SiteContent = {
  name: 'Sun Palace Vacation Homes',
  region: 'fort-myers',
  themePreset: 'sun-palace',
  logins: { guest: 'https://sunpalacevh.trackhs.com/guest/#!/login/', owner: 'https://sunpalacevh.trackhs.com/owner/' },
  contact: { phone: '877.217.0099', address: '19041 San Carlos Blvd\nFort Myers Beach, FL 33931' },
  social: [
    { platform: 'facebook', url: 'https://www.facebook.com/SunPalaceVacationHomes' },
    { platform: 'instagram', url: 'https://www.instagram.com/sunpalacevacationhomes/' },
  ],
  images: {
    logo: img('2017/01/sun-palace-logo-2.png', 'sun-palace-logo.png', 'Sun Palace Vacation Homes'),
    icon: img('2017/01/sun-palace-logo-2.png', 'sun-palace-icon.png', 'Sun Palace Vacation Homes'),
    hero: img('2024/02/shutterstock_3350019.jpg', 'sun-palace-fort-myers-beach.jpg', 'Palm trees over the sand at Fort Myers Beach'),
    management: luxury,
    owner: dock,
  },
  meta: {
    title: 'Fort Myers Beach Rentals',
    description: 'Browse and book online for your next vacation to Fort Myers Beach in sunny Florida. Our local team is ready to assist.',
    suffix: ' | Sun Palace Vacation Homes',
  },
  hero: {
    title: 'Book your Fort Myers getaway',
    text: 'Palm trees and sunshine await. Waterfront homes, beachside cottages and condos on Fort Myers Beach, managed by a local team.',
  },
  search: {
    title: 'Fort Myers Beach vacation rentals',
    text: 'Every home, cottage and condo we manage on Fort Myers Beach and around Estero Bay, with live availability.',
  },
  featured: {
    heading: 'Featured Fort Myers Beach rentals',
    intro: 'Best-value homes and condos with real-time availability, from beachside cottages to waterfront estates.',
  },
  amenities: {
    heading: 'Guest favorite amenities',
    intro:
      'From waking up to Gulf waterfront views to splashing in your own private pool, Sun Palace rentals are built around the amenities that matter most. Every pet-friendly home welcomes the whole family.',
    items: [
      { title: 'Waterfront', category: 'On the water', image: dock, text: 'Canal, bay and Gulf-front homes with a dock out back for the boat or the sunset.', linkUrl: '/vacation-rentals', linkLabel: 'Waterfront rentals' },
      { title: 'Pet friendly', category: 'Bring the dog', image: img('2024/02/Dog-Friendly-Tile-1.jpg', 'sun-palace-pet-friendly.jpg', 'A dog on the beach at Fort Myers Beach'), text: 'Homes that welcome dogs, minutes from the dog beach on Estero Island.', linkUrl: '/vacation-rentals?pets=1', linkLabel: 'Pet-friendly rentals' },
      { title: 'Private pool', category: 'Just for you', image: pool, text: 'Your own heated pool in the backyard, with a lanai for the shade.', linkUrl: '/vacation-rentals', linkLabel: 'Homes with a pool' },
      { title: 'Luxury homes', category: 'The best of the beach', image: luxury, text: 'Estates along the Gulf with chef kitchens, elevators and room for everyone.', linkUrl: '/vacation-rentals', linkLabel: 'Luxury rentals' },
      { title: 'Monthly stays', category: 'Snowbirds', image: img('2024/02/Waterfront-Bedroom-2.jpg', 'sun-palace-waterfront-bedroom.jpg', 'Bedroom with a view of the water'), text: 'Monthly rates for the winter, with the full comfort of home.', linkUrl: '/vacation-rentals', linkLabel: 'Monthly rentals' },
      { title: 'Beachside', category: 'Steps to the sand', image: img('2023/12/spv1-1024x684.jpeg', 'sun-palace-beachside.jpg', 'Beach cottage a short walk from the sand'), text: 'Cottages and condos a short walk from the white sand of Fort Myers Beach.', linkUrl: '/vacation-rentals', linkLabel: 'Beachside rentals' },
    ],
  },
  groups: { heading: 'Find getaways for large groups', intro: 'Vacations are better together. Homes with room for the whole family along Fort Myers Beach.', bedrooms: 3, guests: 7 },
  testimonials: [
    { quote: 'Great house and great location! We loved the house, its location and all its amenities. Very close to beach. Great pool and lounging area as well.', author: 'Kelly T.', role: 'Stayed at Seabatical' },
    { quote: 'Great location for family spring break! Dolphins greeted us near the dock on our last day!', author: 'Silvie M.', role: 'Stayed at Dock Holiday' },
    { quote: 'The house was perfect for our family. Plenty of space, a great back area with the pool, a covered table for shade and a new grill. Only a few minutes walk to the beach. We would definitely rent the house again!', author: 'Kyle H.', role: 'Stayed at Blue Horizon' },
  ],
  management: {
    title: 'Vacation rental management on Fort Myers Beach',
    text: 'Fort Myers Beach is our home. We handle everything from strategic marketing to guest relations, so your rental becomes a top choice for vacationers while you keep your peace of mind.',
    cards: [
      { title: 'Marketing and pricing', text: 'Professional photography, listings on every major channel and nightly rates tuned to the Fort Myers season.' },
      { title: '24/7 local support', text: 'A local team that knows Fort Myers Beach inside and out, on call for guests around the clock.' },
      { title: 'Housekeeping and inspections', text: 'Hotel-standard cleaning after every stay, with an inspection before the next guest arrives.' },
    ],
  },
  owner: {
    heading: 'List your vacation rental',
    text: 'We expertly handle all aspects of property management, from strategic marketing to guest relations, and enhance your property\'s earning potential.',
    benefits: [
      'Nightly rates tuned to the Fort Myers season',
      'Professional photography and listings on every major channel',
      '24/7 support from our local team',
      'Owner portal with real-time statements',
    ],
  },
  footer: {
    tagline: 'Waterfront homes, beachside cottages and condos on Fort Myers Beach.',
    copyright: 'Sun Palace Vacations. All rights reserved.',
  },
}
