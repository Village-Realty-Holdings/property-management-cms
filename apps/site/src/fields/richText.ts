import { LinkFeature, lexicalEditor } from "@payloadcms/richtext-lexical"

/**
 * The rich text editor: Lexical's defaults, with links as URLs or Site paths
 * only. Upload and relationship nodes are off, so the Site renders plain
 * text, headings, lists, quotes and links; images go in image fields.
 */
export const richTextEditor: ReturnType<typeof lexicalEditor> = lexicalEditor({
  features: ({ defaultFeatures }) => [
    ...defaultFeatures.filter(
      ({ key }) => !["link", "relationship", "upload"].includes(key)
    ),
    LinkFeature({ enabledCollections: [] }),
  ],
})
