import type { BlockOf, BlockType } from "../types"
import { amenitiesSample } from "./amenities"
import { blogTeaserSample } from "./blogTeaser"
import { callToActionSample } from "./callToAction"
import { containerSample } from "./container"
import { faqSample } from "./faq"
import { featuredRentalsSample } from "./featuredRentals"
import { featuresSample } from "./features"
import { formSample } from "./form"
import { heroSample } from "./hero"
import { imageTextSample } from "./imageText"
import { largeGroupRentalsSample } from "./largeGroupRentals"
import { locationSample } from "./location"
import { newsletterSample } from "./newsletter"
import { ownerBandSample } from "./ownerBand"
import { rentalGridSample } from "./rentalGrid"
import { richTextSample } from "./richText"
import { searchHeroSample } from "./searchHero"
import { statsSample } from "./stats"
import { stepsSample } from "./steps"
import { testimonialsSample } from "./testimonials"
import { trustStripSample } from "./trustStrip"

/**
 * Sample data for every Block: every field and option filled, so the
 * catalogue page (/dev/blocks), the tests and the screenshots show the
 * Block at its fullest. The compiler asks for one whenever a Block is added.
 */
export const samples: { [T in BlockType]: BlockOf<T> } = {
  hero: heroSample,
  searchHero: searchHeroSample,
  richText: richTextSample,
  callToAction: callToActionSample,
  featuredRentals: featuredRentalsSample,
  largeGroupRentals: largeGroupRentalsSample,
  rentalGrid: rentalGridSample,
  steps: stepsSample,
  features: featuresSample,
  amenities: amenitiesSample,
  stats: statsSample,
  imageText: imageTextSample,
  testimonials: testimonialsSample,
  trustStrip: trustStripSample,
  ownerBand: ownerBandSample,
  newsletter: newsletterSample,
  blogTeaser: blogTeaserSample,
  location: locationSample,
  faq: faqSample,
  form: formSample,
  container: containerSample,
}

/** The sample for a Block type. */
export function sampleFor<T extends BlockType>(blockType: T): BlockOf<T> {
  return samples[blockType]
}
