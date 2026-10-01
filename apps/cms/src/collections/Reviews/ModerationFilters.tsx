"use client"

import type { Where } from "payload"
import { Pill, useListQuery } from "@payloadcms/ui"

const views = [
  { label: "All", value: null },
  { label: "Pending", value: "pending" },
  { label: "Shown", value: "shown" },
  { label: "Hidden", value: "hidden" },
] as const

type Moderation = (typeof views)[number]["value"]

/** The filter's `where`, in the shape the list's Filters panel edits. */
const whereFor = (moderation: Moderation): Where =>
  moderation === null
    ? {}
    : { or: [{ and: [{ moderation: { equals: moderation } }] }] }

/** The Moderation the list is filtered to, when that's its only filter. */
function activeView(where: Where | undefined): Moderation | undefined {
  if (!where || Object.keys(where).length === 0) return null
  const json = JSON.stringify(where)
  const view = views.find(
    ({ value }) =>
      value !== null &&
      (json === JSON.stringify(whereFor(value)) ||
        json === JSON.stringify({ moderation: { equals: value } }))
  )
  return view?.value
}

/**
 * Above the Reviews list: quick views by Moderation. "Pending" is the
 * moderation queue; select rows and use Edit to Show or Hide them in bulk.
 */
export function ModerationFilters() {
  const { query, refineListData } = useListQuery()
  const active = activeView(query.where)
  return (
    <div
      aria-label="Moderation"
      role="group"
      style={{
        alignItems: "center",
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 16,
      }}
    >
      {views.map(({ label, value }) => (
        <Pill
          key={label}
          onClick={() =>
            void refineListData({ page: 1, where: whereFor(value) })
          }
          pillStyle={active === value ? "dark" : "light"}
        >
          {label}
        </Pill>
      ))}
      <span style={{ color: "var(--theme-elevation-500)" }}>
        Select Reviews and choose Edit to Show or Hide them together.
      </span>
    </div>
  )
}
