import type { CollectionConfig } from 'payload'

import { generateHomePreviewPath } from '@/seo/generatePreviewPath'
import { revalidateSiteSettings } from './hooks/revalidateSiteSettings'

const socialPlatformOptions = [
  { label: 'Facebook', value: 'facebook' },
  { label: 'Instagram', value: 'instagram' },
  { label: 'X (Twitter)', value: 'twitter' },
  { label: 'LinkedIn', value: 'linkedin' },
  { label: 'YouTube', value: 'youtube' },
  { label: 'TikTok', value: 'tiktok' },
] as const

/**
 * One SiteSettings document per tenant. The multi-tenant plugin marks this
 * collection `isGlobal`, so the admin shows it as a single document per
 * tenant. This is the canonical source for site name/description used in SEO
 * metadata (see `@/seo/generateMeta`) — Header.brand and Footer.tagline stay
 * as their own display fields and no longer feed SEO output.
 */
export const SiteSettings: CollectionConfig = {
  slug: 'site-settings',
  labels: { singular: 'Site Settings', plural: 'Site Settings' },
  access: {
    read: () => true,
  },
  admin: {
    group: 'Site',
    livePreview: { url: generateHomePreviewPath },
    preview: (data, { req }) => generateHomePreviewPath({ data, req }),
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'general',
          label: 'General',
          fields: [
            {
              name: 'siteName',
              type: 'text',
              admin: {
                description: 'Used in page titles and search results, e.g. "Warren Beach Rentals".',
              },
            },
            {
              name: 'siteDescription',
              type: 'textarea',
              admin: {
                description: 'Fallback description for pages that don’t set their own, shown in search results.',
              },
            },
            {
              name: 'favicon',
              type: 'upload',
              relationTo: 'media',
              admin: { description: 'Shown in browser tabs and bookmarks. Square image recommended.' },
            },
          ],
        },
        {
          name: 'seo',
          label: 'SEO & Sharing',
          fields: [
            {
              name: 'defaultOgImage',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description: 'Used when a page shares to social media without its own image.',
              },
            },
            {
              name: 'metaTitleSuffix',
              type: 'text',
              admin: {
                description:
                  'Appended to every page title, e.g. " | Warren Beach Rentals". Leave empty to use the site name.',
              },
            },
            {
              name: 'noIndex',
              type: 'checkbox',
              label: 'Hide this site from search engines',
              admin: {
                description: 'Enable while staging or building the site. Turn off before launch.',
              },
            },
          ],
        },
        {
          name: 'social',
          label: 'Social',
          fields: [
            {
              name: 'socialLinks',
              type: 'array',
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'platform',
                      type: 'select',
                      options: [...socialPlatformOptions],
                      admin: { width: '50%' },
                    },
                    { name: 'url', type: 'text', admin: { width: '50%' } },
                  ],
                },
              ],
              admin: {
                initCollapsed: true,
                components: {
                  RowLabel: '@/SiteSettings/RowLabel#RowLabel',
                },
              },
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateSiteSettings],
  },
}
