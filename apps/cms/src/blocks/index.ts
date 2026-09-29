import type { Block } from "payload"

import { Announcement } from "./Announcement"
import { Audience } from "./Audience"
import { CallToAction } from "./CallToAction"
import { Contact } from "./Contact"
import { CuratedListCards } from "./CuratedListCards"
import { FAQ } from "./FAQ"
import { Form } from "./form"
import { Hero } from "./Hero"
import { PropertyGrid } from "./PropertyGrid"
import { RichText } from "./RichText"

export {
  Announcement,
  Audience,
  CallToAction,
  Contact,
  CuratedListCards,
  FAQ,
  Hero,
  PropertyGrid,
  RichText,
}

/**
 * The Blocks a Page's `layout` can use, in the admin's "Add Block" order.
 * Block slugs (stored as `blockType`) and interfaceNames are apps/site's
 * contract: renaming one breaks stored Pages and the generated types.
 */
export const pageBlocks: Block[] = [
  Hero,
  RichText,
  PropertyGrid,
  CuratedListCards,
  CallToAction,
  FAQ,
  Form,
  // The Tuck-In Page Template's Blocks (src/pageTemplates).
  Announcement,
  Audience,
  Contact,
]
