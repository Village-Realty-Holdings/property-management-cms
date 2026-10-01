import type { UIFieldServerComponent } from "payload"

import {
  builtInVariableSources,
  isBuiltInVariable,
  variableValuesFrom,
} from "@workspace/content/shared"

import { findActiveSite } from "../components/admin/activeSite"
import { VariablesCheck } from "./VariablesCheck"

type ID = number | string

const idOf = (ref: unknown): ID | undefined =>
  ref && typeof ref === "object"
    ? (ref as { id?: ID }).id
    : ((ref as ID | null | undefined) ?? undefined)

/**
 * The Variables help panel in the sidebar of Pages and Guides: each Variable
 * of the document's Site (the selected Site for a new document) with its
 * current value, and live warnings for the copy being edited.
 */
export const VariablesHelp: UIFieldServerComponent = async ({
  data,
  payload,
  req,
}) => {
  const siteID = idOf((data as { site?: unknown } | undefined)?.site)
  const site =
    siteID !== undefined
      ? await payload
          .findByID({
            collection: "sites",
            id: siteID,
            depth: 0,
            disableErrors: true,
            overrideAccess: false,
            user: req.user,
          })
          .catch(() => null)
      : await findActiveSite(payload, req.user)
  if (!site) return null
  const values = variableValuesFrom(site)

  return (
    <details className="variables-help" open>
      <summary className="variables-help__title">Variables</summary>
      <p className="variables-help__intro">
        Type a Variable, braces included, in copy, SEO fields or links. The Site
        shows its current value from Site Settings.
      </p>
      <VariablesCheck values={values} />
      <dl className="variables-help__list">
        {Object.entries(values).map(([name, value]) => (
          <div className="variables-help__item" key={name}>
            <dt>
              <code>{`{${name}}`}</code>
            </dt>
            <dd
              title={
                isBuiltInVariable(name)
                  ? builtInVariableSources[name]
                  : "Custom Variable"
              }
            >
              {value || <em className="variables-help__empty">empty</em>}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  )
}
