import type { Block } from "payload"

import { Amenities } from "./Amenities"
import { CallToAction } from "./CallToAction"
import { Features } from "./Features"
import { Hero } from "./Hero"
import { ImageText } from "./ImageText"
import { RichText } from "./RichText"
import { SearchHero } from "./SearchHero"
import { Stats } from "./Stats"
import { Steps } from "./Steps"
import { TrustStrip } from "./TrustStrip"

/** The Blocks a Page can use, in the order the Admin offers them. */
export const pageBlocks: Block[] = [
  Hero,
  SearchHero,
  RichText,
  CallToAction,
  Steps,
  Features,
  Amenities,
  Stats,
  ImageText,
  TrustStrip,
]
