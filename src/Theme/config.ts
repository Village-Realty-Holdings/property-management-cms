import type { CollectionConfig, Field, TextField } from 'payload'

import { FONT_OPTIONS, RADIUS_OPTIONS } from '@/lib/themeCss'
import { revalidateTheme } from './hooks/revalidateTheme'

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

const color = (name: string, label: string, description?: string): TextField => ({
  name,
  type: 'text',
  label,
  admin: { description, placeholder: '#1d4ed8', width: '50%' },
  validate: (value) => {
    if (!value) return true
    return HEX.test(String(value)) || 'Enter a hex colour such as #1d4ed8 or #fff.'
  },
})

/** Colour slots; empty slots fall back to the built-in palette. */
const palette = (): Field[] => [
  { type: 'row', fields: [color('background', 'Background'), color('foreground', 'Text')] },
  {
    type: 'row',
    fields: [
      color('primary', 'Primary', 'Buttons, links and other highlighted elements.'),
      color('primaryForeground', 'Text on primary'),
    ],
  },
  {
    type: 'row',
    fields: [color('secondary', 'Secondary'), color('secondaryForeground', 'Text on secondary')],
  },
  {
    type: 'row',
    fields: [
      color('accent', 'Accent', 'Hover states and subtle highlights.'),
      color('accentForeground', 'Text on accent'),
    ],
  },
  { type: 'row', fields: [color('border', 'Borders'), color('muted', 'Muted surfaces')] },
]

/**
 * One theme per tenant. The multi-tenant plugin marks this collection
 * `isGlobal`, so the admin shows it as a single document per tenant.
 * The frontend turns it into CSS custom properties; see `@/lib/themeCss`.
 */
export const Theme: CollectionConfig = {
  slug: 'theme',
  labels: { singular: 'Theme', plural: 'Theme' },
  access: {
    read: () => true,
  },
  admin: {
    group: 'Site',
    description: 'Colours, fonts and corner rounding for this site. Empty fields keep the default look.',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        { name: 'light', label: 'Colours', fields: palette() },
        {
          name: 'typography',
          label: 'Typography',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'bodyFont',
                  type: 'select',
                  label: 'Body font',
                  defaultValue: 'geist',
                  options: [...FONT_OPTIONS],
                  admin: { width: '50%' },
                },
                {
                  name: 'headingFont',
                  type: 'select',
                  label: 'Heading font',
                  defaultValue: 'geist',
                  options: [...FONT_OPTIONS],
                  admin: { width: '50%' },
                },
              ],
            },
          ],
        },
        {
          name: 'shape',
          label: 'Shape',
          fields: [
            {
              name: 'radius',
              type: 'select',
              label: 'Corner rounding',
              defaultValue: 'md',
              options: [...RADIUS_OPTIONS],
              admin: { description: 'Applies to buttons, cards, inputs and images.' },
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateTheme],
  },
}
