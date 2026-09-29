import config from "@payload-config"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { getPayload } from "payload"

import {
  CuratedListView,
  GuideView,
  PageView,
  SiteFrame,
  SiteTheme,
} from "@workspace/site-views"

import { previewFor, type Preview } from "../../../../../../preview"

import { RefreshOnSave } from "../../../../refresh-on-save"

type Params = { site: string; collection: string; id: string }

/**
 * `/preview/<site>/<collection>/<id>`: a Page, Guide or Curated List Draft
 * drawn with the Site's views, for Staff Users (ADR-0018). The Live Preview
 * panel and the Preview button both open it.
 */
export default async function PreviewPage({
  params,
}: {
  params: Promise<Params>
}) {
  const route = await params
  const preview = await previewFor(
    { payload: await getPayload({ config }), headers: await headers() },
    route
  )
  if (preview.kind === "loginRequired") {
    const here = `/preview/${[route.site, route.collection, route.id].map(encodeURIComponent).join("/")}`
    redirect(`/admin/login?redirect=${encodeURIComponent(here)}`)
  }
  if (preview.kind === "notFound") notFound()

  const settings = await preview.content.getSiteSettings()
  return (
    <SiteTheme settings={settings}>
      <RefreshOnSave />
      <View preview={preview} year={new Date().getFullYear()} />
    </SiteTheme>
  )
}

async function View({ preview, year }: { preview: Preview; year: number }) {
  const { content } = preview
  if (preview.collection === "pages") {
    return (
      <PageView
        page={preview.page}
        content={content}
        year={year}
        mediaBaseUrl={null}
        preview
      />
    )
  }
  const settings = await content.getSiteSettings()
  return (
    <SiteFrame settings={settings} year={year}>
      {preview.collection === "guides" ? (
        <GuideView guide={preview.guide} content={content} preview />
      ) : (
        <CuratedListView list={preview.list} content={content} preview />
      )}
    </SiteFrame>
  )
}
