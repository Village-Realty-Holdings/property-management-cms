import type { Block, BlockSlug } from 'payload'

import { Amenities } from './Amenities/config'
import { Archive } from './ArchiveBlock/config'
import { AreaGuide } from './AreaGuide/config'
import { AvailabilitySearch } from './AvailabilitySearch/config'
import { BookingSteps } from './BookingSteps/config'
import { CallToAction } from './CallToAction/config'
import { Container, nestedContainers } from './Container/config'
import { Content } from './Content/config'
import { FAQ } from './FAQ/config'
import { FormBlock } from './Form/config'
import { Gallery } from './Gallery/config'
import { Hero } from './Hero/config'
import { Location } from './Location/config'
import { MediaBlock } from './MediaBlock/config'
import { Newsletter } from './Newsletter/config'
import { OwnerCta } from './OwnerCta/config'
import { Pricing } from './Pricing/config'
import { Promos } from './Promos/config'
import { PropertyDetail } from './PropertyDetail/config'
import { PropertyListing } from './PropertyListing/config'
import { ReviewsFeed } from './ReviewsFeed/config'
import { Testimonials } from './Testimonials/config'

/**
 * Every page block, registered once in `config.blocks` and referenced by slug
 * from blocks fields. Slug references are what let a container hold
 * containers, and the multi-tenant plugin only copes with slug references,
 * not block objects, in `blockReferences`.
 */
export const pageBlocks: Block[] = [
  Container,
  Hero,
  Content,
  MediaBlock,
  CallToAction,
  FormBlock,
  Gallery,
  Amenities,
  Location,
  Pricing,
  Testimonials,
  FAQ,
  Archive,
  AvailabilitySearch,
  PropertyListing,
  PropertyDetail,
  ReviewsFeed,
  Promos,
  BookingSteps,
  OwnerCta,
  AreaGuide,
  Newsletter,
]

/** Slugs in picker order. */
export const pageBlockSlugs = pageBlocks.map((b) => b.slug as BlockSlug)

/** Everything `config.blocks` must know about, deeper container levels included. */
export const allBlocks: Block[] = [...pageBlocks, ...nestedContainers]
