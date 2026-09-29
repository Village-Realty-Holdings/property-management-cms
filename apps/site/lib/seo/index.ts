/**
 * SEO helpers for the Site's pages: base and per-page metadata, and schema.org
 * JSON-LD builders. Pages adopt them as they need; nothing here fetches.
 */
export { absoluteUrl, pageMetadata, siteMetadata, siteOrigin } from "./metadata"
export {
  breadcrumbJsonLd,
  serializeJsonLd,
  vacationRentalJsonLd,
  type BreadcrumbItem,
  type JsonLdObject,
} from "./json-ld"
export { JsonLd } from "./json-ld-script"
