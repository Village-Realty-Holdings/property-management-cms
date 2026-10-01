// @vitest-environment jsdom
import { act, render, renderHook, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import { EditorProvider, useEditor, type EditorApi } from "./EditorProvider"
import type { EditorDocument } from "./state"

const page: EditorDocument = {
  kind: "page",
  title: "Home",
  path: "/",
  layout: { mode: "default" },
  blocks: [{ blockType: "richText", id: "a", markdown: "Hi" }],
  seo: { title: "", description: "", image: null },
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <EditorProvider initial={page}>{children}</EditorProvider>
)

describe("useEditor", () => {
  it("exposes the document, and edits, undoes and redoes it", () => {
    const { result } = renderHook(() => useEditor(), { wrapper })
    expect(result.current.isDirty).toBe(false)

    act(() => result.current.setField("title", "About"))
    expect((result.current.doc as { title: string }).title).toBe("About")
    expect(result.current.isDirty).toBe(true)
    expect(result.current.canUndo).toBe(true)

    act(() => result.current.undo())
    expect((result.current.doc as { title: string }).title).toBe("Home")
    expect(result.current.canRedo).toBe(true)

    act(() => result.current.redo())
    expect((result.current.doc as { title: string }).title).toBe("About")
  })

  it("selects, duplicates, moves and removes Blocks", () => {
    const { result } = renderHook(() => useEditor(), { wrapper })
    act(() => result.current.select("a"))
    expect(result.current.selectedId).toBe("a")
    act(() => result.current.duplicateBlock("a"))
    const blocks = () =>
      (result.current.doc as { blocks: { id: string }[] }).blocks
    expect(blocks()).toHaveLength(2)
    act(() => result.current.moveBlock("page", 1, 0))
    expect(blocks()[1]!.id).toBe("a")
    act(() => result.current.removeBlock("a"))
    expect(blocks()).toHaveLength(1)
    act(() => result.current.deselect())
    expect(result.current.selectedId).toBeNull()
  })

  it("opens the Block picker on an insert request, and inserts and selects the chosen Block", async () => {
    Element.prototype.scrollIntoView ??= () => {}
    const user = userEvent.setup()
    let editor!: EditorApi
    function Grab() {
      editor = useEditor()
      return null
    }
    render(
      <EditorProvider initial={page}>
        <Grab />
      </EditorProvider>
    )
    expect(screen.queryByRole("dialog")).toBeNull()

    act(() => editor.onInsertRequest("page", 0))
    expect(screen.getByRole("dialog", { name: /Block/ })).toBeTruthy()
    await user.click(screen.getByRole("option", { name: /^FAQ\b/ }))

    expect(screen.queryByRole("dialog")).toBeNull()
    const blocks = (
      editor.doc as { blocks: { id: string; blockType: string }[] }
    ).blocks
    expect(blocks.map((b) => b.blockType)).toEqual(["faq", "richText"])
    expect(editor.selectedId).toBe(blocks[0]!.id)
    expect(editor.isDirty).toBe(true)
  })

  it("hands an insert request to the onInsertRequest it was given", () => {
    const onInsertRequest = vi.fn()
    const { result } = renderHook(() => useEditor(), {
      wrapper: ({ children }) => (
        <EditorProvider initial={page} onInsertRequest={onInsertRequest}>
          {children}
        </EditorProvider>
      ),
    })
    result.current.onInsertRequest("page", 1)
    expect(onInsertRequest).toHaveBeenCalledWith("page", 1)
  })

  it("discards to the baseline and marks saved", () => {
    const { result } = renderHook(() => useEditor(), { wrapper })
    act(() => result.current.setField("title", "X"))
    act(() => result.current.discard())
    expect(result.current.isDirty).toBe(false)
    expect((result.current.doc as { title: string }).title).toBe("Home")

    act(() => result.current.setField("title", "Y"))
    act(() => result.current.markSaved(result.current.doc, result.current.doc))
    expect(result.current.isDirty).toBe(false)
  })

  it("throws a helpful error outside a provider", () => {
    expect(() => renderHook(() => useEditor())).toThrow(/EditorProvider/)
  })
})
