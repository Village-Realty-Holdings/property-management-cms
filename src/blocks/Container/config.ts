import type { Block, BlockSlug } from 'payload'

/**
 * The structural building block. A container lays out its children in a
 * column or a row and carries the width, padding and background that used to
 * live on Section. Containers nest, so page structure is built from
 * containers and content blocks are placed inside them.
 *
 * Payload 3 cannot describe a block that contains itself (its admin schema
 * map recurses without a guard), so nesting is modelled as four identical
 * blocks, `container` … `container4`, each allowing the next level in its
 * `blocks` field. The visual editor shows them all as one "Container" and
 * picks the slug by depth when saving; the site renders them all the same.
 */

export const MAX_CONTAINER_DEPTH = 4

/** Slug of the container block at nesting depth 1..MAX_CONTAINER_DEPTH. */
export const containerSlugAt = (depth: number): string => (depth <= 1 ? 'container' : `container${depth}`)

export const containerSlugs = Array.from({ length: MAX_CONTAINER_DEPTH }, (_, i) => containerSlugAt(i + 1))

export const isContainerSlug = (slug: string | null | undefined): boolean => Boolean(slug && containerSlugs.includes(slug))

/** Content blocks a container may hold at any depth. */
export const containerContentSlugs = [
  'content',
  'mediaBlock',
  'cta',
  'formBlock',
  'gallery',
  'amenities',
  'location',
  'pricing',
  'testimonials',
  'faq',
  'archive',
  'availabilitySearch',
  'propertyListing',
  'propertyDetail',
  'reviewsFeed',
  'promos',
  'bookingSteps',
  'ownerCta',
  'areaGuide',
  'newsletter',
] as const

const makeContainer = (depth: number): Block => ({
  slug: containerSlugAt(depth),
  interfaceName: depth === 1 ? 'ContainerBlock' : `Container${depth}Block`,
  labels: { singular: 'Container', plural: 'Containers' },
  admin: {
    group: 'Structure',
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'direction',
          type: 'select',
          defaultValue: 'column',
          options: [
            { label: 'Stack (column)', value: 'column' },
            { label: 'Side by side (row)', value: 'row' },
          ],
          admin: { description: 'Rows wrap to a column on small screens.', width: '50%' },
        },
        {
          name: 'gap',
          type: 'select',
          defaultValue: 'md',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Small', value: 'sm' },
            { label: 'Medium', value: 'md' },
            { label: 'Large', value: 'lg' },
          ],
          admin: { width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'align',
          type: 'select',
          defaultValue: 'stretch',
          label: 'Align items',
          options: [
            { label: 'Stretch', value: 'stretch' },
            { label: 'Start', value: 'start' },
            { label: 'Center', value: 'center' },
            { label: 'End', value: 'end' },
          ],
          admin: { width: '50%' },
        },
        {
          name: 'justify',
          type: 'select',
          defaultValue: 'start',
          label: 'Distribute',
          options: [
            { label: 'Start', value: 'start' },
            { label: 'Center', value: 'center' },
            { label: 'End', value: 'end' },
            { label: 'Space between', value: 'between' },
          ],
          admin: { width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'width',
          type: 'select',
          defaultValue: 'container',
          options: [
            { label: 'Container', value: 'container' },
            { label: 'Wide', value: 'wide' },
            { label: 'Full width', value: 'full' },
          ],
          admin: { description: 'Only the outermost container needs a width; nested ones fill their parent.', width: '50%' },
        },
        {
          name: 'padding',
          type: 'select',
          defaultValue: 'none',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Small', value: 'sm' },
            { label: 'Medium', value: 'md' },
            { label: 'Large', value: 'lg' },
          ],
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'background',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Muted', value: 'muted' },
        { label: 'Surface (card)', value: 'surface' },
        { label: 'Image', value: 'image' },
      ],
    },
    {
      name: 'backgroundImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Shown behind the container when Background is set to Image.',
        condition: (_data, siblingData) => siblingData?.background === 'image',
      },
    },
    {
      name: 'blocks',
      type: 'blocks',
      label: 'Blocks',
      blocks: [],
      blockReferences: [
        ...(depth < MAX_CONTAINER_DEPTH ? [containerSlugAt(depth + 1)] : []),
        ...containerContentSlugs,
      ] as BlockSlug[],
      admin: { initCollapsed: false, description: 'Content blocks and containers inside this one.' },
    },
  ],
})

/** Depth 1, the one pages reference directly. */
export const Container: Block = makeContainer(1)

/** Depths 2..MAX, referenced only from the level above. */
export const nestedContainers: Block[] = containerSlugs.slice(1).map((_, i) => makeContainer(i + 2))
