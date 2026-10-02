"use client"

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react"

import { BlockPicker, type InsertTarget } from "./BlockPicker"

import {
  canRedo,
  canUndo,
  createEditorState,
  editorReducer,
  isEditorDirty,
  listPlace,
  type EditorAction,
  type EditorDocument,
  type BlockList,
  type EditorState,
  type Region,
} from "./state"
import type { BlockValues } from "../pageForm"

/** The editor's state and the ways to change it, for every part of the Visual Editor. */
export type EditorApi = {
  state: EditorState
  doc: EditorDocument
  selectedId: string | null
  isDirty: boolean
  canUndo: boolean
  canRedo: boolean
  dispatch: (action: EditorAction) => void
  setField: (path: string, value: unknown) => void
  /** Puts `block` at `index` in the Region, or in its Container `parentId`. */
  insertBlock: (
    region: Region,
    index: number,
    block: BlockValues,
    parentId?: string | null
  ) => void
  /** Reorders the Region's Blocks, or those of its Container `parentId`. */
  moveBlock: (
    region: Region,
    from: number,
    to: number,
    parentId?: string | null
  ) => void
  /** Moves the Block `id` to `index` in `list`, which can be another one. */
  moveBlockTo: (id: string, list: BlockList, index: number) => void
  duplicateBlock: (id: string) => void
  removeBlock: (id: string) => void
  select: (id: string) => void
  /**
   * A "+" was pressed, in the canvas or the Outline: a Block is wanted at
   * `index` in `region`, or in its Container `parentId`. It opens the Block
   * picker, which inserts the chosen Block there and selects it, unless the
   * provider was given its own `onInsertRequest`.
   */
  onInsertRequest: (
    region: Region,
    index: number,
    parentId?: string | null
  ) => void
  deselect: () => void
  undo: () => void
  redo: () => void
  discard: () => void
  /** `sent` is the document the save request carried; `doc` is what the server stored. */
  markSaved: (doc: EditorDocument, sent: EditorDocument) => void
}

const EditorContext = createContext<EditorApi | null>(null)

/**
 * Holds the document being edited. `initial` is read once, when the editor
 * opens; to edit another document, remount with a new `key`.
 */
export function EditorProvider({
  initial,
  onInsertRequest: customInsertRequest,
  children,
}: {
  initial: EditorDocument
  /** What a "+" does, in place of opening the Block picker. */
  onInsertRequest?: EditorApi["onInsertRequest"]
  children: ReactNode
}) {
  const [state, dispatch] = useReducer(
    editorReducer,
    initial,
    createEditorState
  )
  const [picking, setPicking] = useState<InsertTarget | null>(null)
  const onInsertRequest = useMemo(
    () =>
      customInsertRequest ??
      ((region: Region, index: number, parentId?: string | null) =>
        setPicking(
          parentId == null ? { region, index } : { region, index, parentId }
        )),
    [customInsertRequest]
  )

  const api = useMemo<EditorApi>(
    () => ({
      state,
      doc: state.doc,
      selectedId: state.selectedId,
      isDirty: isEditorDirty(state),
      canUndo: canUndo(state),
      canRedo: canRedo(state),
      dispatch,
      setField: (path, value) => dispatch({ type: "setField", path, value }),
      insertBlock: (region, index, block, parentId) =>
        dispatch({ type: "insertBlock", region, parentId, index, block }),
      moveBlock: (region, from, to, parentId) =>
        dispatch({ type: "moveBlock", region, parentId, from, to }),
      moveBlockTo: (id, list, index) =>
        dispatch({ type: "moveBlockTo", id, ...list, index }),
      duplicateBlock: (id) => dispatch({ type: "duplicateBlock", id }),
      removeBlock: (id) => dispatch({ type: "removeBlock", id }),
      select: (id) => dispatch({ type: "select", id }),
      onInsertRequest,
      deselect: () => dispatch({ type: "deselect" }),
      undo: () => dispatch({ type: "undo" }),
      redo: () => dispatch({ type: "redo" }),
      discard: () => dispatch({ type: "discard" }),
      markSaved: (doc, sent) => dispatch({ type: "markSaved", doc, sent }),
    }),
    [state, onInsertRequest]
  )

  return (
    <EditorContext.Provider value={api}>
      {children}
      <BlockPicker
        target={picking}
        inside={
          picking?.parentId == null
            ? undefined
            : (listPlace(state.doc, picking) ?? undefined)
        }
        onClose={() => setPicking(null)}
        onInsert={api.insertBlock}
      />
    </EditorContext.Provider>
  )
}

export function useEditor(): EditorApi {
  const api = useContext(EditorContext)
  if (!api) throw new Error("useEditor must be used inside <EditorProvider>")
  return api
}
