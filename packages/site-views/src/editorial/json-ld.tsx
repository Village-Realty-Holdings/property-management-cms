import { jsonLd } from "./format"

/** Structured data for search engines (schema.org), safely serialized. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd(data) }}
    />
  )
}
