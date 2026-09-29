import { parse } from "qs-esm"

import { createRestClient, type Fetcher } from "./client"
import type { QueryContext } from "../queries"

/**
 * A fake CMS for unit tests: routes each request to a handler by collection
 * and records every request (URL, parsed query, headers, body).
 */

export type RecordedRequest = {
  method: string
  url: string
  collection: string
  query: Record<string, unknown>
  headers: Record<string, string>
  body: unknown
}

export type Handler = (request: RecordedRequest) => unknown

export const TEST_BASE_URL = "https://cms.test"
export const TEST_KEY = "reader-key-beach"
export const TEST_SITE = "demo-beach"

export function fakeCms(routes: Record<string, Handler>) {
  const requests: RecordedRequest[] = []
  const fetcher: Fetcher = async (url, init) => {
    const { pathname, search } = new URL(url)
    const request: RecordedRequest = {
      method: init.method ?? "GET",
      url,
      collection: pathname.replace(/^\/api\//, ""),
      query: parse(search, { ignoreQueryPrefix: true, depth: 10 }) as Record<
        string,
        unknown
      >,
      headers: init.headers as Record<string, string>,
      body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
    }
    requests.push(request)
    const handler = routes[request.collection]
    if (!handler) {
      return Response.json(
        { errors: [{ message: "Not Found" }] },
        { status: 404 }
      )
    }
    const result = handler(request)
    return result instanceof Response ? result : Response.json(result)
  }
  const ctx = (draft = false): QueryContext => ({
    client: createRestClient({
      baseURL: TEST_BASE_URL,
      apiKey: TEST_KEY,
      fetch: fetcher,
    }),
    site: TEST_SITE,
    draft,
  })
  return { requests, ctx }
}

/** A Payload paginated response. */
export function page<T>(docs: T[], extra: Record<string, unknown> = {}) {
  return {
    docs,
    totalDocs: docs.length,
    limit: 10,
    page: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
    ...extra,
  }
}

/** Lexical rich text with one paragraph per string. */
export function lexical(...paragraphs: string[]) {
  return {
    root: {
      type: "root",
      children: paragraphs.map((text) => ({
        type: "paragraph",
        children: [{ type: "text", text }],
      })),
    },
  }
}
