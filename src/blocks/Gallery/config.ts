import type { Block } from 'payload'

export const Gallery: Block = {
  slug: 'gallery',
  interfaceName: 'GalleryBlock',
  labels: {
    singular: 'Gallery',
    plural: 'Galleries',
  },
  admin: {
    group: 'Property',
    images: {
      thumbnail: '/admin/blocks/gallery.svg',
    },
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      defaultValue: 'Photos',
      admin: {
        description: 'Optional title shown above the images.',
      },
    },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'grid',
      options: [
        { label: 'Grid', value: 'grid' },
        { label: 'Masonry', value: 'masonry' },
        { label: 'Strip (horizontal scroll)', value: 'strip' },
      ],
      admin: {
        description:
          'Grid keeps images in even rows (first image is larger with 5+ images). Masonry stacks by height. Strip scrolls sideways.',
      },
    },
    {
      name: 'images',
      type: 'array',
      minRows: 1,
      admin: {
        initCollapsed: false,
        components: {
          RowLabel: '@/blocks/Gallery/RowLabel#RowLabel',
        },
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'caption',
          type: 'text',
          admin: {
            description: 'Short caption shown under the image.',
          },
        },
      ],
    },
  ],
}
