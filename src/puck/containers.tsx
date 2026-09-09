'use client'

import { useCallback, useEffect, useRef } from 'react'

import { registerOverlayPortal, type SlotComponent } from '@puckeditor/core'

import { ContainerBlock } from '@/blocks/Container/Component'
import { isContainerSlug, MAX_CONTAINER_DEPTH } from '@/blocks/Container/config'

import { containerDepth, defaultProps, newId, PLACEHOLDER_ID_PREFIX } from './adapters'
import { type PickedBlock, useBlockPicker } from './pickerContext'
import type { BlockSchema } from './schema'
import { usePuckSelector as usePuck } from './usePuck'

/**
 * The container block on the canvas and the editor behaviour around it.
 *
 * Structure is built from containers: a page always ends with an empty one
 * (added while editing, dropped on save), an empty container offers to add a
 * block into it, and a selected container's action bar can add more. Presets
 * are containers pre-filled with nested containers, the way column layouts
 * are set up in Elementor.
 */

export const CONTAINER = 'container'

/** Zone id of a container's slot, the form Puck's insert action expects. */
export const containerZone = (id: string) => `${id}:blocks`

/** Schemas a container may hold, resolved against the full list so each carries its fields. */
export function containerChildSchemas(schemas: BlockSchema[], depth = 1): BlockSchema[] {
  const container = schemas.find((s) => s.slug === CONTAINER)
  const slot = container?.fields.find((f) => f.kind === 'blocks')
  const allowed = new Set(
    slot?.kind === 'blocks'
      ? slot.blocks.map((b) => (isContainerSlug(b.slug) ? CONTAINER : b.slug))
      : [],
  )
  return schemas.filter(
    (s) => allowed.has(s.slug) && (s.slug !== CONTAINER || depth < MAX_CONTAINER_DEPTH),
  )
}

function useContainerDepth(id: string) {
  return usePuck((s) => {
    if (!id || !s.getSelectorForId(id)) return 1
    let depth = 1
    let parent = s.getParentById(id)
    while (parent) {
      if (parent.type === CONTAINER) depth++
      parent = s.getParentById(parent.props.id)
    }
    return depth
  })
}

/** Opens the picker for a container and inserts the pick at the end of its slot. */
export function useAddToContainer(containerId: string, schemas: BlockSchema[]) {
  const { open } = useBlockPicker()
  const depth = useContainerDepth(containerId)
  const dispatch = usePuck((s) => s.dispatch)
  const count = usePuck((s) => {
    if (!containerId || !s.getSelectorForId(containerId)) return 0
    const item = s.getItemById(containerId) as { props?: { blocks?: unknown[] } } | undefined
    return item?.props?.blocks?.length ?? 0
  })
  return useCallback(() => {
    const zone = containerZone(containerId)
    open({
      schemas: containerChildSchemas(schemas, depth),
      containerDepth: depth + 1,
      title: 'Add to container',
      onPick: ({ type, props }: PickedBlock) => {
        const id = newId()
        dispatch({
          type: 'insert',
          componentType: type,
          destinationIndex: count,
          destinationZone: zone,
          id,
        })
        dispatch({
          type: 'replace',
          destinationIndex: count,
          destinationZone: zone,
          data: { type, props: { ...props, id } },
        })
        dispatch({ type: 'setUi', ui: { itemSelector: { index: count, zone } } })
      },
    })
  }, [containerId, count, depth, dispatch, open, schemas])
}

/** A container as Puck renders it: its slot as the body, plus an add affordance when empty. */
export function ContainerOnCanvas({
  id,
  props,
  schemas,
  slot: Slot,
}: {
  id: string
  props: Record<string, unknown>
  schemas: BlockSchema[]
  slot: SlotComponent
}) {
  const nested = usePuck((s) => !s.appState.data.content.some((item) => item.props.id === id))
  const dragging = usePuck((s) => s.appState.ui.isDragging)
  const depth = useContainerDepth(id)
  const empty = usePuck((s) => {
    if (!s.getSelectorForId(id)) return true
    const item = s.getItemById(id) as { props?: { blocks?: unknown[] } } | undefined
    return !(item?.props?.blocks?.length ?? 0)
  })
  const add = useAddToContainer(id, schemas)
  return (
    <ContainerBlock
      {...(props as object)}
      blockType={CONTAINER}
      blocks={undefined}
      className={empty ? 'min-h-24' : undefined}
      nested={nested}
      slot={(className) => (
        <div className="relative">
          <Slot
            className={className}
            minEmptyHeight={empty ? 112 : 0}
            disallow={depth >= MAX_CONTAINER_DEPTH ? [CONTAINER] : []}
          />
          {empty && !dragging && (
            <button
              className="absolute inset-0 flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground hover:border-primary hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                add()
              }}
              // Puck's selection overlay sits over the block; this lets the button take the click.
              ref={(el) => registerOverlayPortal(el)}
              type="button"
            >
              <span aria-hidden className="text-2xl leading-none">
                +
              </span>
              <span>Add a block{nested ? '' : ' or a layout'}</span>
            </button>
          )}
        </div>
      )}
    />
  )
}

export const TOO_DEEP_MESSAGE = `Containers can only nest ${MAX_CONTAINER_DEPTH} levels deep`

/**
 * Undoes a drop that nests containers too deep. The drop zone's `disallow`
 * only knows the dragged item's type, not how deep its own subtree goes, so a
 * two-level subtree can land in a level-3 container. Rather than leave the
 * page unsaveable, the tree goes back to the last valid one.
 */
export function RejectDeepNesting({ onReject }: { onReject: (message: string) => void }) {
  const content = usePuck((s) => s.appState.data.content)
  const dispatch = usePuck((s) => s.dispatch)
  const lastValid = useRef(content)
  useEffect(() => {
    if (containerDepth(content) <= MAX_CONTAINER_DEPTH) {
      lastValid.current = content
      return
    }
    const content_ = lastValid.current
    dispatch({
      type: 'setData',
      recordHistory: false,
      data: (previous) => ({ ...previous, content: content_ }),
    })
    onReject(TOO_DEEP_MESSAGE)
  }, [content, dispatch, onReject])
  return null
}

/**
 * Keeps one empty container at the end of the page while editing. It is the
 * place to click to keep building; `puckToLayout` drops it on save.
 */
export function EnsureTrailingContainer() {
  const content = usePuck((s) => s.appState.data.content)
  const defaults = usePuck((s) => s.config.components[CONTAINER].defaultProps)
  const dispatch = usePuck((s) => s.dispatch)
  useEffect(() => {
    const isPlaceholder = (item: (typeof content)[number] | undefined) =>
      item?.type === CONTAINER &&
      item.props.id.startsWith(PLACEHOLDER_ID_PREFIX) &&
      !(Array.isArray(item.props.blocks) && item.props.blocks.length > 0)
    if (isPlaceholder(content.at(-1))) return
    dispatch({
      type: 'setData',
      recordHistory: false,
      data: (previous) => {
        // Check the current store, not the effect's snapshot: Strict Mode and
        // schema resolution can both request the same trailing placeholder.
        if (isPlaceholder(previous.content.at(-1))) return previous
        return {
          ...previous,
          content: [
            ...previous.content,
            {
              type: CONTAINER,
              props: { ...defaults, id: `${PLACEHOLDER_ID_PREFIX}${newId()}`, blocks: [] },
            },
          ],
        }
      },
    })
  }, [content, defaults, dispatch])
  return null
}

/* ---------- presets ---------- */

export type Preset = {
  key: string
  label: string
  description: string
  /** Props in Puck's format (nested containers as slot items). */
  build: (containerSchema: BlockSchema) => Record<string, unknown>
}

const column = (schema: BlockSchema, extra: Record<string, unknown> = {}) => ({
  type: CONTAINER,
  props: { ...defaultProps(schema.fields), id: newId(), blocks: [], ...extra },
})

const row = (schema: BlockSchema, columns: number, extra: Record<string, unknown> = {}) => ({
  ...defaultProps(schema.fields),
  direction: 'row',
  blocks: Array.from({ length: columns }, () => column(schema, extra)),
})

export const containerPresets: Preset[] = [
  {
    key: 'two-columns',
    label: 'Two columns',
    description: 'Two equal columns side by side.',
    build: (schema) => row(schema, 2),
  },
  {
    key: 'media-text',
    label: 'Media + text',
    description: 'Two columns, vertically centred, for an image beside copy.',
    build: (schema) => ({ ...row(schema, 2), align: 'center' }),
  },
  {
    key: 'three-cards',
    label: 'Three cards',
    description: 'Three columns, each a card surface.',
    build: (schema) => row(schema, 3, { background: 'surface' }),
  },
  {
    key: 'band',
    label: 'Full-width band',
    description: 'A full-width muted band with medium padding, one column inside.',
    build: (schema) => ({
      ...defaultProps(schema.fields),
      width: 'full',
      padding: 'md',
      background: 'muted',
      blocks: [column(schema)],
    }),
  },
]
