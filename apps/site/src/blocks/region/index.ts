import type { Block, BlocksField } from "payload"

import { CallToAction } from "../CallToAction"
import { containerOf, REGION_INTERFACES } from "../Container"
import { Newsletter } from "../Newsletter"
import { FooterColumns } from "./FooterColumns"
import { HeaderActions } from "./HeaderActions"
import { LegalBar } from "./LegalBar"
import { Logo } from "./Logo"
import { Navigation } from "./Navigation"
import { UtilityStrip } from "./UtilityStrip"

/**
 * The Blocks a Container in a Header or a Footer holds: every region Block
 * but the Utility strip, which is a band of its own. Both regions share one
 * Container, since Payload keeps one table per Block type for a collection;
 * which of these a region's Container may hold is the region's own rule
 * (`regionHolds`), checked on save and in the Visual Editor.
 */
const inRegionContainer: Block[] = [
  Logo,
  Navigation,
  HeaderActions,
  FooterColumns,
  LegalBar,
  Newsletter,
  CallToAction,
]

/** The Container a Layout's Header and Footer take (apps/site ADR-0011). */
export const RegionContainer: Block = containerOf(
  inRegionContainer,
  1,
  REGION_INTERFACES,
  "a Container in a Header or Footer"
)

/** The Blocks a Layout's Header takes. */
export const headerBlocks: Block[] = [
  Logo,
  Navigation,
  HeaderActions,
  UtilityStrip,
  RegionContainer,
]

/**
 * The Blocks a Layout's Footer takes: its own, the Logo, Newsletter and Call
 * to action, and the Container.
 */
export const footerBlocks: Block[] = [
  FooterColumns,
  LegalBar,
  Newsletter,
  CallToAction,
  Logo,
  RegionContainer,
]

/**
 * Whether a Block of `blockType` can be in `region`, on the region itself or
 * in a Container there: a Header never holds a Footer's Blocks, nor a Footer
 * a Header's, and a Utility strip is never inside a Container.
 */
export function regionHolds(
  region: "header" | "footer",
  blockType: unknown,
  inContainer: boolean
): boolean {
  if (inContainer && blockType === "utilityStrip") return false
  return (region === "header" ? headerBlocks : footerBlocks).some(
    (block) => block.slug === blockType
  )
}

/**
 * Why a region's Blocks can't be stored, or `true`: the first Block, at any
 * depth, that the region doesn't hold. The Container's own rule has already
 * refused a Block no Container takes; this is the region's.
 */
export const regionTakesOnly =
  (region: "header" | "footer"): BlocksField["validate"] =>
  (rows) => {
    const name = region === "header" ? "a Header" : "a Footer"
    const check = (list: unknown, inContainer: boolean): string | null => {
      if (!Array.isArray(list)) return null
      for (const row of list as { blockType?: unknown; children?: unknown }[]) {
        if (!regionHolds(region, row?.blockType, inContainer)) {
          return `A “${String(row?.blockType)}” Block can't be in ${inContainer ? `a Container in ${name}` : name}. Remove it.`
        }
        const inner = check(row?.children, true)
        if (inner) return inner
      }
      return null
    }
    return check(rows, false) ?? true
  }
