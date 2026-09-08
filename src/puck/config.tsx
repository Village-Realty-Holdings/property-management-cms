'use client'

import type { ComponentConfig, Config, Viewports } from '@puckeditor/core'
import type { ReactNode } from 'react'

import { defaultProps } from './adapters'
import { EmptyCanvas, InsertStrip, useRootIndex } from './BlockPicker'
import { BlockView } from './blocks'
import { toBlockFields } from './fields'
import type { BlockSchema } from './schema'
import { usePuckSelector as usePuck } from './usePuck'

/**
 * Builds the Puck config from the block schema the server derived from the
 * Pages `layout` field. Blocks render with the same components the public
 * page uses (see `blocks.tsx`), so the canvas is the site.
 */

/**
 * Canvas width presets: the admin Live Preview breakpoints, with desktop as
 * full width. The canvas is not scaled (Puck's drag overlay reads an internal
 * zoom), so a fixed 1440 would overflow the column instead of shrinking.
 */
export const viewports: Viewports = [
  { width: 375, height: 'auto', label: 'Mobile', icon: 'Smartphone' },
  { width: 768, height: 'auto', label: 'Tablet', icon: 'Tablet' },
  { width: '100%', height: 'auto', label: 'Desktop', icon: 'Monitor' },
]

/** A block on the canvas with a "+" strip under it, so the next block can be added by clicking. */
function CanvasBlock({ id, children }: { id: string; children: ReactNode }) {
  const index = useRootIndex(id)
  return (
    <>
      {children}
      {index >= 0 && <InsertStrip index={index + 1} />}
    </>
  )
}

/** The page frame: a "+" strip at the top, or the empty-state card when there are no blocks yet. */
function CanvasRoot({ children }: { children?: ReactNode }) {
  const isEmpty = usePuck((s) => s.appState.data.content.length === 0)
  return (
    <article className="min-h-screen bg-background pt-16 pb-24 text-foreground">
      {isEmpty ? <EmptyCanvas /> : <InsertStrip index={0} />}
      {children}
    </article>
  )
}

export function buildPuckConfig(schemas: BlockSchema[]): Config {
  const components: Record<string, ComponentConfig> = {}
  const categories: Record<string, { title: string; components: string[] }> = {}

  for (const schema of schemas) {
    components[schema.slug] = {
      label: schema.label,
      fields: toBlockFields(schema.fields),
      defaultProps: defaultProps(schema.fields),
      render: ({ puck: _puck, editMode: _editMode, ...props }) => (
        <CanvasBlock id={props.id}>
          <div className="my-16">
            <BlockView label={schema.label} props={props} slug={schema.slug} />
          </div>
        </CanvasBlock>
      ),
    }
    const group = schema.group ?? 'Blocks'
    const key = group.toLowerCase().replace(/\s+/g, '-')
    categories[key] ??= { title: group, components: [] }
    categories[key].components.push(schema.slug)
  }

  return {
    categories,
    root: {
      // Page settings, shown when nothing on the canvas is selected.
      fields: {
        title: { type: 'text', label: 'Page title' },
        slug: { type: 'text', label: 'URL slug' },
      },
      render: ({ children }: { children?: ReactNode }) => <CanvasRoot>{children}</CanvasRoot>,
    },
    components,
  }
}
