import type { Block } from 'payload'

export const MediaBlock: Block = {
  slug: 'mediaBlock',
  interfaceName: 'MediaBlock',
  labels: {
    singular: 'Image or Video',
    plural: 'Images or Videos',
  },
  admin: {
    group: 'Content',
    images: {
      thumbnail: { url: '/admin/blocks/mediaBlock.svg', alt: 'Image or video' },
    },
  },
  fields: [
    {
      name: 'media',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: {
        description: 'The caption set on the media item is shown under it.',
      },
    },
  ],
}
