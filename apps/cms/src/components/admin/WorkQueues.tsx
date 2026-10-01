import Link from "next/link"
import type {
  CollectionSlug,
  Payload,
  SanitizedPermissions,
  TypedUser,
  Where,
} from "payload"
import { formatAdminURL } from "payload/shared"

import { isSectionOn, type Section } from "../../sections"
import { findActiveSite } from "./activeSite"

type ID = number | string

type Props = {
  payload: Payload
  permissions?: SanitizedPermissions
  user?: TypedUser | null
}

type Item = { id: ID; title: string; href: string; kind?: string }

type Queue = {
  key: string
  heading: string
  empty: string
  total: number
  items: Item[]
  links: { label: string; href: string; count: number }[]
}

type Source = {
  collection: CollectionSlug
  /** Skipped when the selected Site has this Section off. */
  section?: Section
  /** Shown next to each item when a queue mixes collections. */
  kind?: string
  where: Where
  draft?: boolean
}

const SHOWN = 5

/**
 * Work queues for the selected Site on the dashboard (`beforeDashboard`):
 * pending Reviews, Submissions whose forwarding failed, and Drafts, less
 * the selected Site's turned-off Sections. Uses the
 * signed-in user's access, so each person only sees their own Sites' work.
 */
export async function WorkQueues({ payload, permissions, user }: Props) {
  if (!user) return null

  const adminRoute = payload.config.routes.admin
  const site = await findActiveSite(payload, user)
  const siteWhere: Where | undefined = site
    ? { site: { equals: site.id } }
    : undefined

  const canRead = (slug: CollectionSlug) =>
    Boolean(permissions?.collections?.[slug]?.read)

  const listHref = (slug: CollectionSlug, where: Where) =>
    `${formatAdminURL({ adminRoute, path: `/collections/${slug}` })}?${whereQuery(where)}`

  const docHref = (slug: CollectionSlug, id: ID) =>
    formatAdminURL({ adminRoute, path: `/collections/${slug}/${id}` })

  async function fetchSource({ collection, kind, where, draft }: Source) {
    const useAsTitle = payload.collections[collection]?.config.admin.useAsTitle
    const result = await payload
      .find({
        collection,
        depth: 0,
        draft,
        limit: SHOWN,
        overrideAccess: false,
        sort: "-updatedAt",
        user,
        where: siteWhere ? { and: [where, siteWhere] } : where,
      })
      .catch(() => null)
    if (!result) return null
    const items: Item[] = result.docs.map((doc) => {
      const record = doc as unknown as Record<string, unknown> & { id: ID }
      const title = useAsTitle ? record[useAsTitle] : undefined
      return {
        id: record.id,
        title:
          typeof title === "string" && title
            ? title
            : `Untitled (${record.id})`,
        href: docHref(collection, record.id),
        kind,
      }
    })
    return {
      total: result.totalDocs,
      items,
      updatedAt: result.docs.map(
        (doc) => (doc as { updatedAt?: string }).updatedAt ?? ""
      ),
      link: {
        label: kind ?? "View all",
        href: listHref(collection, where),
        count: result.totalDocs,
      },
    }
  }

  async function buildQueue(
    key: string,
    heading: string,
    empty: string,
    sources: Source[]
  ): Promise<Queue | null> {
    const readable = sources.filter(
      ({ collection, section }) =>
        canRead(collection) &&
        (!section || isSectionOn(site?.sections, section))
    )
    if (readable.length === 0) return null
    const results = (await Promise.all(readable.map(fetchSource))).filter(
      (result) => result !== null
    )
    if (results.length === 0) return null
    const items = results
      .flatMap(({ items, updatedAt }) =>
        items.map((item, i) => ({ item, updatedAt: updatedAt[i] ?? "" }))
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, SHOWN)
      .map(({ item }) => item)
    return {
      key,
      heading,
      empty,
      total: results.reduce((sum, { total }) => sum + total, 0),
      items,
      links: results.map(({ link }) => link),
    }
  }

  const draft: Where = { _status: { equals: "draft" } }
  const queues = (
    await Promise.all([
      buildQueue("reviews", "Pending Reviews", "No Reviews to moderate.", [
        {
          collection: "reviews",
          section: "properties",
          where: { moderation: { equals: "pending" } },
        },
      ]),
      buildQueue(
        "submissions",
        "Failed Submissions",
        "Every Submission was forwarded.",
        [
          {
            collection: "submissions",
            section: "inbox",
            where: { forwardingStatus: { equals: "failed" } },
          },
        ]
      ),
      buildQueue("drafts", "Drafts", "Nothing waiting to be published.", [
        { collection: "pages", kind: "Pages", where: draft, draft: true },
        {
          collection: "guides",
          section: "guides",
          kind: "Guides",
          where: draft,
          draft: true,
        },
        {
          collection: "curated-lists",
          section: "curatedLists",
          kind: "Curated Lists",
          where: draft,
          draft: true,
        },
      ]),
    ])
  ).filter((queue) => queue !== null)

  if (queues.length === 0) return null

  return (
    <section className="work-queues">
      <h2 className="work-queues__heading">
        Work queues{" "}
        <span className="work-queues__site">
          {site ? `for ${site.name}` : "for all your Sites"}
        </span>
      </h2>
      <div className="work-queues__grid">
        {queues.map((queue) => (
          <article className="work-queue" key={queue.key}>
            <header className="work-queue__header">
              <h3 className="work-queue__title">{queue.heading}</h3>
              <span
                className={`work-queue__count${queue.total ? "work-queue__count--open" : ""}`}
              >
                {queue.total}
              </span>
            </header>
            {queue.items.length === 0 ? (
              <p className="work-queue__empty">{queue.empty}</p>
            ) : (
              <ul className="work-queue__items">
                {queue.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} prefetch={false}>
                      {item.title}
                    </Link>
                    {item.kind && (
                      <span className="work-queue__kind">{item.kind}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <footer className="work-queue__links">
              {queue.links.map((link) => (
                <Link href={link.href} key={link.href} prefetch={false}>
                  {link.label === "View all"
                    ? "View all"
                    : `${link.label} (${link.count})`}
                </Link>
              ))}
            </footer>
          </article>
        ))}
      </div>
    </section>
  )
}

/** `where` as the list view's query string: `where[field][op]=value`. */
function whereQuery(where: Where): string {
  const params = new URLSearchParams()
  for (const [field, condition] of Object.entries(where)) {
    for (const [operator, value] of Object.entries(
      condition as Record<string, unknown>
    )) {
      params.set(`where[${field}][${operator}]`, String(value))
    }
  }
  return params.toString()
}
