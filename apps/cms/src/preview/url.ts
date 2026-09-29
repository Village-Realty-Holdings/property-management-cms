import type {
  GeneratePreviewURL,
  LivePreviewConfig,
  PayloadRequest,
} from "payload"

import type { PreviewCollection } from "./previewFor"

type ID = number | string

function idOf(ref: unknown): ID | undefined {
  const id = ref && typeof ref === "object" ? (ref as { id?: unknown }).id : ref
  return typeof id === "number" || typeof id === "string" ? id : undefined
}

/**
 * `/preview/<site slug>/<collection>/<id>` for a document, or null while it
 * has no id (not saved yet) or no Site. The slug isn't secret, so it's read
 * without access checks.
 */
async function previewPath(
  collection: PreviewCollection,
  doc: Record<string, unknown>,
  req: PayloadRequest
): Promise<string | null> {
  const id = idOf(doc)
  const siteId = idOf(doc.site)
  if (id === undefined || siteId === undefined) return null
  const site =
    typeof doc.site === "object" && doc.site && "slug" in doc.site
      ? (doc.site as { slug?: unknown })
      : await req.payload.findByID({
          collection: "sites",
          id: siteId,
          depth: 0,
          select: { slug: true },
          overrideAccess: true,
          disableErrors: true,
          req,
        })
  if (typeof site?.slug !== "string" || !site.slug) return null
  const segments = [site.slug, collection, String(id)].map(encodeURIComponent)
  return `/preview/${segments.join("/")}`
}

/** Device sizes offered in the Live Preview toolbar. */
const breakpoints: NonNullable<LivePreviewConfig["breakpoints"]> = [
  { name: "mobile", label: "Mobile", width: 390, height: 844 },
  { name: "tablet", label: "Tablet", width: 768, height: 1024 },
  { name: "desktop", label: "Desktop", width: 1440, height: 900 },
]

/**
 * `admin.preview` and `admin.livePreview` for Pages, Guides and Curated
 * Lists: both open the CMS's own Preview of the document (ADR-0018).
 */
export function previewAdmin(collection: PreviewCollection): {
  preview: GeneratePreviewURL
  livePreview: LivePreviewConfig
} {
  return {
    preview: (doc, { req }) => previewPath(collection, doc, req),
    livePreview: {
      url: ({ data, req }) => previewPath(collection, data, req),
      breakpoints,
    },
  }
}
