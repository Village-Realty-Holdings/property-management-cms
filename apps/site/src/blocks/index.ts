import type { Block } from "payload"

import { CallToAction } from "./CallToAction"
import { Hero } from "./Hero"
import { RichText } from "./RichText"

/** The Blocks a Page can use, in the order the Admin offers them. */
export const pageBlocks: Block[] = [Hero, RichText, CallToAction]
