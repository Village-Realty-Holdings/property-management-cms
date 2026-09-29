"use client"

import { createContext, useContext, type ReactNode } from "react"

import type { Image } from "@workspace/content/queries"

import type { FormState } from "./validation"

/** The public details of a Property an inquiry is about. */
export type InquiryProperty = {
  slug: string
  name: string
  location: string | null
  sleeps: number | null
  image: Image | null
}

/**
 * The Server Actions the Site's forms call. They belong to the Site's
 * deployment (apps/site), which passes them in with `FormActionsProvider`.
 * Without it (a Preview in the CMS) forms don't send.
 */
export type FormActions = {
  submit: (
    kind: unknown,
    previous: FormState,
    formData: FormData
  ) => Promise<FormState>
  findInquiryProperty: (slug: unknown) => Promise<InquiryProperty | null>
}

const notSent: FormActions = {
  submit: async (_kind, previous) => ({
    ...previous,
    status: "failed",
    message: "Forms don't send from a preview.",
  }),
  findInquiryProperty: async () => null,
}

const FormActionsContext = createContext<FormActions>(notSent)

export function FormActionsProvider({
  actions,
  children,
}: {
  actions: FormActions
  children: ReactNode
}) {
  return (
    <FormActionsContext.Provider value={actions}>
      {children}
    </FormActionsContext.Provider>
  )
}

export function useFormActions(): FormActions {
  return useContext(FormActionsContext)
}
