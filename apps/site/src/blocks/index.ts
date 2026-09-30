import type { Block } from "payload"

import { Amenities } from "./Amenities"
import { BlogTeaser } from "./BlogTeaser"
import { CallToAction } from "./CallToAction"
import { Faq } from "./Faq"
import { FeaturedRentals } from "./FeaturedRentals"
import { Features } from "./Features"
import { Form } from "./Form"
import { Hero } from "./Hero"
import { ImageText } from "./ImageText"
import { LargeGroupRentals } from "./LargeGroupRentals"
import { Location } from "./Location"
import { Newsletter } from "./Newsletter"
import { OwnerBand } from "./OwnerBand"
import { RentalGrid } from "./RentalGrid"
import { RichText } from "./RichText"
import { SearchHero } from "./SearchHero"
import { Stats } from "./Stats"
import { Steps } from "./Steps"
import { Testimonials } from "./Testimonials"
import { TrustStrip } from "./TrustStrip"

/** The Blocks a Page can use, in the order the Admin offers them. */
export const pageBlocks: Block[] = [
  Hero,
  SearchHero,
  RichText,
  CallToAction,
  FeaturedRentals,
  LargeGroupRentals,
  RentalGrid,
  Steps,
  Features,
  Amenities,
  Stats,
  ImageText,
  Testimonials,
  TrustStrip,
  OwnerBand,
  Newsletter,
  BlogTeaser,
  Location,
  Faq,
  Form,
]
