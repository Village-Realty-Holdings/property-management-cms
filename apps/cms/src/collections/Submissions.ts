import type {
  CollectionBeforeChangeHook,
  CollectionConfig,
  FieldAffectingData,
} from "payload"

import {
  adminOfSite,
  lockedField,
  readerCreate,
  setReaderSite,
  staffOfSite,
  staffVersionsOfSite,
} from "../access"
import { forwardOnCreate, retryForwardingEndpoint } from "../forwarding"

const DEFAULT_RETENTION_DAYS = 365
const DAY_MS = 24 * 60 * 60 * 1000

/** Days a Submission is kept (SUBMISSION_RETENTION_DAYS, default 365). */
function retentionDays(): number {
  const days = Number(process.env.SUBMISSION_RETENTION_DAYS)
  return Number.isFinite(days) && days > 0 ? days : DEFAULT_RETENTION_DAYS
}

/**
 * Stamps `retainUntil` on create. Deleting expired Submissions is a separate
 * job, not built yet (ADR-0014, "Submission retention").
 */
const setRetainUntil: CollectionBeforeChangeHook = ({ data, operation }) => {
  if (operation !== "create") return data
  return {
    ...data,
    retainUntil: new Date(Date.now() + retentionDays() * DAY_MS).toISOString(),
  }
}

/**
 * Guest data, as sent by the Site: set on create (by the SiteReader), never
 * changed afterwards, and read-only in the admin.
 */
function guestData<T extends FieldAffectingData>(field: T): T {
  return {
    ...field,
    access: { ...field.access, update: lockedField },
    admin: { ...field.admin, readOnly: true },
  } as T
}

type ID = number | string
const idOf = (ref: unknown): ID | undefined =>
  ref && typeof ref === "object"
    ? (ref as { id?: ID }).id
    : (ref as ID | undefined)

/**
 * A form entry sent from a Site, stored against that Site and then forwarded
 * to its Forwarding Destinations (ADR-0014; see src/forwarding). Created by
 * the Site's SiteReader; read by staff of that Site only (it holds guest
 * personal data). Read-only for staff: the guest's data can't change after
 * create, and only forwarding writes the forwarding fields (overrideAccess).
 *
 * Its `site` field is declared here rather than by the multi-tenant plugin
 * (`customTenantField: true` in tenancy.ts): the plugin's field only lets
 * Staff Users set it, but a Submission's Site comes from the SiteReader that
 * created it (`setReaderSite`).
 */
export const Submissions: CollectionConfig = {
  slug: "submissions",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "kind", "email", "forwardingStatus", "createdAt"],
    group: "Content",
  },
  access: {
    create: readerCreate,
    read: staffOfSite,
    update: staffOfSite,
    delete: adminOfSite,
    readVersions: staffVersionsOfSite,
    unlock: staffOfSite,
  },
  hooks: {
    beforeChange: [setReaderSite, setRetainUntil],
    afterChange: [forwardOnCreate],
  },
  endpoints: [retryForwardingEndpoint],
  fields: [
    {
      name: "site",
      type: "relationship",
      relationTo: "sites",
      required: true,
      index: true,
      access: { create: lockedField, update: lockedField },
      admin: { position: "sidebar", readOnly: true },
    },
    guestData({
      name: "kind",
      type: "select",
      required: true,
      options: [
        { label: "Inquiry", value: "inquiry" },
        { label: "Owner Lead", value: "ownerLead" },
        { label: "Contact", value: "contact" },
      ],
    }),
    {
      type: "row",
      fields: [
        guestData({ name: "name", type: "text", required: true }),
        guestData({ name: "email", type: "email", required: true }),
        guestData({ name: "phone", type: "text" }),
      ],
    },
    guestData({ name: "message", type: "textarea" }),
    guestData({
      name: "property",
      type: "relationship",
      relationTo: "properties",
      // Only a Property on the Submission's own Site (validated on save too).
      filterOptions: ({ siblingData }) => {
        const site = idOf((siblingData as { site?: unknown }).site)
        return site === undefined ? false : { site: { equals: site } }
      },
    }),
    {
      type: "row",
      fields: [
        guestData({
          name: "arrival",
          type: "date",
          admin: { date: { pickerAppearance: "dayOnly" } },
        }),
        guestData({
          name: "departure",
          type: "date",
          admin: { date: { pickerAppearance: "dayOnly" } },
        }),
        guestData({ name: "guests", type: "number", min: 0 }),
      ],
    },
    guestData({
      name: "payload",
      label: "Other form fields",
      type: "json",
      required: true,
      defaultValue: {},
      admin: {
        description: "Any other form fields, as sent by the Site.",
      },
    }),
    guestData({
      name: "sourceUrl",
      label: "Source URL",
      type: "text",
      admin: {
        description: "The page the form was sent from.",
      },
    }),
    {
      // Honeypot: a hidden form input people leave empty and bots fill in.
      // Never stored; a filled-in value rejects the Submission.
      name: "website",
      type: "text",
      virtual: true,
      admin: { hidden: true },
      validate: (value: unknown) =>
        value === undefined || value === null || value === ""
          ? true
          : "Submission rejected.",
    },
    {
      name: "forwardingStatus",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Sent", value: "sent" },
        { label: "Failed", value: "failed" },
      ],
      // Set by forwarding only (it writes with overrideAccess).
      access: { create: lockedField, update: lockedField },
      admin: { position: "sidebar", readOnly: true },
    },
    {
      // "Retry forwarding" button, shown while forwarding has failed.
      name: "retryForwarding",
      type: "ui",
      admin: {
        position: "sidebar",
        condition: (data) => data?.forwardingStatus === "failed",
        components: {
          Field: "/components/admin/RetryForwarding#RetryForwarding",
        },
      },
    },
    {
      name: "forwardingAttempts",
      type: "number",
      defaultValue: 0,
      access: { create: lockedField, update: lockedField },
      admin: { position: "sidebar", readOnly: true },
    },
    {
      name: "forwardedAt",
      type: "date",
      access: { create: lockedField, update: lockedField },
      admin: {
        position: "sidebar",
        readOnly: true,
        date: { pickerAppearance: "dayAndTime" },
      },
    },
    {
      name: "lastForwardingError",
      type: "textarea",
      access: { create: lockedField, update: lockedField },
      admin: { position: "sidebar", readOnly: true, rows: 6 },
    },
    {
      // IDs of the Site's Forwarding Destinations that accepted this
      // Submission, so a retry after a partial failure skips them.
      name: "deliveredTo",
      type: "json",
      access: { create: lockedField, update: lockedField },
      admin: { hidden: true },
    },
    {
      name: "retainUntil",
      label: "Keep until",
      type: "date",
      access: { create: lockedField, update: lockedField },
      admin: {
        position: "sidebar",
        readOnly: true,
        description: () =>
          `This Submission holds guest personal data, so it's kept for ${retentionDays()} days after it's received. Delete it after this date.`,
      },
    },
  ],
}
