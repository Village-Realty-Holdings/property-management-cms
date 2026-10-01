import type { CollectionConfig } from "payload"

import { Amenities } from "./Amenities"
import { CuratedLists } from "./CuratedLists"
import { Guides } from "./Guides"
import { Locations } from "./Locations"
import { Media } from "./Media"
import { Pages } from "./Pages"
import { Properties } from "./Properties"
import { PropertyTypes } from "./PropertyTypes"
import { Reviews } from "./Reviews"
import { SiteReaders } from "./SiteReaders"
import { Sites } from "./Sites"
import { Specials } from "./Specials"
import { Submissions } from "./Submissions"
import { Users } from "./Users"

/**
 * The admin nav, in order: each group lists its collections in nav order.
 * Payload orders nav groups by their first collection in `collections`, so
 * this order is the nav order. The group set here wins over any
 * `admin.group` in a collection file.
 */
// prettier-ignore
const navGroups: [group: string, collections: CollectionConfig[]][] = [
  ["Content", [Pages, Guides, CuratedLists, Media]],
  ["Inbox", [Submissions]],
  ["Properties", [Properties, Locations, Specials, Reviews, Amenities, PropertyTypes]],
  ["Settings", [Sites, Users, SiteReaders]],
]

/**
 * Every collection registered with Payload, grouped for the admin nav. Add a
 * new collection to one of the `navGroups` above. Site-scoped collections
 * must also be listed in src/tenancy.ts.
 */
export const collections: CollectionConfig[] = navGroups.flatMap(
  ([group, members]) =>
    members.map((collection) => ({
      ...collection,
      admin: { ...collection.admin, group },
    }))
)
