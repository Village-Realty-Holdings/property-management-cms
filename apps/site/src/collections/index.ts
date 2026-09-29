import type { CollectionConfig } from "payload"

import { Media } from "./Media"
import { Pages } from "./Pages"
import { Users } from "./Users"

/** Every collection registered with Payload. */
// prettier-ignore
export const collections: CollectionConfig[] = [
  Pages,
  Media,
  Users,
]
