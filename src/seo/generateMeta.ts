import type { Metadata } from 'next'

import type { Media, Page, Post, Config } from '../payload-types'

import { mergeOpenGraph } from './mergeOpenGraph'
import { getServerSideURL } from '@/lib/getURL'
import { getTenantGlobal } from '@/server/getGlobals'

const getImageURL = (image?: Media | Config['db']['defaultIDType'] | null) => {
  if (!image || typeof image !== 'object' || !('url' in image)) return undefined
  const serverUrl = getServerSideURL()
  const ogUrl = image.sizes?.og?.url
  return ogUrl ? serverUrl + ogUrl : serverUrl + image.url
}

/** The site name and description the tenant set in its header and footer. */
export const getSiteMeta = async () => {
  const [header, footer] = await Promise.all([getTenantGlobal('header', 0), getTenantGlobal('footer', 0)])
  return { name: header?.brand ?? null, description: footer?.tagline ?? null }
}

export const generateMeta = async (args: {
  doc: Partial<Page> | Partial<Post> | null
}): Promise<Metadata> => {
  const { doc } = args
  const site = await getSiteMeta()

  const ogImage = getImageURL(doc?.meta?.image)
  const pageTitle = doc?.meta?.title || doc?.title
  const title = [pageTitle, site.name].filter(Boolean).join(' | ') || undefined
  const description = doc?.meta?.description || site.description || undefined

  return {
    title,
    description,
    openGraph: mergeOpenGraph(site, {
      title,
      description,
      images: ogImage ? [{ url: ogImage }] : undefined,
      url: Array.isArray(doc?.slug) ? doc?.slug.join('/') : '/',
    }),
  }
}
