import { serializeJsonLd, type JsonLdObject } from "./json-ld"

/** Renders JSON-LD (e.g. `vacationRentalJsonLd(property)`) in the page. */
export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
