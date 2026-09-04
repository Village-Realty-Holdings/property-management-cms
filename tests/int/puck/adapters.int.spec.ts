import { describe, expect, it } from 'vitest'

import type { Media } from '@/payload-types'
import { defaultProps, layoutToPuck, normalizeRelations, puckToLayout, toRelationId, type LayoutBlock } from '@/puck/adapters'
import type { BlockSchema } from '@/puck/schema'

/**
 * The visual editor round-trips Payload's layout through Puck's data tree
 * without losing or inventing fields. Pure functions, no database.
 */

const media: Media = {
  id: 7,
  alt: 'Beach',
  url: '/api/media/file/beach.jpg',
  width: 1600,
  height: 900,
  createdAt: '2026-09-02T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
}

const schemas: BlockSchema[] = [
  {
    slug: 'gallery',
    label: 'Gallery',
    fields: [
      { kind: 'scalar', name: 'heading', label: 'Heading', type: 'text' },
      {
        kind: 'array',
        name: 'images',
        label: 'Images',
        fields: [
          { kind: 'relation', name: 'image', label: 'Image', type: 'upload', relationTo: 'media' },
          { kind: 'scalar', name: 'caption', label: 'Caption', type: 'text' },
        ],
      },
    ],
  },
  {
    slug: 'propertyListing',
    label: 'Property Listing',
    fields: [
      { kind: 'scalar', name: 'heading', label: 'Heading', type: 'text', defaultValue: 'Featured rentals' },
      {
        kind: 'group',
        name: 'query',
        label: 'Query',
        fields: [
          { kind: 'scalar', name: 'amenityIds', label: 'Amenities', type: 'text', hasMany: true },
          { kind: 'scalar', name: 'pets', label: 'Pets', type: 'checkbox' },
          { kind: 'scalar', name: 'limit', label: 'Limit', type: 'number', defaultValue: 6 },
        ],
      },
      { kind: 'relation', name: 'detailPage', label: 'Detail page', type: 'relationship', relationTo: 'pages' },
    ],
  },
  {
    slug: 'section',
    label: 'Section',
    fields: [
      { kind: 'relation', name: 'backgroundImage', label: 'Background', type: 'upload', relationTo: 'media' },
      {
        kind: 'blocks',
        name: 'main',
        label: 'Main',
        blocks: [
          {
            slug: 'mediaBlock',
            label: 'Media',
            fields: [{ kind: 'relation', name: 'media', label: 'Media', type: 'upload', relationTo: 'media' }],
          },
        ],
      },
    ],
  },
  {
    slug: 'faq',
    label: 'FAQ',
    fields: [
      {
        kind: 'array',
        name: 'items',
        label: 'Items',
        fields: [
          { kind: 'scalar', name: 'question', label: 'Question', type: 'text' },
          { kind: 'richText', name: 'answer', label: 'Answer' },
        ],
      },
    ],
  },
]

const richText = { root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Yes' }] }] } }

const layout = [
  {
    blockType: 'gallery',
    id: 'g1',
    blockName: 'Top gallery',
    heading: 'Photos',
    images: [
      { id: 'i1', image: media, caption: 'Sand' },
      { id: 'i2', image: 12, caption: null },
    ],
  },
  {
    blockType: 'propertyListing',
    id: 'p1',
    heading: 'Featured',
    query: { amenityIds: ['pool', 'pets'], pets: true, limit: 3 },
    detailPage: { id: 4, title: 'Stay', slug: 'stay' },
  },
  {
    blockType: 'section',
    id: 's1',
    backgroundImage: null,
    main: [{ blockType: 'mediaBlock', id: 'm1', media }],
  },
  {
    blockType: 'faq',
    id: 'f1',
    items: [{ id: 'q1', question: 'Pets?', answer: richText }],
  },
] as unknown as LayoutBlock[]

describe('layoutToPuck', () => {
  it('maps every block to a Puck item keyed by block slug, keeping its id and fields', () => {
    const data = layoutToPuck(layout)
    expect(data.content.map((c) => c.type)).toEqual(['gallery', 'propertyListing', 'section', 'faq'])
    expect(data.content[0].props).toMatchObject({ id: 'g1', blockName: 'Top gallery', heading: 'Photos' })
    expect(data.content[0].props).not.toHaveProperty('blockType')
    expect(data.zones).toEqual({})
  })

  it('invents an id when a block row has none', () => {
    const data = layoutToPuck([{ blockType: 'faq', items: [] } as unknown as LayoutBlock])
    expect(typeof data.content[0].props.id).toBe('string')
    expect(data.content[0].props.id.length).toBeGreaterThan(8)
  })

  it('handles an empty or missing layout', () => {
    expect(layoutToPuck([]).content).toEqual([])
    expect(layoutToPuck(null).content).toEqual([])
    expect(layoutToPuck(undefined).content).toEqual([])
  })
})

describe('puckToLayout', () => {
  it('round-trips the layout, reducing populated relations to ids everywhere the schema says', () => {
    const back = puckToLayout(layoutToPuck(layout), schemas) as unknown as Record<string, unknown>[]
    expect(back.map((b) => b.blockType)).toEqual(['gallery', 'propertyListing', 'section', 'faq'])
    expect(back[0]).toMatchObject({
      id: 'g1',
      blockName: 'Top gallery',
      images: [
        { id: 'i1', image: 7, caption: 'Sand' },
        { id: 'i2', image: 12, caption: null },
      ],
    })
    expect(back[1]).toMatchObject({ detailPage: 4, query: { amenityIds: ['pool', 'pets'], pets: true, limit: 3 } })
    expect(back[2]).toMatchObject({ backgroundImage: null, main: [{ blockType: 'mediaBlock', id: 'm1', media: 7 }] })
    expect(back[3]).toMatchObject({ items: [{ id: 'q1', question: 'Pets?', answer: richText }] })
  })

  it('is stable on a second round-trip', () => {
    const once = puckToLayout(layoutToPuck(layout), schemas)
    const twice = puckToLayout(layoutToPuck(once), schemas)
    expect(twice).toEqual(once)
  })

  it('rejects a component the schema does not know', () => {
    expect(() => puckToLayout({ content: [{ type: 'Hero', props: { id: 'x' } }] }, schemas)).toThrow(/Unknown visual editor component "Hero"/)
  })
})

describe('toRelationId', () => {
  it('accepts a populated doc, an id, a polymorphic value, or nothing', () => {
    expect(toRelationId(media)).toBe(7)
    expect(toRelationId(12)).toBe(12)
    expect(toRelationId('abc')).toBe('abc')
    expect(toRelationId({ relationTo: 'posts', value: { id: 9 } })).toEqual({ relationTo: 'posts', value: 9 })
    expect(toRelationId(null)).toBeNull()
    expect(toRelationId(undefined)).toBeNull()
    expect(toRelationId('')).toBeNull()
  })

  it('reduces hasMany relations to an id list', () => {
    const out = normalizeRelations(
      { tags: [media, 3, null] },
      [{ kind: 'relation', name: 'tags', label: 'Tags', type: 'relationship', relationTo: 'media', hasMany: true }],
    )
    expect(out.tags).toEqual([7, 3])
  })
})

describe('defaultProps', () => {
  it('uses literal defaults and sensible empties so a dropped block renders', () => {
    expect(defaultProps(schemas[1].fields)).toEqual({
      heading: 'Featured rentals',
      query: { amenityIds: [], pets: false, limit: 6 },
      detailPage: null,
    })
    expect(defaultProps(schemas[2].fields)).toEqual({ backgroundImage: null, main: [] })
  })
})
