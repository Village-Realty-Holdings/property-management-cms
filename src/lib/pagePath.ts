/** Path of a page relationship, or null when it is unset or unpopulated. */
export const pagePath = (page: unknown): string | null => {
  if (!page || typeof page !== 'object' || !('slug' in page)) return null
  const slug = (page as { slug?: string | null }).slug
  if (!slug) return null
  return slug === 'home' ? '/' : `/${slug}`
}
