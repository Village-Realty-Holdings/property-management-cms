import type {
  CallToActionBlock,
  HeroBlock,
  Media,
  Page,
  RichTextBlock,
} from "../payload-types"

/**
 * A Page as the Admin's form edits it: uploads as Media ids, and rich text
 * as Markdown (see richText.ts). Plain data, so it crosses the
 * server/client boundary as is.
 */
export type LinkValues = { label: string; href: string }

export type HeroValues = {
  id?: string
  blockType: "hero"
  heading: string
  subheading: string
  image: number | null
  cta: LinkValues
}

export type RichTextValues = {
  id?: string
  blockType: "richText"
  markdown: string
}

export type CallToActionValues = {
  id?: string
  blockType: "callToAction"
  heading: string
  body: string
  button: LinkValues
  style: CallToActionBlock["style"]
}

export type BlockValues = HeroValues | RichTextValues | CallToActionValues

export type PageValues = {
  title: string
  path: string
  layout: BlockValues[]
  seo: { title: string; description: string; image: number | null }
}

export const BLOCK_TYPES = [
  {
    blockType: "hero",
    label: "Hero",
    description: "A large heading with an image and a button.",
  },
  {
    blockType: "richText",
    label: "Rich text",
    description: "Free-form text with headings, lists and links.",
  },
  {
    blockType: "callToAction",
    label: "Call to action",
    description: "A short pitch with one button.",
  },
] as const satisfies {
  blockType: BlockValues["blockType"]
  label: string
  description: string
}[]

export function emptyBlock(blockType: BlockValues["blockType"]): BlockValues {
  switch (blockType) {
    case "hero":
      return {
        blockType,
        heading: "",
        subheading: "",
        image: null,
        cta: { label: "", href: "" },
      }
    case "richText":
      return { blockType, markdown: "" }
    case "callToAction":
      return {
        blockType,
        heading: "",
        body: "",
        button: { label: "", href: "" },
        style: "primary",
      }
  }
}

export const emptyPage: PageValues = {
  title: "",
  path: "",
  layout: [],
  seo: { title: "", description: "", image: null },
}

export const mediaId = (value: number | Media | null | undefined) =>
  value == null ? null : typeof value === "object" ? value.id : value

const link = (
  value: { label?: string | null; href?: string | null } | null | undefined
): LinkValues => ({
  label: value?.label ?? "",
  href: value?.href ?? "",
})

/** A stored Page as form values; rich text goes through `toMarkdown`. */
export async function pageToValues(
  page: Page,
  toMarkdown: (data: unknown) => Promise<string>
): Promise<PageValues> {
  const layout = await Promise.all(
    (page.layout ?? []).map(async (block): Promise<BlockValues> => {
      switch (block.blockType) {
        case "hero":
          return {
            id: block.id ?? undefined,
            blockType: "hero",
            heading: block.heading ?? "",
            subheading: block.subheading ?? "",
            image: mediaId(block.image),
            cta: link(block.cta),
          }
        case "richText":
          return {
            id: block.id ?? undefined,
            blockType: "richText",
            markdown: await toMarkdown(block.content),
          }
        case "callToAction":
          return {
            id: block.id ?? undefined,
            blockType: "callToAction",
            heading: block.heading ?? "",
            body: block.body ?? "",
            button: link(block.button),
            style: block.style ?? "primary",
          }
      }
    })
  )
  return {
    title: page.title ?? "",
    path: page.path ?? "",
    layout,
    seo: {
      title: page.seo?.title ?? "",
      description: page.seo?.description ?? "",
      image: mediaId(page.seo?.image),
    },
  }
}

type StoredBlock = NonNullable<Page["layout"]>[number]

/** Form values as Page data; rich text goes through `fromMarkdown`. */
export async function valuesToPageData(
  values: PageValues,
  fromMarkdown: (markdown: string) => Promise<unknown>
) {
  const layout = await Promise.all(
    values.layout.map(async (block): Promise<StoredBlock> => {
      const id = block.id ? { id: block.id } : {}
      switch (block.blockType) {
        case "hero":
          return {
            ...id,
            blockType: "hero",
            heading: block.heading,
            subheading: block.subheading || null,
            image: block.image,
            cta: block.cta,
          } satisfies HeroBlock
        case "richText":
          return {
            ...id,
            blockType: "richText",
            content: (await fromMarkdown(
              block.markdown
            )) as RichTextBlock["content"],
          }
        case "callToAction":
          return {
            ...id,
            blockType: "callToAction",
            heading: block.heading,
            body: block.body || null,
            button: block.button,
            style: block.style,
          } satisfies CallToActionBlock
      }
    })
  )
  return {
    title: values.title,
    path: values.path,
    layout,
    seo: {
      title: values.seo.title || null,
      description: values.seo.description || null,
      image: values.seo.image,
    },
  }
}
