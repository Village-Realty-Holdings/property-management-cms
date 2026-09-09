'use client'

import { createContext, useContext, useMemo, useState } from 'react'

import type { CanvasStyles } from './canvasStyles'
import type { BlockSchema } from './schema'

/**
 * The add-block dialog's request channel. Kept apart from the dialog itself
 * so canvas affordances and action bars can ask for the picker without
 * importing the block components the dialog renders (which pull in admin UI
 * that unit tests cannot load).
 */

/** Puck's id for the root drop zone. */
export const ROOT_ZONE = 'root:default-zone'

export type PickedBlock = { type: string; props: Record<string, unknown> }

export type PickerRequest = {
  schemas: BlockSchema[]
  onPick: (block: PickedBlock) => void
  title?: string
  /** Depth of a container inserted here, used to keep presets within the limit. */
  containerDepth?: number
}

type PickerApi = {
  request: PickerRequest | null
  open: (request: PickerRequest) => void
  close: () => void
  canvasStyles: CanvasStyles
}

const noStyles: CanvasStyles = { links: [], inline: [], htmlClass: '' }

const PickerContext = createContext<PickerApi>({
  request: null,
  open: () => {},
  close: () => {},
  canvasStyles: noStyles,
})

export const useBlockPicker = () => useContext(PickerContext)

/** Wrap the Puck editor; exposes `open` to anything inside, canvas iframe included. */
export function BlockPickerProvider({
  canvasStyles,
  children,
}: {
  canvasStyles: CanvasStyles
  children: React.ReactNode
}) {
  const [request, setRequest] = useState<PickerRequest | null>(null)
  const api = useMemo<PickerApi>(
    () => ({ request, open: setRequest, close: () => setRequest(null), canvasStyles }),
    [request, canvasStyles],
  )
  return <PickerContext.Provider value={api}>{children}</PickerContext.Provider>
}
