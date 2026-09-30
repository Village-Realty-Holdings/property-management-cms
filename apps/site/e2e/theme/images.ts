import pixelmatch from "pixelmatch"
import { PNG } from "pngjs"

export type ImageComparison = {
  sameSize: boolean
  /** Pixels that differ by more than the colour threshold. */
  differentPixels: number
  /** `differentPixels` over all pixels; 1 when the sizes differ. */
  ratio: number
  /** A PNG marking the differing pixels; absent when the sizes differ. */
  diff?: Buffer
}

/**
 * Compares two PNG screenshots. `threshold` is pixelmatch's per-pixel colour
 * distance (0 to 1): the default ignores sub-perceptual anti-aliasing noise
 * but reports any visible change, so a Theme that came back "almost" the same
 * still fails.
 */
export function compareImages(
  a: Buffer,
  b: Buffer,
  { threshold = 0.05 }: { threshold?: number } = {}
): ImageComparison {
  const first = PNG.sync.read(a)
  const second = PNG.sync.read(b)
  if (first.width !== second.width || first.height !== second.height) {
    return { sameSize: false, differentPixels: -1, ratio: 1 }
  }
  const { width, height } = first
  const diff = new PNG({ width, height })
  const differentPixels = pixelmatch(
    first.data,
    second.data,
    diff.data,
    width,
    height,
    {
      threshold,
    }
  )
  return {
    sameSize: true,
    differentPixels,
    ratio: differentPixels / (width * height),
    diff: PNG.sync.write(diff),
  }
}
