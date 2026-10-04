import { describe, expect, it } from "vitest"

import { pageBlocks } from "../../blocks"
import type { Media } from "../../payload-types"
import type { PageBlock } from "../blocks/types"
import { withMedia } from "./withMedia"

const media = (id: number, alt = `Photo ${id}`) =>
  ({
    id,
    alt,
    url: `/media/${id}.jpg`,
    width: 1600,
    height: 900,
    updatedAt: "",
    createdAt: "",
  }) as Media

const library = new Map([7, 8, 9].map((id) => [id, media(id)]))

const page = (blocks: unknown[]) =>
  withMedia(pageBlocks, blocks as PageBlock[], library)

describe("withMedia", () => {
  it("puts the Media in place of the id an Image Block holds", () => {
    const [image] = page([{ blockType: "image", aspect: "original", image: 7 }])
    expect(image).toMatchObject({ blockType: "image", image: media(7) })
  })

  it("finds an image in an array row and in a Block inside Containers", () => {
    const [amenities, container] = page([
      {
        blockType: "amenities",
        items: [{ id: "r1", title: "Pool", image: 8 }],
      },
      {
        blockType: "container",
        children: [
          {
            blockType: "container",
            children: [{ blockType: "image", image: 9 }],
          },
          { blockType: "hero", heading: "Hi", image: 7 },
        ],
      },
    ])
    expect(amenities).toMatchObject({ items: [{ id: "r1", image: media(8) }] })
    expect(container).toMatchObject({
      children: [
        { children: [{ image: media(9) }] },
        { heading: "Hi", image: media(7) },
      ],
    })
  })

  it("leaves an id the library doesn't have, an image already there, and every other value as it was", () => {
    const blocks = [
      { blockType: "image", image: 42, caption: "Gone" },
      { blockType: "image", image: media(8, "Kept") },
      { blockType: "features", items: [{ id: "r1", title: "7" }] },
    ]
    expect(page(blocks)).toEqual(blocks)
  })
})
