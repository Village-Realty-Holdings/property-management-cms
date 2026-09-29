import type { Page } from "../../payload-types"

/** A Block as stored on a Page. */
export type PageBlock = NonNullable<Page["layout"]>[number]

/** Where a Block sits: its position sets heading levels and preloading. */
export type BlockContext = { index: number }

/** Page width and side padding shared by every Block section. */
export const container = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
