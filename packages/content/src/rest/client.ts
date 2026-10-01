import { stringify } from "qs-esm"

import {
  ContentRequestError,
  type ContentClient,
  type ContentQuery,
  type FieldError,
} from "../queries/client"

/**
 * The HTTP adapter of the queries' `ContentClient` (ADR-0007): `fetch` +
 * `qs-esm`, authenticated with the Site's SiteReader key. The CMS scopes
 * every read to that key's Site. Tests build one on a fake `fetch`.
 */

/** A `fetch`-compatible function. */
export type Fetcher = (url: string, init: RequestInit) => Promise<Response>

export type RestClientOptions = {
  /** The CMS origin, e.g. https://cms.example.com (without /api). */
  baseURL: string
  /** The Site's SiteReader API key. */
  apiKey: string
  fetch?: Fetcher
}

/** `?where[...]=...&depth=...` as Payload's REST API reads it. */
export function toSearch(query: ContentQuery = {}): string {
  const search: Record<string, unknown> = {}
  if (query.where) search.where = query.where
  if (query.select) search.select = query.select
  if (query.populate) search.populate = query.populate
  if (query.depth !== undefined) search.depth = String(query.depth)
  if (query.limit !== undefined) search.limit = String(query.limit)
  if (query.page !== undefined) search.page = String(query.page)
  if (query.pagination !== undefined)
    search.pagination = String(query.pagination)
  if (query.sort !== undefined) {
    search.sort = Array.isArray(query.sort) ? query.sort.join(",") : query.sort
  }
  if (query.draft) search.draft = "true"
  return stringify(search, { addQueryPrefix: true })
}

export function createRestClient({
  baseURL,
  apiKey,
  fetch: fetcher = (url, init) => globalThis.fetch(url, init),
}: RestClientOptions): ContentClient {
  const origin = baseURL.replace(/\/+$/, "")
  const headers = {
    Authorization: `site-readers API-Key ${apiKey}`,
    Accept: "application/json",
  }

  async function request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetcher(`${origin}/api/${path}`, {
      ...init,
      headers: { ...headers, ...(init.headers as Record<string, string>) },
    })
    const body = (await response.json().catch(() => null)) as unknown
    if (!response.ok) throw requestError(response.status, body)
    return body as T
  }

  return {
    baseURL: origin,
    find: (collection, query) =>
      request(`${collection}${toSearch(query)}`, { method: "GET" }),
    create: (collection, data, query) =>
      request(`${collection}${toSearch(query)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  }
}

type ErrorBody = {
  errors?: {
    message?: string
    data?: { errors?: { path?: string; field?: string; message?: string }[] }
  }[]
}

function requestError(status: number, body: unknown): ContentRequestError {
  const errors = (body as ErrorBody | null)?.errors ?? []
  const fields: FieldError[] = errors.flatMap((error) =>
    (error.data?.errors ?? []).map((field) => ({
      path: field.path ?? field.field ?? "",
      message: field.message ?? "Invalid value.",
    }))
  )
  const message =
    errors
      .map((error) => error.message)
      .filter(Boolean)
      .join("; ") || `CMS request failed with HTTP ${status}`
  return new ContentRequestError(message, status, fields)
}
