import type { SearchHeroBlock as SearchHeroBlockData } from "../../payload-types"
import { imageOf } from "../brand"
import { HeroShell } from "./HeroShell"
import { SearchHeroForm } from "./SearchHeroForm"
import type { BlockContext } from "./types"

/**
 * Search Hero: a Hero with a visual-only booking search (dates, guests and
 * location). Everything but the form is server-safe; the form is a client
 * island, and submitting it shows a toast and does nothing else.
 */
export function SearchHeroBlock({
  block,
  context,
}: {
  block: SearchHeroBlockData
  context: BlockContext
}) {
  const heading = block.heading?.trim()
  if (!heading) return null
  const locations = (block.locations ?? []).flatMap((location) => {
    const name = location.name?.trim()
    return name ? [name] : []
  })

  return (
    <HeroShell
      eyebrow={block.eyebrow}
      heading={heading}
      accentWord={block.accentWord}
      subheading={block.subheading}
      image={imageOf(block.image)}
      context={context}
    >
      <SearchHeroForm
        searchLabel={block.searchLabel?.trim() || "Search"}
        locations={locations}
        context={{ index: context.index, editing: context.editing }}
      />
    </HeroShell>
  )
}
