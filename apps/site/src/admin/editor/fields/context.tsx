"use client"

import { createContext, useContext } from "react"

import type { MediaOption } from "../../components/MediaSelect"
import type { Segment } from "./values"

/** A Page the Block tab can link to. */
export type PageOption = { id: number; title: string; path: string }

/** What every field renderer needs from the Block tab. */
export type FieldsEnv = {
  /** Makes element ids unique across Blocks. */
  idPrefix: string
  /** The selected Block's values: what conditions and validation read. */
  block: Record<string, unknown>
  media: readonly MediaOption[]
  pages: readonly PageOption[]
  /** Fields the Staff User has touched; only those show their errors. */
  touched: ReadonlySet<string>
  touch: (path: readonly Segment[]) => void
  /** Puts `value` at `path`, which is relative to the Block. */
  write: (path: readonly Segment[], value: unknown) => void
}

const FieldsContext = createContext<FieldsEnv | null>(null)

export const FieldsProvider = FieldsContext.Provider

export function useFields(): FieldsEnv {
  const env = useContext(FieldsContext)
  if (!env) throw new Error("useFields must be used inside <FieldsProvider>")
  return env
}

export const pathKey = (path: readonly Segment[]) => path.join(".")

/** An element id for the field at `path`. */
export const fieldId = (env: FieldsEnv, path: readonly Segment[]) =>
  `${env.idPrefix}-${pathKey(path)}`.replace(/[^A-Za-z0-9_-]/g, "-")
