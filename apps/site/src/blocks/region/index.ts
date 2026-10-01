import type { Block } from "payload"

import { CallToAction } from "../CallToAction"
import { Newsletter } from "../Newsletter"
import { FooterColumns } from "./FooterColumns"
import { HeaderActions } from "./HeaderActions"
import { LegalBar } from "./LegalBar"
import { Logo } from "./Logo"
import { Navigation } from "./Navigation"
import { UtilityStrip } from "./UtilityStrip"

/** The Blocks a Layout's Header takes. Header-only: no Page or Footer uses them. */
export const headerBlocks: Block[] = [
  Logo,
  Navigation,
  HeaderActions,
  UtilityStrip,
]

/** The Blocks a Layout's Footer takes: its own, plus Newsletter and Call to action. */
export const footerBlocks: Block[] = [
  FooterColumns,
  LegalBar,
  Newsletter,
  CallToAction,
]
