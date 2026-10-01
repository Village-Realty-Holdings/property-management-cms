import type { TextField } from "payload"

/**
 * A read-only "Site" list column: the name of the document's Site.
 *
 * The multi-tenant plugin's `site` field has `disableListColumn: true`, so
 * with every Site selected in the header nothing shows which Site a row
 * belongs to. This virtual field (no database column) reads `site.name`
 * instead. Hidden on the edit form, where the Site field already shows.
 */
export function siteColumn(): TextField {
  return {
    name: "siteName",
    label: "Site",
    type: "text",
    virtual: "site.name",
    admin: {
      readOnly: true,
      disableListFilter: true,
      disableBulkEdit: true,
      condition: () => false,
    },
  }
}
