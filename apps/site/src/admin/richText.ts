import "server-only"

import {
  convertLexicalToMarkdown,
  convertMarkdownToLexical,
  editorConfigFactory,
} from "@payloadcms/richtext-lexical"
import type { Payload } from "payload"

/**
 * Rich text in the Admin's forms, until the Visual Editor edits it in
 * place: Staff Users write Markdown (headings, lists, bold, links), and it
 * is stored as Lexical JSON like any Payload rich text. Uses the config's
 * editor, so the stored nodes match what Payload validates.
 */

async function editorConfig(payload: Payload) {
  return editorConfigFactory.default({ config: payload.config })
}

export async function toMarkdown(
  payload: Payload,
  data: unknown
): Promise<string> {
  if (!data || typeof data !== "object") return ""
  return convertLexicalToMarkdown({
    data: data as Parameters<typeof convertLexicalToMarkdown>[0]["data"],
    editorConfig: await editorConfig(payload),
  })
}

export async function fromMarkdown(payload: Payload, markdown: string) {
  return convertMarkdownToLexical({
    markdown,
    editorConfig: await editorConfig(payload),
  })
}
