import type { Where } from "../shared"

/**
 * How the queries reach the CMS: the seam between them and Payload
 * (ADR-0018). Two adapters: HTTP with the Site's reader key
 * (`createRestClient`, apps/site) and the Local API as the Staff User asking
 * (apps/cms Preview). Either way the CMS scopes what it returns to what that
 * caller may read.
 */

/** Query parameters, as Payload's REST API reads them. */
export type ContentQuery = {
  where?: Where
  select?: Record<string, unknown>
  populate?: Record<string, Record<string, unknown>>
  depth?: number
  limit?: number
  page?: number
  pagination?: boolean
  sort?: string | string[]
  draft?: boolean
}

/** Payload's paginated list response. */
export type PaginatedResponse<T> = {
  docs: T[]
  totalDocs: number
  limit: number
  page?: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

/**
 * What the queries need from the CMS. For drafts-enabled collections,
 * `find` returns published documents only unless the query sets `draft`,
 * whoever the caller is: that's what a SiteReader may read anyway, and a
 * Staff User's Preview must show the live navigation and lists.
 */
export type ContentClient = {
  /** A page of documents (REST: `GET /api/<collection>`). */
  find<T>(
    collection: string,
    query?: ContentQuery
  ): Promise<PaginatedResponse<T>>
  /** Creates a document and returns it (REST: `POST /api/<collection>`). */
  create<T>(
    collection: string,
    data: Record<string, unknown>,
    query?: ContentQuery
  ): Promise<T>
  /** The CMS origin, for making relative upload URLs absolute. */
  readonly baseURL: string
}

/** A validation error from the CMS: which field and why. */
export type FieldError = { path: string; message: string }

/** A CMS request that failed (non-2xx). */
export class ContentRequestError extends Error {
  readonly status: number
  /** Field errors when the CMS rejected the data (HTTP 400). */
  readonly errors: FieldError[]

  constructor(message: string, status: number, errors: FieldError[] = []) {
    super(message)
    this.name = "ContentRequestError"
    this.status = status
    this.errors = errors
  }
}
