/** One question and its answer, as the FAQ Block stores them. */
export type FaqItem = { question: string; answer: string }

/**
 * The FAQ as schema.org `FAQPage` structured data, or null when no question
 * has both its text and its answer (search engines reject a Question without
 * an accepted Answer).
 */
export function faqPageJsonLd(items: readonly FaqItem[]) {
  const mainEntity = items.flatMap(({ question, answer }) => {
    const name = question?.trim()
    const text = answer?.trim()
    if (!name || !text) return []
    return [
      {
        "@type": "Question" as const,
        name,
        acceptedAnswer: { "@type": "Answer" as const, text },
      },
    ]
  })
  if (mainEntity.length === 0) return null
  return {
    "@context": "https://schema.org" as const,
    "@type": "FAQPage" as const,
    mainEntity,
  }
}

/**
 * JSON for a `<script type="application/ld+json">` body. `<` is written as
 * the six characters u003c (after a backslash) so no text in the data can
 * close the script or open a comment (`</script>`, `<!--`), and the line separators U+2028 and U+2029 are
 * escaped too. `JSON.parse` reads the escapes back to the original text.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replaceAll(String.fromCharCode(0x2028), "\\u2028")
    .replaceAll(String.fromCharCode(0x2029), "\\u2029")
}
