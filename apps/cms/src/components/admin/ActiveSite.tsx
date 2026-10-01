import type { CollectionSlug, Payload, TypedUser } from "payload"

import { tenantCollections } from "../../tenancy"
import { ActiveSiteSync } from "./ActiveSiteSync"

type ID = number | string

type Props = {
  collectionSlug?: string
  docID?: ID
  payload: Payload
  user?: TypedUser | null
}

/**
 * Site-scoped collections that declare their own `site` field. The plugin's
 * Site field switches the selected Site when a document opens; these don't
 * use it, so the header does that for them.
 */
const customSiteFieldSlugs = new Set(
  Object.entries(tenantCollections)
    .filter(([, options]) => options?.customTenantField)
    .map(([slug]) => slug)
)

const idOf = (ref: unknown): ID | undefined =>
  ref && typeof ref === "object"
    ? (ref as { id?: ID }).id
    : ((ref as ID | undefined) ?? undefined)

/**
 * The active Site, shown in the admin header on every view
 * (`admin.components.actions`). Opening a document of another Site switches
 * the active Site to it, so the lists that follow are filtered to that Site.
 */
export async function ActiveSite({
  collectionSlug,
  docID,
  payload,
  user,
}: Props) {
  let documentSiteID: ID | undefined
  if (
    user &&
    collectionSlug &&
    docID !== undefined &&
    customSiteFieldSlugs.has(collectionSlug)
  ) {
    const doc = await payload
      .findByID({
        collection: collectionSlug as CollectionSlug,
        id: docID,
        depth: 0,
        disableErrors: true,
        overrideAccess: false,
        user,
      })
      .catch(() => null)
    documentSiteID = idOf((doc as { site?: unknown } | null)?.site)
  }

  return <ActiveSiteSync documentSiteID={documentSiteID} />
}
