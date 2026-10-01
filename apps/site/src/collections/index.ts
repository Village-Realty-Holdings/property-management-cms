import type { CollectionConfig } from "payload"

import { FontFiles } from "./FontFiles"
import { Fonts } from "./Fonts"
import { Layouts } from "./Layouts"
import { Media } from "./Media"
import { Pages } from "./Pages"
import { Users } from "./Users"

/** Every collection registered with Payload. */
// prettier-ignore
export const collections: CollectionConfig[] = [
  Pages,
  Layouts,
  Media,
  Fonts,
  FontFiles,
  Users,
]
