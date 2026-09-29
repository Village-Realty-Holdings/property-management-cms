import type { ReactNode } from "react"

import type { Block, ContentAdapter, PageDoc } from "@workspace/content/queries"

/**
 * Where a Block sits, for heading levels, preloading and absolute Media
 * URLs, and the content it may read more of (Property grids, Curated Lists).
 */
export type BlockContext = {
  page: PageDoc
  /** The Block's position in the Page's layout (0 is first). */
  index: number
  /** Whether the Page is Home ("/"). */
  isHome: boolean
  /** The CMS base URL, for Media uploads served at relative `/api/media/...`. */
  mediaBaseUrl: string | null
  /** The deployment's Site, for tagging links to the Client's website (lib/utm). */
  site: BlockSite
  /** Reads more content: the Site's cached adapter, or a Preview's. */
  content: ContentAdapter
}

export type BlockSite = { slug: string; clientUrl: string | null }

export type BlockRendererProps = {
  /** The Block as stored: `blockType` plus its fields (see apps/cms src/blocks). */
  block: Block
  context: BlockContext
}

/** Renders one Block type. May be an async Server Component. */
export type BlockRenderer = (
  props: BlockRendererProps
) => ReactNode | Promise<ReactNode>

/** Page width and side padding shared by every Block section. */
export const container = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"

/** The Tuck-In Blocks' narrower reading column (pclodge-landing's). */
export const tuckInContainer = "mx-auto w-full max-w-285 px-5"
