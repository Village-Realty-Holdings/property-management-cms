import { cache } from "react"

import {
  getLocation,
  searchProperties,
  type LocationLevel,
  type LocationPage,
  type LocationRef,
} from "@workspace/content"

import type { Crumb } from "@workspace/site-views/site/breadcrumbs"

/** A Location page's URL: /areas/<root>/…/<slug> (ADR-0012). */
export const locationHref = (location: Pick<LocationRef, "path">) =>
  `/areas/${location.path.map(encodeURIComponent).join("/")}`

const levelNames: Record<LocationLevel, string> = {
  destination: "Destination",
  area: "Area",
  complex: "Complex",
}

/** "Destination", "Area" or "Complex"; null for a Location without a Level. */
export const levelName = (level: LocationLevel | null) =>
  level ? levelNames[level] : null

/**
 * Where a Location sits, e.g. "Area in Park City" or "Complex in Deer
 * Valley". Null for a root Location without a Level.
 */
export function placement(location: LocationPage): string | null {
  const parent = location.ancestors.at(-1)
  const level = levelName(location.level)
  if (level && parent) return `${level} in ${parent.name}`
  if (parent) return `In ${parent.name}`
  return level
}

/** Home › Areas › ancestors › the Location itself. */
export function locationCrumbs(location: LocationPage): Crumb[] {
  return [
    { label: "Home", href: "/" },
    { label: "Areas", href: "/areas" },
    ...location.ancestors.map((a) => ({
      label: a.name,
      href: locationHref(a),
    })),
    { label: location.name },
  ]
}

/** One request's Location, shared by generateMetadata and the page. */
export const loadLocation = cache((key: string) => getLocation(key.split("/")))

/** Properties per scan request (the REST adapter's maximum). */
const SCAN_PAGE_SIZE = 100
/** How many pages of Properties to scan for their Locations. */
const MAX_SCAN_PAGES = 50

/**
 * The slug paths of every Location that holds Active Properties, directly
 * or inside it (each Property's Location and its ancestors), unordered.
 * `@workspace/content` has no Location listing, so they are read off the
 * Properties' Location paths (like Home's Location links). Scans up to
 * MAX_SCAN_PAGES × SCAN_PAGE_SIZE Properties.
 */
export async function locationPathsInUse(): Promise<string[][]> {
  const scan = (page: number) =>
    searchProperties({ page, limit: SCAN_PAGE_SIZE, sort: "name" })
  const first = await scan(1)
  const rest = await Promise.all(
    Array.from(
      { length: Math.min(first.totalPages, MAX_SCAN_PAGES) - 1 },
      (_, i) => scan(i + 2)
    )
  )
  const paths = new Map<string, string[]>()
  for (const results of [first, ...rest]) {
    for (const property of results.docs) {
      const path = property.location?.path ?? []
      for (let depth = 1; depth <= path.length; depth++) {
        const prefix = path.slice(0, depth)
        paths.set(prefix.join("/"), prefix)
      }
    }
  }
  return [...paths.values()]
}

/**
 * The top-level Locations that have Active Properties, by name, loaded
 * with `getLocation`, each with only those child Locations that have
 * Properties too. Locations with no Properties anywhere under them are
 * left out (see `locationPathsInUse`).
 */
export async function listRootLocations(): Promise<LocationPage[]> {
  const paths = await locationPathsInUse()
  const inUse = new Set(paths.map((path) => path.join("/")))
  const locations = await Promise.all(
    paths.filter((path) => path.length === 1).map((root) => getLocation(root))
  )
  return locations
    .filter((location) => location !== null)
    .map((location) => ({
      ...location,
      children: location.children.filter((child) =>
        inUse.has(child.path.join("/"))
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
