/**
 * The Admin UX kit: the shared pieces every Admin screen is built from.
 * Import from "@/admin/kit". Everything here is a client-safe module; the
 * components marked "use client" can be used from Server Components.
 *
 * ## Rules the kit implements (Phase 1, "UX rules across the Admin")
 *
 * | Rule                                        | Use                                    |
 * | ------------------------------------------- | -------------------------------------- |
 * | One page header: title, line, primary action| `<PageHeader>`                         |
 * | A toast confirms every save                 | `notify.saved()` / `useSaveToast()`    |
 * | Failures show inline                        | `<InlineError>`                        |
 * | Empty states offer the primary action       | `<EmptyState action={...}>`            |
 * | Destructive actions name their dependents   | `<ConfirmDialog dependents={[...]}>`   |
 * | Loading states use skeletons                | `<TableSkeleton>`, `<CardSkeleton>` ...|
 * | Visible focus, keyboard-only use            | `<AdminKitHost>` (focus ring, skip link, dialog focus trap) |
 * | Unsaved-changes guard on every editor       | `<UnsavedChangesGuard>`                |
 *
 * ## Recipes
 *
 * A screen:
 *
 *   <PageHeader title="Brand" description="Your name, logo and contact details."
 *               action={<Button type="submit" form="brand">Save</Button>} />
 *
 * A form that saves through a Server Action (`FormState` from ../formState):
 *
 *   const [state, action] = useActionState(saveBrand, initialFormState)
 *   useSaveToast(state)                               // success -> toast
 *   {state.ok === false && <InlineError>{state.message}</InlineError>}
 *
 * An editor with unsaved changes (Page, Layout, Theme, Brand, SEO):
 *
 *   const dirty = isDirty(savedValues, values)        // or useDirtyState()
 *   <UnsavedChangesGuard
 *     dirty={dirty}
 *     onSave={() => save(values)}     // return { ok: false, message } to fail
 *     onDiscard={() => reset()}       // optional
 *   />
 *
 * The guard covers link clicks, back/forward and closing or reloading the tab.
 * Programmatic navigation from your own code must use the guarded router:
 *
 *   const { dialog, router } = useUnsavedChangesGuard({ dirty, onSave })
 *   router.push("/admin/pages")        // asks first while dirty
 *   <UnsavedChangesDialog {...dialog} />
 *
 * After a successful save, make `dirty` false (update the saved baseline) or
 * navigate with the raw router: a save that redirects is not a "leave".
 *
 * ## How the guard is verified
 *
 * Unit and DOM tests (jsdom) cover the decision machine, the link, back/forward
 * and beforeunload handling, the hook and the dialog. Two things only a real
 * browser can show, checked by hand in Chromium against `next dev` with a
 * throwaway page holding an editor: (1) window `popstate` listeners run in
 * registration order, so the guard's must come first: `<AdminKitHost>` installs
 * it in an effect, which runs before the app router's; (2) a reload of a dirty
 * editor shows the browser's `beforeunload` prompt. When you wire a real
 * editor, repeat: edit, press Back (dialog appears, URL unchanged), Stay, click
 * a sidebar link (dialog), Discard / Save, then reload while dirty (prompt).
 *
 * ## Not in the kit
 *
 * Mounting `<AdminKitHost />` is done once in app/(admin)/layout.tsx. Give the
 * Admin's main region `id="admin-main"` (a plain `<main>` also works) as the
 * skip link's target.
 */
export { AdminKitHost } from "./AdminKitHost"
export { ConfirmDialog } from "./ConfirmDialog"
export { summarizeDependents, type Dependent } from "./dependents"
export { EmptyState } from "./EmptyState"
export { InlineError } from "./InlineError"
export { PageHeader } from "./PageHeader"
export {
  CardSkeleton,
  PageHeaderSkeleton,
  Skeleton,
  TableSkeleton,
} from "./skeletons"
export { MAIN_CONTENT_ID, SkipLink } from "./SkipLink"
export {
  notify,
  saveToastMessage,
  useSaveToast,
  type SaveResultLike,
} from "./toast"

export { isDirty } from "./unsaved/dirty"
export { useDirtyState } from "./unsaved/useDirtyState"
export {
  reduceGuard,
  saveOutcome,
  type GuardEffect,
  type GuardEvent,
  type GuardState,
  type NavTarget,
  type SaveResult,
} from "./unsaved/guardMachine"
export { UnsavedChangesDialog } from "./unsaved/UnsavedChangesDialog"
export { UnsavedChangesGuard } from "./unsaved/UnsavedChangesGuard"
export {
  useUnsavedChangesGuard,
  type GuardedRouter,
  type UnsavedChangesDialogState,
  type UseUnsavedChangesGuardOptions,
} from "./unsaved/useUnsavedChangesGuard"
