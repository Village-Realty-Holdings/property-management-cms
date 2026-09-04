import type { PayloadRequest } from 'payload'
import { getPayload } from 'payload'

import { cookies, draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

import configPromise from '@payload-config'
import { isSuperAdminUser } from '@/access/isSuperAdmin'
import { PREVIEW_TENANT_COOKIE } from '@/server/getTenant'

export type PreviewSearchParams = {
  path: string
  previewSecret: string
  /** Tenant id to render; only honoured for users who can access that tenant. */
  tenant?: string
}

const tenantIdsOf = (user: { tenants?: { tenant: number | { id: number } }[] | null }) =>
  (user.tenants ?? []).map(({ tenant }) => String(typeof tenant === 'object' ? tenant.id : tenant))

export async function GET(req: NextRequest): Promise<Response> {
  const payload = await getPayload({ config: configPromise })

  const { searchParams } = new URL(req.url)

  const path = searchParams.get('path')
  const previewSecret = searchParams.get('previewSecret')

  if (previewSecret !== process.env.PREVIEW_SECRET) {
    return new Response('You are not allowed to preview this page', { status: 403 })
  }

  if (!path) {
    return new Response('Insufficient search params', { status: 404 })
  }

  if (!path.startsWith('/')) {
    return new Response('This endpoint can only be used for relative previews', { status: 500 })
  }

  let user

  try {
    const authResult = await payload.auth({
      req: req as unknown as PayloadRequest,
      headers: req.headers,
    })
    user = authResult.user
  } catch (error) {
    payload.logger.error({ err: error }, 'Error verifying token for live preview')
    return new Response('You are not allowed to preview this page', { status: 403 })
  }

  const draft = await draftMode()

  if (!user) {
    draft.disable()
    return new Response('You are not allowed to preview this page', { status: 403 })
  }

  const tenant = searchParams.get('tenant')
  const cookieStore = await cookies()

  if (tenant) {
    const allowed = isSuperAdminUser(user) || ('tenants' in user && tenantIdsOf(user).includes(tenant))
    if (!allowed) {
      draft.disable()
      return new Response('You are not allowed to preview this tenant', { status: 403 })
    }
    cookieStore.set(PREVIEW_TENANT_COOKIE, tenant, { httpOnly: true, sameSite: 'lax', path: '/' })
  } else {
    cookieStore.delete(PREVIEW_TENANT_COOKIE)
  }

  draft.enable()

  redirect(path)
}
