import type { Block, Field } from 'payload'
import { describe, expect, it } from 'vitest'

import { blocksToSchema, fieldsToSchema, findBlocksField, humanize, labelOf } from '@/puck/schema'
import { parseCanvasStyles } from '@/puck/canvasStyles'

/** The block schema is derived from Payload field configs, not written by hand. */

describe('fieldsToSchema', () => {
  it('flattens rows, collapsibles and unnamed tabs, and keeps named tabs as groups', () => {
    const fields: Field[] = [
      { type: 'row', fields: [{ name: 'a', type: 'text' }, { name: 'b', type: 'number', min: 1, max: 4 }] },
      { type: 'collapsible', label: 'More', fields: [{ name: 'c', type: 'checkbox', defaultValue: true }] },
      {
        type: 'tabs',
        tabs: [
          { label: 'Plain', fields: [{ name: 'd', type: 'textarea' }] },
          { name: 'meta', label: 'Meta', fields: [{ name: 'e', type: 'text' }] },
        ],
      },
    ]
    expect(fieldsToSchema(fields)).toEqual([
      { kind: 'scalar', name: 'a', label: 'A', type: 'text', defaultValue: undefined },
      { kind: 'scalar', name: 'b', label: 'B', type: 'number', min: 1, max: 4, defaultValue: undefined },
      { kind: 'scalar', name: 'c', label: 'C', type: 'checkbox', defaultValue: true },
      { kind: 'scalar', name: 'd', label: 'D', type: 'textarea', defaultValue: undefined },
      { kind: 'group', name: 'meta', label: 'Meta', fields: [{ kind: 'scalar', name: 'e', label: 'E', type: 'text', defaultValue: undefined }] },
    ])
  })

  it('describes choices, relations, rich text, arrays, groups and nested blocks', () => {
    const inner: Block = { slug: 'inner', fields: [{ name: 'media', type: 'upload', relationTo: 'media' }] }
    const fields: Field[] = [
      { name: 'view', type: 'select', defaultValue: 'grid', options: [{ label: 'Grid', value: 'grid' }, 'carousel'] },
      { name: 'types', type: 'select', hasMany: true, options: ['condo', 'house'] },
      { name: 'source', type: 'radio', options: [{ label: 'Filter', value: 'query' }] },
      { name: 'image', type: 'upload', relationTo: 'media' },
      { name: 'page', type: 'relationship', relationTo: 'pages' },
      { name: 'related', type: 'relationship', relationTo: ['posts'], hasMany: true },
      { name: 'body', type: 'richText' },
      { name: 'ids', type: 'text', hasMany: true },
      { name: 'items', type: 'array', minRows: 1, maxRows: 3, fields: [{ name: 'q', type: 'text' }] },
      { name: 'query', type: 'group', fields: [{ name: 'limit', type: 'number', defaultValue: () => 6 }] },
      { name: 'main', type: 'blocks', blocks: [inner] },
      { name: 'ui', type: 'ui', admin: { components: {} } },
    ]
    const schema = fieldsToSchema(fields)
    expect(schema.map((f) => [f.kind, f.name])).toEqual([
      ['choice', 'view'],
      ['choice', 'types'],
      ['choice', 'source'],
      ['relation', 'image'],
      ['relation', 'page'],
      ['relation', 'related'],
      ['richText', 'body'],
      ['scalar', 'ids'],
      ['array', 'items'],
      ['group', 'query'],
      ['blocks', 'main'],
    ])
    expect(schema[0]).toMatchObject({
      type: 'select',
      hasMany: false,
      defaultValue: 'grid',
      options: [
        { label: 'Grid', value: 'grid' },
        { label: 'Carousel', value: 'carousel' },
      ],
    })
    expect(schema[1]).toMatchObject({ hasMany: true })
    expect(schema[5]).toMatchObject({ relationTo: ['posts'], hasMany: true })
    expect(schema[7]).toMatchObject({ hasMany: true })
    expect(schema[8]).toMatchObject({ minRows: 1, maxRows: 3, fields: [{ name: 'q' }] })
    // Function defaults need a request; they are dropped rather than called.
    expect(schema[9]).toMatchObject({ fields: [{ name: 'limit', defaultValue: undefined }] })
    expect(schema[10]).toMatchObject({ blocks: [{ slug: 'inner', label: 'Inner', fields: [{ kind: 'relation', name: 'media' }] }] })
  })
})

describe('blocksToSchema', () => {
  it('takes the singular label and admin group from each block', () => {
    const block: Block = {
      slug: 'propertyListing',
      labels: { singular: 'Property Listing', plural: 'Property Listings' },
      admin: { group: 'Property' },
      fields: [{ name: 'heading', type: 'text' }],
    }
    expect(blocksToSchema([block])).toEqual([
      { slug: 'propertyListing', label: 'Property Listing', group: 'Property', fields: [{ kind: 'scalar', name: 'heading', label: 'Heading', type: 'text', defaultValue: undefined }] },
    ])
  })
})

describe('findBlocksField', () => {
  it('finds the layout blocks inside the Pages tabs', () => {
    const block: Block = { slug: 'x', fields: [] }
    const fields: Field[] = [
      { name: 'title', type: 'text' },
      { type: 'tabs', tabs: [{ label: 'Content', fields: [{ name: 'layout', type: 'blocks', blocks: [block] }] }] },
    ]
    expect(findBlocksField(fields, 'layout')).toEqual([block])
    expect(findBlocksField(fields, 'other')).toBeNull()
  })
})

describe('labels', () => {
  it('humanizes camelCase names and reads locale maps', () => {
    expect(humanize('backgroundImage')).toBe('Background Image')
    expect(labelOf(undefined, 'emptyMessage')).toBe('Empty Message')
    expect(labelOf({ en: 'Heading', es: 'Título' }, 'heading')).toBe('Heading')
    expect(labelOf(false, 'slug')).toBe('Slug')
  })
})

describe('parseCanvasStyles', () => {
  it('extracts stylesheet links, inline styles and the html class', () => {
    const html = `<html class="geist_a1 theme_b2"><head>
      <link rel="stylesheet" href="/_next/static/css/app.css"/>
      <link rel="stylesheet" href="https://fonts.example/x.css">
      <link rel="icon" href="/favicon.ico"/>
      <style>html:root{--primary:#123}</style>
      <style></style>
    </head><body></body></html>`
    expect(parseCanvasStyles(html, 'http://localhost:3002')).toEqual({
      links: ['http://localhost:3002/_next/static/css/app.css', 'https://fonts.example/x.css'],
      inline: ['html:root{--primary:#123}'],
      htmlClass: 'geist_a1 theme_b2',
    })
  })
})
