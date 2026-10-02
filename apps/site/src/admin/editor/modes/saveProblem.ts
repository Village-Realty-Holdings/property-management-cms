import { BLOCK_TYPES } from "../../pageForm"
import { childrenOf, placeName, type PageDocument } from "../state"

/** Why a save failed, as the Server Action reports it. */
export type SaveProblem = {
  message: string
  /** Keyed by Payload field path, e.g. "blocks.0.heading". */
  fieldErrors?: Record<string, string>
}

const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** "buttonHref" and "button.href" both read "button href". */
const words = (path: string) =>
  path
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\./g, " ")
    .toLowerCase()

/** A Block's name: the catalogue's, else its type spaced out ("Search hero"). */
function blockName(blockType: string): string {
  const known = BLOCK_TYPES.find((type) => type.blockType === blockType)
  return known ? known.label : sentence(words(blockType))
}

/** The field a Container keeps its Blocks in. */
const CHILDREN = "children"

const PAGE_FIELDS: Record<string, string> = {
  title: "Title",
  path: "Path",
  "seo.title": "SEO title",
  "seo.description": "SEO description",
  "seo.image": "SEO image",
}

function where(path: string, doc: PageDocument): string {
  // A Block in a Container: named by its place from the Page down, then by
  // its own name, as the Outline and Media in use name it.
  const nested = /^blocks\.(\d+)((?:\.children\.\d+)+)(?:\.(.+))?$/.exec(path)
  if (nested) {
    const [first, ...inner] = [
      nested[1]!,
      ...nested[2]!.split(".children.").slice(1),
    ].map(Number)
    let block: PageDocument["blocks"][number] | undefined = doc.blocks[first!]
    for (const index of inner) block = block && childrenOf(block)[index]
    const place = placeName(doc, {
      region: "page",
      path: ["blocks", first!, ...inner.flatMap((index) => [CHILDREN, index])],
    })
    return [
      place,
      block && blockName(block.blockType),
      nested[3] && words(nested[3]),
    ]
      .filter(Boolean)
      .join(", ")
  }
  const block = /^blocks\.(\d+)(?:\.(.+))?$/.exec(path)
  if (block) {
    const index = Number(block[1])
    const type = doc.blocks[index]?.blockType
    const name = type ? blockName(type) : `Block ${index + 1}`
    return block[2] ? `${name}, ${words(block[2])}` : name
  }
  return PAGE_FIELDS[path] ?? sentence(words(path))
}

/**
 * The lines of the inline error after a failed save: the message, then one
 * line per field that needs attention, naming the Block it is in.
 */
export function saveProblemLines(
  problem: SaveProblem,
  doc: PageDocument
): string[] {
  return [
    problem.message,
    ...Object.entries(problem.fieldErrors ?? {}).map(
      ([path, message]) => `${where(path, doc)}: ${message}`
    ),
  ]
}

/** The error of one of the Page's own fields, if the last save reported one. */
export function fieldErrorFor(
  problem: SaveProblem | null,
  path: string
): string | undefined {
  return problem?.fieldErrors?.[path]
}
