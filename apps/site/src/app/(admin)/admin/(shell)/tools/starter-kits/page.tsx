import type { Metadata } from "next"

import { StarterKitForm } from "@/admin/components/starterKits/StarterKitForm"
import { mediaOptions } from "@/admin/media"
import { loadThemes } from "@/admin/savedThemes"
import { requireUser } from "@/admin/session"
import { loadKitDefaults } from "@/admin/starterKits"
import { STARTER_KITS } from "@/starterKits"

export const metadata: Metadata = { title: "Starter Kits" }

/** Starter Kits: set a Site up from a kit, in a few steps with a review. */
export default async function StarterKitsPage() {
  const session = await requireUser()
  const [themes, media, defaults] = await Promise.all([
    loadThemes(session.payload, session.as),
    mediaOptions(session),
    loadKitDefaults(session.payload, session.as),
  ])
  // The kits' Blocks stay on the server: the form needs only their cards.
  const kits = STARTER_KITS.map(
    ({ id, name, blurb, includes, theme, questions }) => ({
      id,
      name,
      blurb,
      includes,
      theme,
      questions,
    })
  )
  return (
    <StarterKitForm
      kits={kits}
      themes={themes}
      media={media}
      defaults={defaults}
    />
  )
}
