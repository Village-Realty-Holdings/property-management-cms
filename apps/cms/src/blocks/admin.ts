import type { Block } from "payload"

type BlockAdminOptions = {
  /** The Block's singular label, shown in each row's header. */
  label: string
  /** File in `apps/cms/public/blocks/` shown in the "Add Block" drawer. */
  image: string
  /** One line on what the Block is for: the image's alt text. */
  description: string
  /** Row fields the row header takes its title from. @default ["heading"] */
  titleFrom?: string[]
}

/**
 * Admin config shared by Page Blocks: a row header showing the Block's
 * heading (not "Untitled"), and a thumbnail with a description in the
 * "Add Block" drawer. Admin-only: nothing here changes stored data.
 */
export function blockAdmin({
  label,
  image,
  description,
  titleFrom = ["heading"],
}: BlockAdminOptions): NonNullable<Block["admin"]> {
  return {
    components: {
      Label: {
        path: "/blocks/RowLabel#BlockRowLabel",
        clientProps: { blockLabel: label, fields: titleFrom },
      },
    },
    images: {
      thumbnail: { url: `/blocks/${image}`, alt: description },
    },
    custom: { description },
  }
}
