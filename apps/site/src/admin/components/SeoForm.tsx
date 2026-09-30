"use client"

import { TriangleAlertIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { saveSeo } from "../actions/seo"
import { InlineError, PageHeader, UnsavedChangesGuard } from "../kit"
import {
  describeDescriptionLength,
  titleExample,
  type SeoValues,
} from "../seoForm"
import { describedBy, FormField, Section } from "./FormBits"
import { MediaSelect, type MediaOption } from "./MediaSelect"
import { useSettingsEditor } from "./useSettingsEditor"

const FORM_ID = "seo-form"

/**
 * The SEO screen's defaults form: how the Site appears in search results and
 * link previews when a Page has no SEO of its own. Saves through a Server
 * Action as the Staff User, and asks before leaving with unsaved changes.
 */
export function SeoForm({
  initial,
  media,
  siteName,
}: {
  initial: SeoValues
  media: MediaOption[]
  /** The Brand's name, for the title example. */
  siteName: string
}) {
  const editor = useSettingsEditor({ initial, save: saveSeo })
  const { values, fieldErrors, state, pending } = editor

  const set = <K extends keyof SeoValues>(key: K, value: SeoValues[K]) =>
    editor.setValues((current) => ({ ...current, [key]: value }))

  const example = titleExample(values.titlePattern, siteName)
  const length = describeDescriptionLength(values.description)

  return (
    <>
      <PageHeader
        title="SEO"
        description="How your Site appears in search results and when its links are shared."
        action={
          <>
            {editor.dirty && (
              <span role="status" className="text-sm text-muted-foreground">
                Unsaved changes
              </span>
            )}
            <Button type="submit" form={FORM_ID} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </>
        }
      />
      <UnsavedChangesGuard dirty={editor.dirty} onSave={editor.submit} />

      <form
        id={FORM_ID}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (!pending) void editor.submit()
        }}
        className="flex max-w-3xl flex-col gap-6"
      >
        {state.ok === false && state.message && (
          <InlineError>{state.message}</InlineError>
        )}

        <Section
          title="Defaults"
          description="Used for every Page that has no SEO of its own. A Page's own SEO overrides these."
        >
          <FormField
            id="seo-title-pattern"
            label="Title pattern"
            description="How Page titles read in search results and the browser tab. Use %s for the Page title and {name} for the Site name. Leave empty for the default, %s · {name}."
            error={fieldErrors.titlePattern}
          >
            <Input
              id="seo-title-pattern"
              value={values.titlePattern}
              placeholder="%s · {name}"
              spellCheck={false}
              onChange={(event) => set("titlePattern", event.target.value)}
              {...describedBy("seo-title-pattern", {
                description: true,
                also: ["seo-title-example"],
                error: fieldErrors.titlePattern,
              })}
            />
          </FormField>
          <p
            id="seo-title-example"
            className="-mt-2 text-sm text-muted-foreground"
          >
            Example:{" "}
            <span className="font-medium text-foreground">{example}</span>
          </p>

          <FormField
            id="seo-description"
            label="Default description"
            description="The summary shown under the title in search results, for Pages without their own."
            error={fieldErrors.description}
          >
            <Textarea
              id="seo-description"
              rows={3}
              value={values.description}
              onChange={(event) => set("description", event.target.value)}
              {...describedBy("seo-description", {
                description: true,
                also: ["seo-description-length"],
                error: fieldErrors.description,
              })}
            />
          </FormField>
          <p
            id="seo-description-length"
            className={cn(
              "-mt-2 text-sm",
              length.tone === "warn"
                ? "text-amber-700 dark:text-amber-400"
                : "text-muted-foreground"
            )}
          >
            {length.text}
          </p>

          <FormField
            id="seo-image"
            label="Social share image"
            description="Shown when a Page without its own SEO image is shared on social media."
            error={fieldErrors.image}
          >
            <MediaSelect
              id="seo-image"
              value={values.image}
              options={media}
              onChange={(image) => set("image", image)}
            />
          </FormField>

          <FormField
            id="seo-favicon"
            label="Favicon"
            description="The icon in browser tabs. A square PNG works best."
            error={fieldErrors.favicon}
          >
            <MediaSelect
              id="seo-favicon"
              value={values.favicon}
              options={media}
              onChange={(favicon) => set("favicon", favicon)}
            />
          </FormField>
        </Section>

        <Section
          title="Search engines"
          description="Whether search engines may list your Site."
        >
          <FormField
            id="seo-allow-indexing"
            label="Allow search engines to index the Site"
            description="On, your Published Pages can appear in search results and are listed in sitemap.xml."
            error={fieldErrors.allowIndexing}
          >
            <Switch
              id="seo-allow-indexing"
              checked={values.allowIndexing}
              onCheckedChange={(checked) => set("allowIndexing", checked)}
              {...describedBy("seo-allow-indexing", {
                description: true,
                error: fieldErrors.allowIndexing,
              })}
            />
          </FormField>
          {!values.allowIndexing && (
            <p
              role="status"
              className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
            >
              <TriangleAlertIcon
                aria-hidden
                className="mt-0.5 size-4 shrink-0"
              />
              <span>
                Indexing is off. Every page will ask search engines to skip it
                and robots.txt will disallow the whole Site, so visitors will
                not find you on Google. Keep this off only while the Site is
                being built.
              </span>
            </p>
          )}
        </Section>
      </form>
    </>
  )
}
