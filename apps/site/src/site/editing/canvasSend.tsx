"use client"

import { createContext, useContext } from "react"

import type { CanvasRequest } from "../../admin/editor/bridge"

/**
 * How the canvas tells the Admin what the Staff User asked for (see
 * bridge.ts). The canvas provides it around the Blocks it draws; editing
 * controls inside a Block (plain text, rich text) send their edits through it.
 * Outside the canvas there is none, and they send nothing.
 */
export const CanvasSendContext = createContext<
  ((request: CanvasRequest) => void) | null
>(null)

export const useCanvasSend = () => useContext(CanvasSendContext)
