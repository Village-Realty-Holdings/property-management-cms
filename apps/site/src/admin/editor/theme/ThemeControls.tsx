"use client"

import { useId, type ReactNode } from "react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import type { AvailableFont } from "../../../fonts/available"
import {
  BRAND_PRESETS,
  BUTTON_CORNERS,
  BUTTON_LETTERS,
  BUTTON_STYLES,
  BUTTON_TEXTS,
  BUTTON_WEIGHTS,
  CARD_CORNERS,
  derivePalette,
  describeChanges,
  GENERAL_PRESETS,
  HEADING_CASES,
  HEADING_WEIGHTS,
  INPUT_HELP,
  INPUT_LABELS,
  MOTIONS,
  NEUTRAL_TINTS,
  presetInputs,
  SHADOWS,
  SPACINGS,
  type ThemeInputKey,
  type ThemeInputs,
  type ThemePreset,
} from "../../../theme"
import { ChoiceGroup } from "./ChoiceGroup"
import { ColourField } from "./ColourField"
import { ContrastWarnings } from "./ContrastWarnings"
import { FontField } from "./FontField"

/** Where a Staff User adds a Google Font or uploads one. */
const FONTS_ADMIN_PATH = "/admin/settings/assets/fonts"

/**
 * The Theme controls: Presets, Colours, Fonts, Type, Corners, Spacing,
 * Shadows, Buttons and Motion, then the contrast warnings under Colours.
 * Controlled: it shows `value` and reports every edit, preset or fix as a
 * whole new set of inputs through `onChange`. There is no per-token editing.
 */
export function ThemeControls({
  value,
  onChange,
  fonts,
}: {
  value: ThemeInputs
  onChange: (next: ThemeInputs) => void
  /** The built-in quick picks and stored Fonts the Site has. */
  fonts: readonly AvailableFont[]
}) {
  const set = <K extends ThemeInputKey>(key: K, next: ThemeInputs[K]) =>
    onChange({ ...value, [key]: next })
  const label = (key: ThemeInputKey) => INPUT_LABELS[key]

  /** A pick from a short list, labelled and helped from the shared tables. */
  const choice = <K extends Exclude<ThemeInputKey, ColourKey | FontKey>>(
    key: K,
    options: readonly { value: ThemeInputs[K]; label: string; hint?: string }[],
    hideLabel = false
  ) => (
    <ChoiceGroup
      label={label(key)}
      hideLabel={hideLabel}
      help={INPUT_HELP[key]}
      options={options}
      value={value[key]}
      onChange={(next) => set(key, next)}
    />
  )

  return (
    <div className="flex flex-col gap-6">
      <Section title="Presets">
        <PresetList
          title="General"
          presets={GENERAL_PRESETS}
          value={value}
          fonts={fonts}
          onChange={onChange}
        />
        {BRAND_PRESETS.length > 0 && (
          <PresetList
            title="Brand"
            presets={BRAND_PRESETS}
            value={value}
            fonts={fonts}
            onChange={onChange}
          />
        )}
      </Section>

      <Section title="Colours">
        <ColourField
          label={label("primary")}
          value={value.primary}
          onChange={(hex) => set("primary", hex)}
        />
        <ColourField
          label={label("accent")}
          value={value.accent}
          onChange={(hex) => set("accent", hex)}
        />
        <OptionalColour
          label={label("third")}
          value={value.third}
          addLabel="Add a third colour"
          removeLabel="Remove the third colour"
          startWith={value.primary}
          onChange={(hex) => set("third", hex)}
        />
        <ColourField
          label={label("text")}
          value={value.text}
          onChange={(hex) => set("text", hex)}
        />
        <OptionalColour
          label={label("darkSurface")}
          value={value.darkSurface}
          addLabel="Choose a dark surface"
          removeLabel="Derive the dark surface again"
          startWith={derivePalette(value).surfaceDark}
          unsetNote="Derived from the text colour."
          onChange={(hex) => set("darkSurface", hex)}
        />
        {choice("neutralTint", NEUTRAL_TINTS)}
        <ContrastWarnings value={value} onChange={onChange} />
      </Section>

      <Section title="Fonts">
        <FontField
          label={label("headingFont")}
          value={value.headingFont}
          fonts={fonts}
          onChange={(key) => set("headingFont", key)}
        />
        <FontField
          label={label("bodyFont")}
          value={value.bodyFont}
          fonts={fonts}
          onChange={(key) => set("bodyFont", key)}
        />
        <a
          href={FONTS_ADMIN_PATH}
          className="text-sm underline underline-offset-2"
        >
          Add a Google Font in Assets › Fonts
        </a>
      </Section>

      <Section title="Type">
        {choice("headingWeight", HEADING_WEIGHTS)}
        {choice("headingCase", HEADING_CASES)}
      </Section>

      <Section title="Corners">
        {choice("buttonCorners", BUTTON_CORNERS)}
        {choice("cardCorners", CARD_CORNERS)}
      </Section>

      <Section title="Spacing">{choice("spacing", SPACINGS, true)}</Section>

      <Section title="Shadows">{choice("shadows", SHADOWS, true)}</Section>

      <Section title="Buttons">
        {choice("buttonStyle", BUTTON_STYLES)}
        {choice("buttonLetters", BUTTON_LETTERS)}
        {choice("buttonWeight", BUTTON_WEIGHTS)}
        {choice("buttonText", BUTTON_TEXTS)}
      </Section>

      <Section title="Motion">{choice("motion", MOTIONS, true)}</Section>
    </div>
  )
}

type ColourKey = "primary" | "accent" | "third" | "text" | "darkSurface"
type FontKey = "headingFont" | "bodyFont"

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h3
        id={id}
        className="border-b pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
      >
        {title}
      </h3>
      {children}
    </section>
  )
}

function PresetList({
  title,
  presets,
  value,
  fonts,
  onChange,
}: {
  title: string
  presets: readonly ThemePreset[]
  value: ThemeInputs
  fonts: readonly AvailableFont[]
  onChange: (next: ThemeInputs) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <h4 className="text-sm font-medium">{title}</h4>
      <ul className="grid grid-cols-2 gap-2">
        {presets.map((preset) => (
          <li key={preset.id} className="contents">
            <PresetButton
              preset={preset}
              value={value}
              fonts={fonts}
              onChange={onChange}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

function PresetButton({
  preset,
  value,
  fonts,
  onChange,
}: {
  preset: ThemePreset
  value: ThemeInputs
  fonts: readonly AvailableFont[]
  onChange: (next: ThemeInputs) => void
}) {
  const id = useId()
  const inputs = presetInputs(preset, fonts)
  const inUse = describeChanges(value, inputs).length === 0
  const swatches = [inputs.primary, inputs.accent, inputs.third].filter(
    (colour): colour is string => colour !== null
  )

  return (
    <button
      type="button"
      // The name is the preset's; its blurb is the description.
      aria-label={preset.name}
      aria-describedby={id}
      aria-pressed={inUse}
      onClick={() => onChange(inputs)}
      className={cn(
        "flex flex-col items-start gap-1 rounded-lg border bg-card p-2 text-left text-card-foreground transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        inUse && "border-foreground bg-muted"
      )}
    >
      <span className="flex items-center gap-1.5" aria-hidden="true">
        {swatches.map((colour) => (
          <span
            key={colour}
            className="size-3.5 rounded-full border"
            style={{ background: colour }}
          />
        ))}
        <span className="text-sm font-medium">{preset.name}</span>
      </span>
      <span
        id={id}
        aria-hidden="true"
        // Not muted-foreground: it is under 4.5:1 on the muted fill of the
        // preset in use.
        className="text-xs text-foreground/70"
      >
        {preset.blurb}
      </span>
    </button>
  )
}

/**
 * A colour that may be unset (the third colour, the dark surface). Unset
 * shows a button to set it, from `startWith`; set shows the colour and a
 * button to unset it.
 */
function OptionalColour({
  label,
  value,
  addLabel,
  removeLabel,
  startWith,
  unsetNote,
  onChange,
}: {
  label: string
  value: string | null
  addLabel: string
  removeLabel: string
  startWith: string
  unsetNote?: string
  onChange: (hex: string | null) => void
}) {
  if (value === null)
    return (
      <div className="flex flex-col items-start gap-1.5">
        <span className="text-sm font-medium">{label}</span>
        {unsetNote && (
          <p className="text-xs text-muted-foreground">{unsetNote}</p>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange(startWith)}
        >
          {addLabel}
        </Button>
      </div>
    )
  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="w-full">
        <ColourField label={label} value={value} onChange={onChange} />
      </div>
      <Button
        type="button"
        size="xs"
        variant="ghost"
        onClick={() => onChange(null)}
      >
        {removeLabel}
      </Button>
    </div>
  )
}
