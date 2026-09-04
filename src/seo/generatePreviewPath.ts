import { PreviewSearchParams } from '@/app/(frontend)/next/preview/route'
import { PayloadRequest, CollectionSlug } from 'payload'

import { isSuperAdminUser } from '@/access/isSuperAdmin'

const collectionPrefixMap: Partial<Record<CollectionSlug, string>> = {
  posts: '/posts',
  pages: '',
}

type Props = {
  collection: keyof typeof collectionPrefixMap
  slug: string
  req: PayloadRequest
  /** The document being previewed; its `tenant` decides which site is shown. */
  data?: { tenant?: unknown } | null
}

const idOf = (value: unknown): string | null =>
  typeof value === 'object' && value !== null && 'id' in value
    ? String((value as { id: unknown }).id)
    : value == null
      ? null
      : String(value)

/**
 * The tenant the preview should render, or null when the user only has one
 * tenant. The frontend picks a tenant by hostname, which is wrong for anyone
 * who can edit several tenants from the same admin host; for them the preview
 * URL carries the document's tenant explicitly.
 */
const previewTenant = (req: PayloadRequest, data?: { tenant?: unknown } | null): string | null => {
  const user = req.user
  if (!user) return null
  const manyTenants = isSuperAdminUser(user) || ('tenants' in user && (user.tenants?.length ?? 0) > 1)
  if (!manyTenants) return null
  return idOf(data?.tenant)
}

const buildPreviewUrl = (path: string, tenant: string | null) => {
  const params: PreviewSearchParams = {
    path,
    previewSecret: process.env.PREVIEW_SECRET || '',
  }
  if (tenant) params.tenant = tenant
  return `/next/preview?${new URLSearchParams(params).toString()}`
}

export const generatePreviewPath = ({ collection, slug, req, data }: Props) => {
  if (slug === undefined || slug === null) {
    return null
  }

  // Encode to support slugs with special characters
  const encodedSlug = encodeURIComponent(slug)

  return buildPreviewUrl(`${collectionPrefixMap[collection]}/${encodedSlug}`, previewTenant(req, data))
}

/**
 * Preview URL for documents that have no page of their own (header, footer,
 * theme). They are shown on the home page.
 */
export const generateHomePreviewPath = ({
  data,
  req,
}: {
  data?: { tenant?: unknown } | null
  req: PayloadRequest
}) => buildPreviewUrl('/', previewTenant(req, data))
