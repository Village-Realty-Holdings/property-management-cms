import { PNG } from "pngjs"
import { describe, expect, it } from "vitest"

import { compareImages } from "./images"

function solid(
  width: number,
  height: number,
  rgba: [number, number, number, number],
  patch?: { x: number; y: number; rgba: [number, number, number, number] }[]
): Buffer {
  const png = new PNG({ width, height })
  for (let i = 0; i < width * height; i++) png.data.set(rgba, i * 4)
  for (const { x, y, rgba: colour } of patch ?? [])
    png.data.set(colour, (y * width + x) * 4)
  return PNG.sync.write(png)
}

describe("compareImages", () => {
  it("finds identical images identical", () => {
    const a = solid(20, 10, [10, 20, 30, 255])
    expect(compareImages(a, a)).toMatchObject({
      sameSize: true,
      differentPixels: 0,
      ratio: 0,
    })
  })

  it("counts the pixels that differ", () => {
    const a = solid(20, 10, [255, 255, 255, 255])
    const b = solid(
      20,
      10,
      [255, 255, 255, 255],
      [
        { x: 1, y: 1, rgba: [0, 0, 0, 255] },
        { x: 5, y: 5, rgba: [0, 0, 0, 255] },
      ]
    )
    const result = compareImages(a, b)
    expect(result.differentPixels).toBe(2)
    expect(result.ratio).toBeCloseTo(2 / 200)
  })

  it("ignores differences below the colour threshold", () => {
    const a = solid(10, 10, [200, 200, 200, 255])
    const b = solid(10, 10, [201, 200, 200, 255])
    expect(compareImages(a, b).differentPixels).toBe(0)
  })

  it("reports images of different sizes as entirely different", () => {
    const result = compareImages(
      solid(10, 10, [0, 0, 0, 255]),
      solid(10, 12, [0, 0, 0, 255])
    )
    expect(result.sameSize).toBe(false)
    expect(result.ratio).toBe(1)
  })

  it("returns a diff image the size of the inputs", () => {
    const a = solid(8, 4, [255, 255, 255, 255])
    const b = solid(
      8,
      4,
      [255, 255, 255, 255],
      [{ x: 0, y: 0, rgba: [0, 0, 0, 255] }]
    )
    const { diff } = compareImages(a, b)
    const decoded = PNG.sync.read(diff!)
    expect([decoded.width, decoded.height]).toEqual([8, 4])
  })
})
