"use client"

import { PlusIcon, XIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Switch } from "@workspace/ui/components/switch"

import { describedBy, FormField } from "../../components/FormBits"
import type { PreviewPage } from "../../layouts/layoutScreen"
import { useEditor } from "../EditorProvider"

/**
 * The Layout tab: the Layout's name, the paths it covers and whether it is the
 * Site's default, and which Page the canvas shows it around. Every change is
 * dispatched at once, like the Block tab's, and goes live only on Save.
 */
export function LayoutSettingsTab({
  preview,
  previewError,
}: {
  /** The Page the canvas shows the Layout around, or null for an empty Page. */
  preview: PreviewPage | null
  /** Set when the last Page picked for the preview could not be loaded. */
  previewError?: string | null
}) {
  const { doc, state, setField } = useEditor()
  if (doc.kind !== "layout") return null

  // The Site always has exactly one default: a default Layout stays it until
  // another Layout is made the default, which clears this one.
  const wasDefault =
    state.baseline.kind === "layout" && state.baseline.isDefault
  const nameError =
    doc.name.trim() === "" ? "Give the Layout a name." : undefined

  return (
    <div className="flex flex-col gap-5 p-4">
      <FormField id="layout-name" label="Name" error={nameError}>
        <Input
          id="layout-name"
          value={doc.name}
          onChange={(event) => setField("name", event.target.value)}
          {...describedBy("layout-name", { error: nameError })}
        />
      </FormField>

      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="text-sm font-medium">Path prefixes</legend>
        <p
          id="layout-paths-description"
          className="text-sm text-muted-foreground"
        >
          Pages at or under these paths use this Layout, like /stays. The
          longest match wins, and a path belongs to one Layout.
        </p>
        {doc.paths.length === 0 && (
          <p className="text-sm text-muted-foreground">No paths yet.</p>
        )}
        <ul className="flex flex-col gap-2">
          {doc.paths.map((path, index) => (
            // Rows are told apart by position: a path has no id of its own.
            <li key={index} className="flex items-center gap-2">
              <Input
                aria-label={`Path ${index + 1}`}
                aria-describedby="layout-paths-description"
                placeholder="/stays"
                value={path}
                onChange={(event) =>
                  setField(`paths.${index}`, event.target.value)
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove path ${index + 1}`}
                onClick={() =>
                  setField(
                    "paths",
                    doc.paths.filter((_, at) => at !== index)
                  )
                }
              >
                <XIcon aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setField("paths", [...doc.paths, ""])}
        >
          <PlusIcon aria-hidden />
          Add path
        </Button>
      </fieldset>

      <FormField
        id="layout-default"
        label="Default Layout"
        description={
          wasDefault
            ? "This is the Site's default. To change it, make another Layout the default."
            : "Pages that no path or choice covers use the default. Making this the default takes it from the current one."
        }
      >
        <Switch
          id="layout-default"
          checked={doc.isDefault}
          disabled={wasDefault}
          onCheckedChange={(checked) => setField("isDefault", checked)}
          {...describedBy("layout-default", { description: true })}
        />
      </FormField>

      <section
        aria-label="Preview"
        className="flex flex-col gap-1 border-t pt-4 text-sm"
      >
        <h2 className="font-medium">Preview</h2>
        {preview ? (
          <p className="text-muted-foreground">
            Shown around {preview.title} ({preview.path}). Press Ctrl-K to try
            another Page.
          </p>
        ) : (
          <p className="text-muted-foreground">
            No Page to show it around yet. Press Ctrl-K to pick one.
          </p>
        )}
        {previewError && (
          <p role="alert" className="text-destructive">
            {previewError}
          </p>
        )}
      </section>
    </div>
  )
}
