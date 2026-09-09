'use client'

import type { ComponentConfig, Config, Viewports } from '@puckeditor/core'
import type { ReactNode } from 'react'

import { defaultProps } from './adapters'
import { BlockView } from './blocks'
import { CONTAINER, ContainerOnCanvas } from './containers'
import { toBlockFields } from './fields'
import type { BlockSchema } from './schema'

/**
 * Builds the Puck config from the block schema the server derived from the
 * Pages `layout` field. Blocks render with the same components the public
 * page uses (see `blocks.tsx`), so the canvas is the site.
 *
 * Containers are Puck components with a `blocks` slot, so their children are
 * real canvas items: selectable, draggable, nestable.
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

/** The page frame. Root blocks keep the site's vertical rhythm. */
function CanvasRoot({ children }: { children?: ReactNode }) {
  return (
    <article className="min-h-screen bg-background pt-16 pb-24 text-foreground [&>[data-puck-dropzone]]:flex [&>[data-puck-dropzone]]:flex-col [&>[data-puck-dropzone]]:gap-16 md:[&>[data-puck-dropzone]]:gap-24">
      {children}
    </article>
  )
}

/**
 * @param layoutSchemaPath Payload's schema-map key of the layout field; each
 * block's fields get `<key>.<slug>` so rich text can ask the server for its editor.
 */
export function buildPuckConfig(schemas: BlockSchema[], layoutSchemaPath = 'pages.layout'): Config {
  const components: Record<string, ComponentConfig> = {}
  const categories: Record<string, { title: string; components: string[] }> = {}

  for (const schema of schemas) {
    components[schema.slug] = {
      label: schema.label,
      fields: toBlockFields(schema.fields, `${layoutSchemaPath}.${schema.slug}`),
      defaultProps: defaultProps(schema.fields),
      render: ({ puck: _puck, editMode: _editMode, ...props }) =>
        schema.slug === CONTAINER ? (
          <ContainerOnCanvas
            id={props.id}
            props={props}
            schemas={schemas}
            // Puck hands the slot as a component under the field's name.
            slot={props.blocks}
          />
        ) : (
          <BlockView label={schema.label} props={props} slug={schema.slug} />
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
