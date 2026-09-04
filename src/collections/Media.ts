import type { CollectionConfig } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'

export const Media: CollectionConfig = {
  slug: 'media',
  folders: true,
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      //required: true,
    },
    {
      name: 'caption',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()]
        },
      }),
    },
  ],
  upload: {
    // Files are stored in R2 (see `r2Storage` in payload.config.ts), so there
    // is no `staticDir`. Only the original is kept: `sharp` does not run on
    // Cloudflare Workers, so there are no `imageSizes`, and cropping / focal
    // point need it too. `next/image` resizes at render time through the
    // Cloudflare Images binding instead.
    crop: false,
    focalPoint: false,
  },
}
