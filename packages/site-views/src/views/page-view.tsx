import type { ContentAdapter, PageDoc } from "@workspace/content/queries"
import { cn } from "@workspace/ui/lib/utils"

import { opensWithHero, RenderBlocks } from "../blocks"
import { container } from "../blocks/types"
import { PreviewGuard } from "../preview-guard"
import { displayFont } from "../site/display"
import { SiteFrame } from "../site/site-frame"
import { TuckInFrame } from "../tuck-in/tuck-in-frame"

export type PageViewProps = {
  page: PageDoc
  content: ContentAdapter
  /** For "© <year>"; the Site passes a cached one so pages prerender. */
  year: number
  /** The CMS base URL, for Media uploads served at relative `/api/media/...`. */
  mediaBaseUrl: string | null
  /** In the CMS's Preview: links and forms don't act. */
  preview?: boolean
}

/**
 * A CMS Page with its chrome: the Site's usual header and footer, or the
 * Tuck-In's for a Tuck-In Page.
 */
export async function PageView({
  page,
  content,
  year,
  mediaBaseUrl,
  preview = false,
}: PageViewProps) {
  const settings = await content.getSiteSettings()
  const isHome = page.path === "/"
  const blocks = (
    <RenderBlocks
      page={page}
      isHome={isHome}
      mediaBaseUrl={mediaBaseUrl}
      site={{ slug: settings.slug, clientUrl: settings.client.url }}
      content={content}
    />
  )

  if (page.template === "tuckIn") {
    return (
      <TuckInFrame settings={settings} year={year}>
        {preview && <PreviewGuard />}
        {blocks}
      </TuckInFrame>
    )
  }

  return (
    <SiteFrame settings={settings} year={year}>
      {preview && <PreviewGuard />}
      {!opensWithHero(page.blocks) && (
        <header
          className={cn(container, "flex flex-col gap-4 pt-14 pb-2 sm:pt-20")}
        >
          <div
            aria-hidden
            className="h-1 w-16 rounded-full bg-(--brand-accent)"
          />
          <h1
            className={cn(
              displayFont,
              "max-w-4xl text-5xl leading-[1] text-balance sm:text-6xl"
            )}
          >
            {page.title}
          </h1>
        </header>
      )}
      {blocks}
    </SiteFrame>
  )
}
