import { DefaultNav } from "@payloadcms/next/rsc"
import type { ComponentProps } from "react"

import { withoutHiddenCollections } from "../../sections"
import { findActiveSite } from "./activeSite"

type Props = ComponentProps<typeof DefaultNav>

/**
 * The admin nav (`admin.components.Nav`): Payload's DefaultNav without the
 * collections of the active Site's turned-off Sections (src/sections). With
 * no Site selected, everything shows. Admin only: access doesn't change.
 */
export async function Nav(props: Props) {
  const site = await findActiveSite(props.payload, props.user)
  if (!site || !props.visibleEntities) return <DefaultNav {...props} />
  const visibleEntities = {
    ...props.visibleEntities,
    collections: withoutHiddenCollections(
      props.visibleEntities.collections,
      site.sections
    ),
  }
  return <DefaultNav {...props} visibleEntities={visibleEntities} />
}
