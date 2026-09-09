import { isContainerSlug } from './config'

type Block = { blockType?: string | null; blocks?: unknown }

/**
 * Whether a block is the search block, or a chain of containers whose first
 * child is. A search nested in a container still overlaps the hero above it.
 */
export function leadsWithSearch(block: Block | undefined): boolean {
  if (!block?.blockType) return false
  if (block.blockType === 'availabilitySearch') return true
  if (!isContainerSlug(block.blockType)) return false
  return Array.isArray(block.blocks) && leadsWithSearch(block.blocks[0] as Block | undefined)
}
