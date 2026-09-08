import type { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'

/**
 * Starter rich text for block defaults, in Lexical's stored shape. A block
 * dropped onto a page shows real words instead of an empty editor.
 *
 *   richTextDefault([heading('Welcome', 'h2'), paragraph('A short intro.')])
 */

type Node = Record<string, unknown>

const text = (value: string): Node => ({
  type: 'text',
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
  text: value,
  version: 1,
})

const block = (type: string, value: string, extra: Node = {}): Node => ({
  type,
  children: [text(value)],
  direction: 'ltr',
  format: '',
  indent: 0,
  version: 1,
  ...extra,
})

export const heading = (value: string, tag: 'h1' | 'h2' | 'h3' | 'h4' = 'h2'): Node => block('heading', value, { tag })

export const paragraph = (value: string): Node => block('paragraph', value, { textFormat: 0, textStyle: '' })

export const richTextDefault = (children: Node[]): DefaultTypedEditorState =>
  ({
    root: {
      type: 'root',
      children,
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  }) as unknown as DefaultTypedEditorState
