"use client"

import { useActionState, useState } from "react"
import { PlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import { Textarea } from "@workspace/ui/components/textarea"

import { saveSettings, type SettingsValues } from "../actions/settings"
import { FormField, FormMessage, Section } from "./FormBits"
import { MediaSelect, type MediaOption } from "./MediaSelect"

type Platform = NonNullable<SettingsValues["social"]>[number]["platform"]

const platforms: { value: Platform; label: string }[] = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "x", label: "X" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
]

export type SettingsFormValues = {
  name: string
  tagline: string
  domain: string
  contact: { phone: string; email: string; address: string }
  branding: {
    logo: number | null
    primaryColor: string
    accentColor: string
    fontPairing: "classic" | "modern" | "rustic"
  }
  social: { platform: Platform; url: string }[]
}

const orNull = (value: string) => value.trim() || null

function toSettings(values: SettingsFormValues): SettingsValues {
  return {
    name: values.name,
    tagline: orNull(values.tagline),
    domain: orNull(values.domain),
    contact: {
      phone: orNull(values.contact.phone),
      email: orNull(values.contact.email),
      address: orNull(values.contact.address),
    },
    branding: {
      logo: values.branding.logo,
      primaryColor: orNull(values.branding.primaryColor),
      accentColor: orNull(values.branding.accentColor),
      fontPairing: values.branding.fontPairing,
    },
    social: values.social,
  }
}

/** Site Settings: general details, contact, branding and social links. */
export function SettingsForm({
  initial,
  media,
}: {
  initial: SettingsFormValues
  media: MediaOption[]
}) {
  const [values, setValues] = useState(initial)
  const [state, action, pending] = useActionState(saveSettings, {})
  const errors = state.fieldErrors ?? {}
  const set = <K extends keyof SettingsFormValues>(
    key: K,
    value: SettingsFormValues[K]
  ) => setValues((current) => ({ ...current, [key]: value }))
  const contact = (patch: Partial<SettingsFormValues["contact"]>) =>
    set("contact", { ...values.contact, ...patch })
  const branding = (patch: Partial<SettingsFormValues["branding"]>) =>
    set("branding", { ...values.branding, ...patch })

  return (
    <form action={action} className="flex flex-col gap-6">
      <input
        type="hidden"
        name="values"
        value={JSON.stringify(toSettings(values))}
      />
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Site Settings</h1>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
      <FormMessage state={state} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="General">
          <FormField id="name" label="Site name" error={errors.name}>
            <Input
              id="name"
              value={values.name}
              required
              onChange={(e) => set("name", e.target.value)}
            />
          </FormField>
          <FormField
            id="tagline"
            label="Tagline"
            description="A short line under the Site name, also used in page metadata."
            error={errors.tagline}
          >
            <Input
              id="tagline"
              value={values.tagline}
              onChange={(e) => set("tagline", e.target.value)}
            />
          </FormField>
          <FormField id="domain" label="Domain" error={errors.domain}>
            <Input
              id="domain"
              value={values.domain}
              placeholder="www.example.com"
              onChange={(e) => set("domain", e.target.value)}
            />
          </FormField>
        </Section>

        <Section title="Contact" description="Shown in the Site's footer.">
          <FormField id="phone" label="Phone" error={errors["contact.phone"]}>
            <Input
              id="phone"
              value={values.contact.phone}
              onChange={(e) => contact({ phone: e.target.value })}
            />
          </FormField>
          <FormField id="email" label="Email" error={errors["contact.email"]}>
            <Input
              id="email"
              type="email"
              value={values.contact.email}
              onChange={(e) => contact({ email: e.target.value })}
            />
          </FormField>
          <FormField
            id="address"
            label="Address"
            error={errors["contact.address"]}
          >
            <Textarea
              id="address"
              value={values.contact.address}
              onChange={(e) => contact({ address: e.target.value })}
            />
          </FormField>
        </Section>

        <Section
          title="Branding"
          description="The Site's logo, colours and fonts."
        >
          <FormField id="logo" label="Logo" error={errors["branding.logo"]}>
            <MediaSelect
              id="logo"
              value={values.branding.logo}
              options={media}
              onChange={(logo) => branding({ logo })}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField
              id="primaryColor"
              label="Primary colour"
              description="Header, buttons and links."
              value={values.branding.primaryColor}
              error={errors["branding.primaryColor"]}
              onChange={(primaryColor) => branding({ primaryColor })}
            />
            <ColorField
              id="accentColor"
              label="Accent colour"
              description="Highlights."
              value={values.branding.accentColor}
              error={errors["branding.accentColor"]}
              onChange={(accentColor) => branding({ accentColor })}
            />
          </div>
          <FormField
            id="fontPairing"
            label="Fonts"
            error={errors["branding.fontPairing"]}
          >
            <NativeSelect
              id="fontPairing"
              value={values.branding.fontPairing}
              onChange={(e) =>
                branding({
                  fontPairing: e.target
                    .value as SettingsFormValues["branding"]["fontPairing"],
                })
              }
            >
              <NativeSelectOption value="classic">
                Classic (serif headings)
              </NativeSelectOption>
              <NativeSelectOption value="modern">
                Modern (geometric sans)
              </NativeSelectOption>
              <NativeSelectOption value="rustic">
                Rustic (slab headings)
              </NativeSelectOption>
            </NativeSelect>
          </FormField>
        </Section>

        <Section
          title="Social links"
          actions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                set("social", [
                  ...values.social,
                  { platform: "facebook", url: "" },
                ])
              }
            >
              <PlusIcon /> Add link
            </Button>
          }
        >
          {values.social.length === 0 && (
            <p className="text-sm text-muted-foreground">No social links.</p>
          )}
          {values.social.map((link, index) => (
            <div key={index} className="flex items-end gap-2">
              <FormField id={`social-${index}-platform`} label="Platform">
                <NativeSelect
                  id={`social-${index}-platform`}
                  value={link.platform}
                  onChange={(e) =>
                    set(
                      "social",
                      values.social.map((l, i) =>
                        i === index
                          ? { ...l, platform: e.target.value as Platform }
                          : l
                      )
                    )
                  }
                >
                  {platforms.map((p) => (
                    <NativeSelectOption key={p.value} value={p.value}>
                      {p.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField
                id={`social-${index}-url`}
                label="URL"
                error={errors[`social.${index}.url`]}
              >
                <Input
                  id={`social-${index}-url`}
                  value={link.url}
                  placeholder="https://"
                  onChange={(e) =>
                    set(
                      "social",
                      values.social.map((l, i) =>
                        i === index ? { ...l, url: e.target.value } : l
                      )
                    )
                  }
                />
              </FormField>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove link"
                onClick={() =>
                  set(
                    "social",
                    values.social.filter((_, i) => i !== index)
                  )
                }
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
        </Section>
      </div>
    </form>
  )
}

function ColorField({
  id,
  label,
  description,
  value,
  error,
  onChange,
}: {
  id: string
  label: string
  description: string
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  const valid = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
  return (
    <FormField id={id} label={label} description={description} error={error}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={valid && value.length === 7 ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 shrink-0 cursor-pointer rounded-md border bg-transparent"
        />
        <Input
          id={id}
          value={value}
          placeholder="#1f4d3a"
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </FormField>
  )
}
