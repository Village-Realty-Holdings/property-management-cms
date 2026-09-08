'use client'

import { createContext, useContext, useMemo, useState } from 'react'

import type { CanvasStyles } from './canvasStyles'
import type { BlockSchema } from './schema'

/**
 * The add-block dialog's request channel. Kept apart from the dialog itself
 * so sidebar fields can ask for the picker without importing the block
 * components the dialog renders (which pull in admin UI that unit tests
 * cannot load).
 */

/** Puck's id for the root drop zone. */
export const ROOT_ZONE = 'root:default-zone'

export type PickedBlock = { type: string; props: Record<string, unknown> }

export type PickerRequest = {
  schemas: BlockSchema[]
  onPick: (block: PickedBlock) => void
  title?: string
}

export type PickerState = { kind: 'root'; index: number } | { kind: 'custom'; request: PickerRequest } | null

type PickerApi = {
  state: PickerState
  /** Open for the root zone; the dialog inserts at `index` itself. */
  openAtRoot: (index: number) => void
  /** Open with any block list and handle the pick yourself. */
  open: (request: PickerRequest) => void
  close: () => void
  canvasStyles: CanvasStyles
}

const noStyles: CanvasStyles = { links: [], inline: [], htmlClass: '' }

const PickerContext = createContext<PickerApi>({
  state: null,
  openAtRoot: () => {},
  open: () => {},
  close: () => {},
  canvasStyles: noStyles,
})

export const useBlockPicker = () => useContext(PickerContext)

/** Wrap the Puck editor; exposes `open` and `openAtRoot` to anything inside. */
export function BlockPickerProvider({
  canvasStyles,
  children,
}: {
  canvasStyles: CanvasStyles
  children: React.ReactNode
}) {
  const [state, setState] = useState<PickerState>(null)
  const api = useMemo<PickerApi>(
    () => ({
      state,
      openAtRoot: (index) => setState({ kind: 'root', index }),
      open: (request) => setState({ kind: 'custom', request }),
      close: () => setState(null),
      canvasStyles,
    }),
    [state, canvasStyles],
  )
  return <PickerContext.Provider value={api}>{children}</PickerContext.Provider>
}
