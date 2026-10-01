"use client"

import { useRef } from "react"
import { PlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import { Textarea } from "@workspace/ui/components/textarea"

import { saveBrand } from "../actions/brand"
import { SOCIAL_PLATFORMS, type BrandValues } from "../brandForm"
import { InlineError, PageHeader, UnsavedChangesGuard } from "../kit"
import { describedBy, FormField, Section } from "./FormBits"
import { MediaSelect, type MediaOption } from "./MediaSelect"
import { useSettingsEditor } from "./useSettingsEditor"

const FORM_ID = "brand-form"

/**
 * The Brand screen: Identity, Contact and Social. Saves through a Server
 * Action as the Staff User, and asks before leaving with unsaved changes.
 */
export function BrandForm({
  initial,
  media,
}: {
  initial: BrandValues
  media: MediaOption[]
}) {
  const editor = useSettingsEditor({ initial, save: saveBrand })
  const { values, fieldErrors, state, pending } = editor
  const addLink = useRef<HTMLButtonElement>(null)

  const set = <K extends keyof BrandValues>(key: K, value: BrandValues[K]) =>
    editor.setValues((current) => ({ ...current, [key]: value }))
  const setLink = (index: number, patch: Partial<BrandValues["social"][0]>) =>
    set(
      "social",
      values.social.map((link, i) =>
        i === index ? { ...link, ...patch } : link
      )
    )

  return (
    <>
      <PageHeader
        title="Brand"
        description="Your Site's name, logo, contact details and social links."
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
          title="Identity"
          description="How the Site names itself in its header and in search results."
        >
          <TextField
            id="brand-name"
            label="Site name"
            value={values.name}
            error={fieldErrors.name}
            required
            autoComplete="organization"
            onChange={(name) => set("name", name)}
          />
          <TextField
            id="brand-tagline"
            label="Tagline"
            description="A short line under the Site name."
            value={values.tagline}
            error={fieldErrors.tagline}
            onChange={(tagline) => set("tagline", tagline)}
          />
          <FormField
            id="brand-logo"
            label="Logo"
            description="Shown in the Site's header."
            error={fieldErrors.logo}
          >
            <MediaSelect
              id="brand-logo"
              value={values.logo}
              options={media}
              onChange={(logo) => set("logo", logo)}
            />
          </FormField>
        </Section>

        <Section
          title="Contact"
          description="Shown in the Site's footer and contact areas."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="brand-phone"
              label="Phone"
              type="tel"
              autoComplete="tel"
              value={values.phone}
              error={fieldErrors["contact.phone"]}
              placeholder="+1 555 010 0100"
              onChange={(phone) => set("phone", phone)}
            />
            <TextField
              id="brand-email"
              label="Email"
              type="email"
              autoComplete="email"
              value={values.email}
              error={fieldErrors["contact.email"]}
              onChange={(email) => set("email", email)}
            />
          </div>
          <FormField
            id="brand-address"
            label="Address"
            error={fieldErrors["contact.address"]}
          >
            <Textarea
              id="brand-address"
              rows={3}
              autoComplete="street-address"
              value={values.address}
              onChange={(event) => set("address", event.target.value)}
              {...describedBy("brand-address", {
                error: fieldErrors["contact.address"],
              })}
            />
          </FormField>
        </Section>

        <Section
          title="Social"
          description="Links to your profiles. Each needs a full web address starting with https://."
        >
          {values.social.length === 0 && (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              No social links yet.
            </p>
          )}
          {values.social.map((link, index) => {
            const platformId = `brand-social-${index}-platform`
            const urlId = `brand-social-${index}-url`
            return (
              <div
                key={index}
                role="group"
                aria-label={`Social link ${index + 1}`}
                className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-start"
              >
                <FormField
                  id={platformId}
                  label="Platform"
                  error={fieldErrors[`social.${index}.platform`]}
                >
                  <NativeSelect
                    id={platformId}
                    value={link.platform}
                    onChange={(event) =>
                      setLink(index, { platform: event.target.value })
                    }
                    {...describedBy(platformId, {
                      error: fieldErrors[`social.${index}.platform`],
                    })}
                  >
                    <NativeSelectOption value="" disabled>
                      Choose…
                    </NativeSelectOption>
                    {SOCIAL_PLATFORMS.map((platform) => (
                      <NativeSelectOption
                        key={platform.value}
                        value={platform.value}
                      >
                        {platform.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </FormField>
                <TextField
                  id={urlId}
                  label="URL"
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  value={link.url}
                  error={fieldErrors[`social.${index}.url`]}
                  onChange={(url) => setLink(index, { url })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="sm:mt-6"
                  aria-label={`Remove social link ${index + 1}`}
                  onClick={() => {
                    set(
                      "social",
                      values.social.filter((_, i) => i !== index)
                    )
                    addLink.current?.focus()
                  }}
                >
                  <Trash2Icon />
                </Button>
              </div>
            )
          })}
          <div>
            <Button
              ref={addLink}
              type="button"
              variant="outline"
              onClick={() =>
                set("social", [...values.social, { platform: "", url: "" }])
              }
            >
              <PlusIcon /> Add social link
            </Button>
          </div>
        </Section>
      </form>
    </>
  )
}

function TextField({
  id,
  label,
  description,
  value,
  error,
  onChange,
  ...input
}: {
  id: string
  label: string
  description?: string
  value: string
  error?: string
  onChange: (value: string) => void
} & Omit<React.ComponentProps<"input">, "id" | "value" | "onChange">) {
  return (
    <FormField id={id} label={label} description={description} error={error}>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...describedBy(id, { description, error })}
        {...input}
      />
    </FormField>
  )
}
