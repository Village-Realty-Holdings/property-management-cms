/**
 * What a Site's fixture module holds: the Rentals and blog posts its Rental
 * and Blog Blocks show. Fixtures are code, not Admin content.
 */

export type FixtureImage = { src: string; alt: string }

/** A vacation property that visitors can book. */
export type Rental = {
  id: string
  name: string
  type: string
  location: string
  bedrooms: number
  baths: number
  sleeps: number
  petFriendly: boolean
  rating: number
  reviews: number
  features: string[]
  photo: FixtureImage
  url: string
}

export type BlogPost = {
  title: string
  excerpt: string
  /** ISO date, "2026-06-01". */
  date: string
  image: FixtureImage
  url: string
}

export type SiteFixtures = {
  rentals: Rental[]
  posts: BlogPost[]
}
