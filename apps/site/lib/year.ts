import { cacheLife } from "next/cache"

/** The current year for "© <year>", cached so pages can still prerender. */
export async function currentYear(): Promise<number> {
  "use cache"
  cacheLife("days")
  return new Date().getFullYear()
}
