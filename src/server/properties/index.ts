import type { PropertyProvider } from './types'

import { mockProvider } from './mock/provider'

export type * from './types'
export * from './format'

/**
 * The provider blocks read from. Only the mock exists for now; a Track or
 * Streamline adapter would be selected here by env and expose the same shape.
 */
export const getPropertyProvider = (): PropertyProvider => mockProvider
