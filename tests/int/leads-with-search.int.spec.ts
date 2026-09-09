import { describe, expect, it } from 'vitest'

import { leadsWithSearch } from '@/blocks/Container/leadsWithSearch'

describe('leadsWithSearch', () => {
  it('finds the search block at the top level or first inside nested containers', () => {
    expect(leadsWithSearch(undefined)).toBe(false)
    expect(leadsWithSearch({ blockType: 'content' })).toBe(false)
    expect(leadsWithSearch({ blockType: 'availabilitySearch' })).toBe(true)
    expect(
      leadsWithSearch({
        blockType: 'container',
        blocks: [{ blockType: 'container2', blocks: [{ blockType: 'availabilitySearch' }] }],
      }),
    ).toBe(true)
    expect(
      leadsWithSearch({
        blockType: 'container',
        blocks: [{ blockType: 'content' }, { blockType: 'availabilitySearch' }],
      }),
    ).toBe(false)
  })
})
