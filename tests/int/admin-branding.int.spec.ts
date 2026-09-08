import { describe, expect, it } from 'vitest'

import type { Tenant } from '@/payload-types'

import { AWAYDAY_BRAND, brandFor, contrastFor, isHexColor } from '@/lib/adminBranding'

const tenant = (overrides: Partial<Tenant> = {}): Tenant => ({
  id: 1,
  name: 'Warren Beach',
  slug: 'warren-beach',
  createdAt: '',
  updatedAt: '',
  ...overrides,
})

describe('brandFor', () => {
  it('falls back to Awayday when there is no tenant', () => {
    expect(brandFor(null)).toBe(AWAYDAY_BRAND)
  })

  it('uses the tenant name but Awayday assets when branding is empty', () => {
    const brand = brandFor(tenant())

    expect(brand.name).toBe('Warren Beach')
    expect(brand.isTenant).toBe(true)
    expect(brand.logoUrl).toBe(AWAYDAY_BRAND.logoUrl)
    expect(brand.accent).toBe(AWAYDAY_BRAND.accent)
  })

  it('takes populated uploads and a valid accent from the tenant', () => {
    const brand = brandFor(
      tenant({
        branding: {
          logo: { id: 9, url: '/api/media/file/logo.png', createdAt: '', updatedAt: '' },
          icon: 7,
          accentColor: '#F6CE3E',
        },
      }),
    )

    expect(brand.logoUrl).toBe('/api/media/file/logo.png')
    // An unpopulated id carries no URL, so the fallback stays.
    expect(brand.iconUrl).toBe(AWAYDAY_BRAND.iconUrl)
    expect(brand.accent).toBe('#f6ce3e')
  })

  it('ignores an invalid accent colour', () => {
    expect(brandFor(tenant({ branding: { accentColor: 'teal' } })).accent).toBe(AWAYDAY_BRAND.accent)
  })
})

describe('colour helpers', () => {
  it('accepts three and six digit hex', () => {
    expect(isHexColor('#abc')).toBe(true)
    expect(isHexColor('#2D4447')).toBe(true)
    expect(isHexColor('2d4447')).toBe(false)
    expect(isHexColor('#2d44')).toBe(false)
  })

  it('picks readable text for dark and light accents', () => {
    expect(contrastFor('#2d4447')).toBe('#ffffff')
    expect(contrastFor('#f6ce3e')).toBe('#000000')
    expect(contrastFor('#fff')).toBe('#000000')
  })
})
