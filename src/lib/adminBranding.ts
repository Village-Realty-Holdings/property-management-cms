import type { Media, Tenant } from '@/payload-types'

/**
 * What the admin panel shows as its brand. Awayday's own assets are the
 * fallback; a tenant resolved from the request hostname overrides each part
 * it has filled in.
 */
export type AdminBrand = {
  /** The name shown in the locked tenant badge and login copy. */
  name: string
  /** Wordmark for the login screen. */
  logoUrl: string
  /** Square mark for the nav. */
  iconUrl: string
  /** Hex colour driving buttons, focus rings and active nav links. */
  accent: string
  /** True when a tenant supplied the brand, false for the Awayday fallback. */
  isTenant: boolean
}

export const AWAYDAY_BRAND: AdminBrand = {
  name: 'Awayday',
  logoUrl: '/admin/awayday-logo.png',
  iconUrl: '/admin/awayday-favicon-192.png',
  accent: '#2d4447',
  isTenant: false,
}

export const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && HEX_COLOR.test(value)

/** Black or white, whichever reads better on the given hex colour. */
export const contrastFor = (hex: string): string => {
  const raw = hex.slice(1)
  const full = raw.length === 3 ? raw.replace(/./g, (c) => c + c) : raw
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!)
  return luminance > 0.4 ? '#000000' : '#ffffff'
}

const mediaUrl =(media: Media | null | number | undefined): null | string =>
  media && typeof media === 'object' && media.url ? media.url : null

export const brandFor = (tenant: null | Tenant | undefined): AdminBrand => {
  if (!tenant) return AWAYDAY_BRAND

  const branding = tenant.branding
  const accent = branding?.accentColor

  return {
    name: tenant.name,
    logoUrl: mediaUrl(branding?.logo) ?? AWAYDAY_BRAND.logoUrl,
    iconUrl: mediaUrl(branding?.icon) ?? AWAYDAY_BRAND.iconUrl,
    accent: isHexColor(accent) ? accent.toLowerCase() : AWAYDAY_BRAND.accent,
    isTenant: true,
  }
}
