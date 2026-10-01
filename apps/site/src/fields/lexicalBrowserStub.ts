/**
 * Stands in for `@payloadcms/richtext-lexical` in the browser bundle only
 * (see `turbopack.resolveAlias` in next.config.ts).
 *
 * The Visual Editor's Block tab builds its forms from the Blocks' Payload
 * configs, so the browser imports `src/blocks`, and `fields/richText.ts`
 * with it. The real package reaches for Node's `fs` and cannot be bundled
 * for the browser. The editor only reads a rich text field's name and label
 * (rich text is edited on the page itself), never the Lexical editor, so
 * these are never called there.
 */
export const lexicalEditor = (): never => undefined as never
export const LinkFeature = (): never => undefined as never
