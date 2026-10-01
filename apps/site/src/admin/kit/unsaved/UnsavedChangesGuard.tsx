"use client"

import { UnsavedChangesDialog } from "./UnsavedChangesDialog"
import {
  useUnsavedChangesGuard,
  type UseUnsavedChangesGuardOptions,
} from "./useUnsavedChangesGuard"

/**
 * Drop into any editor to guard it:
 *
 *   <UnsavedChangesGuard dirty={dirty} onSave={save} onDiscard={reset} />
 *
 * It renders nothing until the user tries to leave with unsaved changes.
 */
export function UnsavedChangesGuard(options: UseUnsavedChangesGuardOptions) {
  const { dialog } = useUnsavedChangesGuard(options)
  return <UnsavedChangesDialog {...dialog} />
}
