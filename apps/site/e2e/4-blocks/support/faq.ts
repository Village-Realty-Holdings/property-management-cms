/**
 * The FAQ Block's structured data, read from the HTML the server sends (what
 * a search engine sees, before any script runs). Pure, so it is unit tested
 * with `pnpm check`.
 */

export type FaqEntry = { question: string; answer: string }

type JsonLdNode = Record<string, unknown>

/** Every JSON-LD node in `html`, flattening arrays and `@graph`. */
export function jsonLdNodes(html: string): JsonLdNode[] {
  const scripts = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    ),
  ]
  const nodes: JsonLdNode[] = []
  const visit = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(visit)
    else if (value && typeof value === "object") {
      const node = value as JsonLdNode
      nodes.push(node)
      if (node["@graph"]) visit(node["@graph"])
    }
  }
  for (const [, body] of scripts) visit(JSON.parse(body ?? "null"))
  return nodes
}

const hasType = (node: JsonLdNode, type: string) =>
  node["@type"] === type ||
  (Array.isArray(node["@type"]) && node["@type"].includes(type))

/** Text without markup, entities or runs of whitespace. */
export function plainText(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Whether two texts say the same, whatever the whitespace and markup
 * between words (a rendered answer and its JSON-LD copy wrap differently).
 */
export function sameText(a: string, b: string): boolean {
  const squash = (value: string) => plainText(value).replace(/\s+/g, "")
  return squash(a) === squash(b)
}

/**
 * The questions and answers of every `FAQPage` in `html`, in order. Throws
 * when a Question lacks a name or an accepted Answer's text, since search
 * engines reject those.
 */
export function faqPageEntries(html: string): FaqEntry[] {
  return jsonLdNodes(html)
    .filter((node) => hasType(node, "FAQPage"))
    .flatMap((node) => {
      const entities = node.mainEntity
      return (Array.isArray(entities) ? entities : [entities]).map((entity) => {
        const question = entity as JsonLdNode
        const answer = question.acceptedAnswer as JsonLdNode | undefined
        if (
          !hasType(question, "Question") ||
          typeof question.name !== "string" ||
          !answer ||
          !hasType(answer, "Answer") ||
          typeof answer.text !== "string"
        ) {
          throw new Error(
            `Not a Question with an accepted Answer: ${JSON.stringify(entity)}`
          )
        }
        return {
          question: plainText(question.name),
          answer: plainText(answer.text),
        }
      })
    })
}
