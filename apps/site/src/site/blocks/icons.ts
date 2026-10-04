/**
 * The icons users can pick for a Block, by their Lucide names. A curated
 * list for a vacation-rental Site, not the whole of Lucide: the Payload
 * config validates against it (`src/fields/icon.ts`), and `Icon` draws
 * only these, so the Site's bundle carries just these icons.
 *
 * Plain data, with no React import, so the Admin and the config can read it.
 * To add an icon, add its name here and its component to `Icon.tsx`: the
 * compiler and `Icon.test.tsx` fail until both agree.
 */
export const iconNames = [
  "wifi",
  "waves",
  "sun",
  "umbrella",
  "tree-palm",
  "car",
  "square-parking",
  "utensils",
  "coffee",
  "bath",
  "bed",
  "bed-double",
  "tv",
  "snowflake",
  "flame",
  "fan",
  "washing-machine",
  "paw-print",
  "baby",
  "dumbbell",
  "bike",
  "map-pin",
  "key",
  "shield-check",
  "sparkles",
  "star",
  "heart",
  "clock",
  "calendar",
  "phone",
  "mail",
  "users",
  "house",
  "check",
  "circle-check",
  "thumbs-up",
  "badge-check",
  "award",
  "handshake",
  "headphones",
  "message-circle",
  "credit-card",
  "wallet",
  "tag",
  "percent",
  "leaf",
  "mountain",
  "tent",
  "fish",
  "sailboat",
  "anchor",
  "plane",
  "bus",
  "luggage",
  "shopping-cart",
  "store",
  "wine",
  "beer",
  "cooking-pot",
  "refrigerator",
  "microwave",
  "flower",
  "trees",
  "sunrise",
  "sunset",
  "moon",
  "cloud-sun",
  "wind",
  "droplets",
  "thermometer",
  "lock",
  "eye",
  "globe",
  "compass",
  "lightbulb",
  "zap",
  "wrench",
  "shower-head",
  "sofa",
  "shirt",
  "gift",
  "camera",
  "binoculars",
  "footprints",
  "volleyball",
  "building-2",
  "smile",
  "accessibility",
  "cigarette-off",
] as const

export type IconName = (typeof iconNames)[number]

/** Whether `value` is on the list. */
export function isIconName(value: unknown): value is IconName {
  return (
    typeof value === "string" &&
    (iconNames as readonly string[]).includes(value)
  )
}
