import { describe, expect, it } from "vitest"

import { CLASSIC, HARBOUR } from "../../theme/presets"
import { emptyBlock, type BlockValues } from "../pageForm"
import {
  blocksIn,
  canRedo,
  canUndo,
  createEditorState,
  editorReducer,
  findBlock,
  isEditorDirty,
  type EditorAction,
  type EditorDocument,
  type EditorState,
  type Region,
} from "./state"

const hero = (id: string, heading = "Hello"): BlockValues => ({
  ...(emptyBlock("hero") as Extract<BlockValues, { blockType: "hero" }>),
  id,
  heading,
})
const text = (id: string, markdown = "Body"): BlockValues => ({
  blockType: "richText",
  id,
  markdown,
})

const withoutId = (block: BlockValues): BlockValues => ({
  ...block,
  id: undefined,
})

const pageDoc = (blocks: BlockValues[] = []): EditorDocument => ({
  kind: "page",
  title: "Home",
  path: "/",
  layout: { mode: "default" },
  blocks,
  seo: { title: "", description: "", image: null },
})

const layoutDoc = (): EditorDocument => ({
  kind: "layout",
  name: "Main",
  paths: ["/"],
  isDefault: true,
  header: [hero("h1", "Header")],
  footer: [text("f1", "Footer")],
})

const themeDoc = (): EditorDocument => ({
  kind: "theme",
  inputs: { ...CLASSIC.inputs },
})

function run(state: EditorState, ...actions: EditorAction[]) {
  return actions.reduce(editorReducer, state)
}
const ids = (state: EditorState, region: Region = "page") =>
  blocksIn(state.doc, region).map((b) => b.id)
const titleOf = (state: EditorState) => (state.doc as { title: string }).title
const headingOf = (state: EditorState, region: Region = "page", index = 0) =>
  (blocksIn(state.doc, region)[index] as { heading: string }).heading

describe("createEditorState", () => {
  it("starts clean, with nothing selected and nothing to undo", () => {
    const state = createEditorState(pageDoc([hero("a")]))
    expect(isEditorDirty(state)).toBe(false)
    expect(state.selectedId).toBeNull()
    expect(canUndo(state)).toBe(false)
    expect(canRedo(state)).toBe(false)
  })

  it("gives blocks that arrive without an id one, in the document and the baseline alike", () => {
    const state = createEditorState(pageDoc([withoutId(hero("x"))]))
    expect(ids(state)[0]).toEqual(expect.any(String))
    expect(isEditorDirty(state)).toBe(false)
  })
})

describe("setField", () => {
  it("sets a top-level, a nested and a block field, and marks the document dirty", () => {
    let state = createEditorState(pageDoc([hero("a")]))
    state = run(
      state,
      { type: "setField", path: "title", value: "About" },
      { type: "setField", path: "seo.description", value: "Desc" },
      { type: "setField", path: "blocks.0.heading", value: "New" },
      { type: "setField", path: "blocks.0.cta.label", value: "Go" }
    )
    const doc = state.doc as Extract<EditorDocument, { kind: "page" }>
    expect(doc.title).toBe("About")
    expect(doc.seo.description).toBe("Desc")
    expect((doc.blocks[0] as { heading: string }).heading).toBe("New")
    expect((doc.blocks[0] as { cta: { label: string } }).cta.label).toBe("Go")
    expect(isEditorDirty(state)).toBe(true)
  })

  it("edits the Layout's header and the Theme's inputs", () => {
    const layout = run(createEditorState(layoutDoc()), {
      type: "setField",
      path: "header.0.heading",
      value: "Welcome",
    })
    expect(headingOf(layout, "header")).toBe("Welcome")
    const theme = run(createEditorState(themeDoc()), {
      type: "setField",
      path: "inputs.primary",
      value: "#112233",
    })
    expect((theme.doc as { inputs: { primary: string } }).inputs.primary).toBe(
      "#112233"
    )
  })

  it("does not mutate the previous state", () => {
    const before = createEditorState(pageDoc([hero("a")]))
    const snapshot = structuredClone(before)
    run(
      before,
      { type: "setField", path: "title", value: "X" },
      { type: "setField", path: "blocks.0.heading", value: "Y" }
    )
    expect(before).toEqual(snapshot)
  })

  it("ignores a path that does not exist, the document kind, and prototype paths", () => {
    const state = createEditorState(pageDoc([hero("a")]))
    for (const path of [
      "blocks.5.heading",
      "seo.nope.deeper",
      "kind",
      "__proto__.polluted",
      "blocks.0.__proto__.polluted",
      "",
    ]) {
      expect(run(state, { type: "setField", path, value: "x" }), path).toBe(
        state
      )
    }
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it("records nothing when the value is unchanged", () => {
    const state = createEditorState(pageDoc())
    const next = run(state, { type: "setField", path: "title", value: "Home" })
    expect(next).toBe(state)
    expect(canUndo(next)).toBe(false)
  })

  it("applies a whole preset as one step", () => {
    let state = createEditorState(themeDoc())
    state = run(state, {
      type: "setField",
      path: "inputs",
      value: { ...HARBOUR.inputs },
    })
    expect(state.past).toHaveLength(1)
    state = run(state, { type: "undo" })
    expect(state.doc).toEqual(themeDoc())
    expect(canUndo(state)).toBe(false)
  })
})

describe("insertBlock", () => {
  it("inserts at an index, selects the new block and is undoable", () => {
    let state = createEditorState(pageDoc([hero("a"), text("b")]))
    state = run(state, {
      type: "insertBlock",
      region: "page",
      index: 1,
      block: text("new"),
    })
    expect(ids(state)).toEqual(["a", "new", "b"])
    expect(state.selectedId).toBe("new")
    state = run(state, { type: "undo" })
    expect(ids(state)).toEqual(["a", "b"])
    expect(state.selectedId).toBeNull()
  })

  it("clamps the index to the ends", () => {
    let state = createEditorState(pageDoc([hero("a")]))
    state = run(
      state,
      { type: "insertBlock", region: "page", index: 99, block: text("end") },
      { type: "insertBlock", region: "page", index: -3, block: text("start") }
    )
    expect(ids(state)).toEqual(["start", "a", "end"])
  })

  it("gives a block without an id, or with one already in use, a fresh id", () => {
    const bare = withoutId(text("x"))
    let state = createEditorState(pageDoc([hero("a")]))
    state = run(
      state,
      {
        type: "insertBlock",
        region: "page",
        index: 1,
        block: bare,
      },
      { type: "insertBlock", region: "page", index: 2, block: text("a") }
    )
    const all = ids(state)
    expect(new Set(all).size).toBe(3)
    expect(all.every((id) => typeof id === "string" && id.length > 0)).toBe(
      true
    )
  })

  it("adds to a Layout's header or footer, and refuses a region the document lacks", () => {
    let state = createEditorState(layoutDoc())
    state = run(state, {
      type: "insertBlock",
      region: "footer",
      index: 0,
      block: text("f0"),
    })
    expect(ids(state, "footer")).toEqual(["f0", "f1"])
    const page = createEditorState(pageDoc())
    expect(
      run(page, {
        type: "insertBlock",
        region: "header",
        index: 0,
        block: text("z"),
      })
    ).toBe(page)
    const theme = createEditorState(themeDoc())
    expect(
      run(theme, {
        type: "insertBlock",
        region: "page",
        index: 0,
        block: text("z"),
      })
    ).toBe(theme)
  })
})

describe("moveBlock", () => {
  const three = () =>
    createEditorState(pageDoc([hero("a"), text("b"), text("c")]))

  it("moves a block up and down", () => {
    let state = run(three(), {
      type: "moveBlock",
      region: "page",
      from: 0,
      to: 2,
    })
    expect(ids(state)).toEqual(["b", "c", "a"])
    state = run(state, { type: "moveBlock", region: "page", from: 2, to: 1 })
    expect(ids(state)).toEqual(["b", "a", "c"])
  })

  it("is undoable", () => {
    const state = run(
      three(),
      { type: "moveBlock", region: "page", from: 0, to: 1 },
      { type: "undo" }
    )
    expect(ids(state)).toEqual(["a", "b", "c"])
    expect(isEditorDirty(state)).toBe(false)
  })

  it("ignores no-op and out-of-range moves without recording a step", () => {
    const state = three()
    for (const [from, to] of [
      [1, 1],
      [-1, 0],
      [0, 3],
      [3, 0],
    ] as const) {
      expect(
        run(state, { type: "moveBlock", region: "page", from, to }),
        `${from}->${to}`
      ).toBe(state)
    }
  })

  it("keeps the selection on the moved block", () => {
    const state = run(
      three(),
      { type: "select", id: "a" },
      { type: "moveBlock", region: "page", from: 0, to: 2 }
    )
    expect(state.selectedId).toBe("a")
  })
})

describe("duplicateBlock", () => {
  it("inserts a copy with a new id right after the original and selects it", () => {
    let state = createEditorState(pageDoc([hero("a", "One"), text("b")]))
    state = run(state, { type: "duplicateBlock", id: "a" })
    const all = blocksIn(state.doc, "page")
    expect(all).toHaveLength(3)
    expect(all[1]).toMatchObject({ blockType: "hero", heading: "One" })
    expect(all[1]!.id).not.toBe("a")
    expect(all[2]!.id).toBe("b")
    expect(state.selectedId).toBe(all[1]!.id)
  })

  it("makes a deep copy, so editing the copy leaves the original alone", () => {
    let state = createEditorState(pageDoc([hero("a", "One")]))
    state = run(
      state,
      { type: "duplicateBlock", id: "a" },
      { type: "setField", path: "blocks.1.cta.label", value: "Changed" }
    )
    const [original] = blocksIn(state.doc, "page") as {
      cta: { label: string }
    }[]
    expect(original!.cta.label).toBe("")
  })

  it("is undoable, works in a Layout region, and ignores an unknown id", () => {
    let state = createEditorState(layoutDoc())
    state = run(state, { type: "duplicateBlock", id: "h1" })
    expect(ids(state, "header")).toHaveLength(2)
    state = run(state, { type: "undo" })
    expect(ids(state, "header")).toEqual(["h1"])
    expect(run(state, { type: "duplicateBlock", id: "nope" })).toBe(state)
  })

  it("never reuses an id, even after an undo", () => {
    let state = createEditorState(pageDoc([hero("a")]))
    state = run(state, { type: "duplicateBlock", id: "a" })
    const first = ids(state)[1]
    state = run(state, { type: "undo" }, { type: "duplicateBlock", id: "a" })
    expect(ids(state)[1]).not.toBe(first)
  })
})

describe("removeBlock", () => {
  it("removes the block, clears its selection, and is undoable", () => {
    let state = createEditorState(pageDoc([hero("a"), text("b")]))
    state = run(
      state,
      { type: "select", id: "a" },
      { type: "removeBlock", id: "a" }
    )
    expect(ids(state)).toEqual(["b"])
    expect(state.selectedId).toBeNull()
    state = run(state, { type: "undo" })
    expect(ids(state)).toEqual(["a", "b"])
    expect(isEditorDirty(state)).toBe(false)
  })

  it("keeps another block's selection, and ignores an unknown id", () => {
    const start = createEditorState(pageDoc([hero("a"), text("b")]))
    const state = run(
      start,
      { type: "select", id: "b" },
      { type: "removeBlock", id: "a" }
    )
    expect(state.selectedId).toBe("b")
    expect(run(start, { type: "removeBlock", id: "nope" })).toBe(start)
  })
})

describe("select and deselect", () => {
  const start = () => createEditorState(pageDoc([hero("a"), text("b")]))

  it("selects a block that exists and deselects", () => {
    let state = run(start(), { type: "select", id: "b" })
    expect(state.selectedId).toBe("b")
    state = run(state, { type: "deselect" })
    expect(state.selectedId).toBeNull()
  })

  it("ignores an unknown id, and does nothing in Theme mode where Block editing is off", () => {
    const state = start()
    expect(run(state, { type: "select", id: "nope" })).toBe(state)
    const theme = createEditorState(themeDoc())
    expect(run(theme, { type: "select", id: "a" })).toBe(theme)
  })

  it("returns the same state when nothing changes", () => {
    const state = start()
    expect(run(state, { type: "deselect" })).toBe(state)
    const selected = run(state, { type: "select", id: "a" })
    expect(run(selected, { type: "select", id: "a" })).toBe(selected)
  })

  it("is not an undo step and does not make the document dirty", () => {
    const state = run(start(), { type: "select", id: "a" })
    expect(canUndo(state)).toBe(false)
    expect(isEditorDirty(state)).toBe(false)
  })
})

describe("undo and redo", () => {
  it("steps back and forward through several edits", () => {
    let state = createEditorState(pageDoc([hero("a")]))
    state = run(
      state,
      { type: "insertBlock", region: "page", index: 1, block: text("b") },
      { type: "removeBlock", id: "a" },
      { type: "setField", path: "title", value: "X" }
    )
    expect(ids(state)).toEqual(["b"])
    state = run(state, { type: "undo" })
    expect(titleOf(state)).toBe("Home")
    state = run(state, { type: "undo" })
    expect(ids(state)).toEqual(["a", "b"])
    state = run(state, { type: "undo" })
    expect(ids(state)).toEqual(["a"])
    expect(canUndo(state)).toBe(false)
    expect(canRedo(state)).toBe(true)
    state = run(state, { type: "redo" }, { type: "redo" }, { type: "redo" })
    expect(ids(state)).toEqual(["b"])
    expect(titleOf(state)).toBe("X")
    expect(canRedo(state)).toBe(false)
  })

  it("does nothing when a stack is empty", () => {
    const state = createEditorState(pageDoc())
    expect(run(state, { type: "undo" })).toBe(state)
    expect(run(state, { type: "redo" })).toBe(state)
  })

  it("clears the redo stack when a new edit follows an undo", () => {
    let state = createEditorState(pageDoc())
    state = run(
      state,
      { type: "insertBlock", region: "page", index: 0, block: text("a") },
      { type: "undo" }
    )
    expect(canRedo(state)).toBe(true)
    state = run(state, { type: "setField", path: "title", value: "New" })
    expect(canRedo(state)).toBe(false)
    expect(run(state, { type: "redo" })).toBe(state)
  })

  it("keeps redo when the edit turned out to change nothing", () => {
    let state = createEditorState(pageDoc())
    state = run(
      state,
      { type: "setField", path: "title", value: "New" },
      { type: "undo" },
      { type: "setField", path: "title", value: "Home" }
    )
    expect(canRedo(state)).toBe(true)
  })

  it("does not clear redo on a selection change", () => {
    let state = createEditorState(pageDoc([hero("a")]))
    state = run(
      state,
      { type: "setField", path: "title", value: "New" },
      { type: "undo" },
      { type: "select", id: "a" }
    )
    expect(canRedo(state)).toBe(true)
  })

  it("drops a selection whose block the undo removed, and keeps one that survives", () => {
    let state = createEditorState(pageDoc([hero("a")]))
    state = run(state, {
      type: "insertBlock",
      region: "page",
      index: 1,
      block: text("b"),
    })
    expect(state.selectedId).toBe("b")
    state = run(state, { type: "undo" })
    expect(state.selectedId).toBeNull()
    state = run(state, { type: "select", id: "a" }, { type: "redo" })
    expect(state.selectedId).toBe("a")
  })

  it("keeps a bounded history", () => {
    let state = createEditorState(pageDoc())
    for (let i = 0; i < 150; i++) {
      state = run(state, {
        type: "insertBlock",
        region: "page",
        index: 0,
        block: text(`b${i}`),
      })
    }
    expect(state.past).toHaveLength(100)
    for (let i = 0; i < 150; i++) state = run(state, { type: "undo" })
    expect(ids(state)).toHaveLength(50)
  })
})

describe("typing coalesces", () => {
  const typed = (state: EditorState, path: string, value: string) =>
    run(state, { type: "setField", path, value })

  it("turns a run of edits to one field into one undo step", () => {
    let state = createEditorState(pageDoc())
    for (const v of ["H", "Ho", "Hom", "Home!"])
      state = typed(state, "title", v)
    expect(state.past).toHaveLength(1)
    state = run(state, { type: "undo" })
    expect(titleOf(state)).toBe("Home")
    expect(canUndo(state)).toBe(false)
  })

  it("starts a new step when the field changes", () => {
    let state = createEditorState(pageDoc())
    state = typed(
      typed(typed(state, "title", "A"), "path", "/a"),
      "title",
      "AB"
    )
    expect(state.past).toHaveLength(3)
  })

  it("starts a new step after another kind of edit, an undo, or a selection", () => {
    let state = createEditorState(pageDoc([hero("a")]))
    state = typed(state, "title", "A")
    state = run(state, { type: "duplicateBlock", id: "a" })
    state = typed(state, "title", "AB")
    expect(state.past).toHaveLength(3)

    state = run(state, { type: "undo" }, { type: "redo" })
    state = typed(state, "title", "ABC")
    expect(state.past).toHaveLength(4)

    state = run(state, { type: "select", id: "a" })
    state = typed(state, "title", "ABCD")
    expect(state.past).toHaveLength(5)
  })

  it("starts a new step after the document is saved", () => {
    let state = createEditorState(pageDoc())
    state = typed(state, "title", "A")
    state = run(state, { type: "markSaved", doc: state.doc, sent: state.doc })
    state = typed(state, "title", "AB")
    expect(state.past).toHaveLength(2)
  })

  it("coalesces block fields per path, and undo restores the value from before typing", () => {
    let state = createEditorState(pageDoc([hero("a", "Hi")]))
    for (const v of ["Hel", "Hell", "Hello"]) {
      state = typed(state, "blocks.0.heading", v)
    }
    expect(state.past).toHaveLength(1)
    state = run(state, { type: "undo" })
    expect(headingOf(state)).toBe("Hi")
  })

  it("keeps the redo stack cleared while typing continues", () => {
    let state = createEditorState(pageDoc())
    state = run(
      state,
      { type: "setField", path: "path", value: "/x" },
      { type: "undo" }
    )
    state = typed(typed(state, "title", "A"), "title", "AB")
    expect(canRedo(state)).toBe(false)
  })
})

describe("discard", () => {
  it("returns to the saved baseline, clean, with nothing to undo", () => {
    const original = pageDoc([hero("a")])
    let state = createEditorState(original)
    state = run(
      state,
      { type: "setField", path: "title", value: "X" },
      { type: "removeBlock", id: "a" },
      { type: "discard" }
    )
    expect(state.doc).toEqual(createEditorState(original).doc)
    expect(isEditorDirty(state)).toBe(false)
    expect(canUndo(state)).toBe(false)
    expect(canRedo(state)).toBe(false)
    expect(state.selectedId).toBeNull()
  })

  it("returns to the last saved document, not the first", () => {
    let state = createEditorState(pageDoc())
    state = run(state, { type: "setField", path: "title", value: "Saved" })
    state = run(state, { type: "markSaved", doc: state.doc, sent: state.doc })
    state = run(state, { type: "setField", path: "title", value: "Unsaved" })
    state = run(state, { type: "discard" })
    expect(titleOf(state)).toBe("Saved")
  })
})

describe("markSaved and dirty tracking", () => {
  it("is dirty after an edit and clean after markSaved", () => {
    let state = createEditorState(pageDoc())
    state = run(state, { type: "setField", path: "title", value: "X" })
    expect(isEditorDirty(state)).toBe(true)
    state = run(state, { type: "markSaved", doc: state.doc, sent: state.doc })
    expect(isEditorDirty(state)).toBe(false)
  })

  it("is clean again when edits are put back, and dirty when undo goes past a save", () => {
    let state = createEditorState(pageDoc())
    state = run(
      state,
      { type: "setField", path: "title", value: "X" },
      { type: "setField", path: "path", value: "/x" },
      { type: "setField", path: "path", value: "/" },
      { type: "setField", path: "title", value: "Home" }
    )
    expect(isEditorDirty(state)).toBe(false)

    state = run(state, { type: "setField", path: "title", value: "Y" })
    state = run(state, { type: "markSaved", doc: state.doc, sent: state.doc })
    state = run(state, { type: "undo" })
    expect(isEditorDirty(state)).toBe(true)
    state = run(state, { type: "redo" })
    expect(isEditorDirty(state)).toBe(false)
  })

  it("takes what the server stored: the document becomes it, without an undo step", () => {
    let state = createEditorState(pageDoc([hero("a")]))
    state = run(state, { type: "setField", path: "title", value: "X" })
    const past = state.past.length
    const stored = {
      ...(state.doc as object),
      title: "X (stored)",
    } as EditorDocument
    state = run(state, { type: "markSaved", doc: stored, sent: state.doc })
    expect(titleOf(state)).toBe("X (stored)")
    expect(isEditorDirty(state)).toBe(false)
    expect(state.past).toHaveLength(past)
  })

  it("keeps an edit that arrives while the save is in flight, dirty against the new baseline", () => {
    let state = createEditorState(pageDoc([hero("a")]))
    state = run(state, { type: "setField", path: "title", value: "Sent" })
    const sent = state.doc
    // The Staff User keeps typing while the save is on its way.
    state = run(state, { type: "setField", path: "path", value: "/later" })
    const past = state.past
    state = run(state, { type: "markSaved", doc: sent, sent })
    expect((state.doc as { path: string }).path).toBe("/later")
    expect(titleOf(state)).toBe("Sent")
    expect(state.baseline).toEqual(sent)
    expect(isEditorDirty(state)).toBe(true)
    expect(state.past).toEqual(past)
    // Undoing the late edit lands exactly on what was saved.
    state = run(state, { type: "undo" })
    expect(state.doc).toEqual(sent)
    expect(isEditorDirty(state)).toBe(false)
  })

  it("keeps the in-flight edits when the stored document differs from what was sent", () => {
    let state = createEditorState(pageDoc([hero("a")]))
    state = run(state, { type: "setField", path: "title", value: "Sent" })
    const sent = state.doc
    state = run(state, { type: "setField", path: "title", value: "Sent, more" })
    const stored = {
      ...(sent as object),
      title: "Sent (stored)",
    } as EditorDocument
    state = run(state, { type: "markSaved", doc: stored, sent })
    expect(titleOf(state)).toBe("Sent, more")
    expect(state.baseline).toEqual(stored)
    expect(isEditorDirty(state)).toBe(true)
  })

  it("drops a selection the stored document no longer has", () => {
    let state = createEditorState(pageDoc([hero("a")]))
    state = run(state, { type: "select", id: "a" })
    state = run(state, {
      type: "markSaved",
      doc: pageDoc([hero("server-id")]),
      sent: state.doc,
    })
    expect(state.selectedId).toBeNull()
  })

  it("does not count moving the selection as a change", () => {
    let state = createEditorState(pageDoc([hero("a")]))
    state = run(state, { type: "select", id: "a" }, { type: "deselect" })
    expect(isEditorDirty(state)).toBe(false)
  })
})

describe("findBlock", () => {
  it("locates a block's region and index in any region", () => {
    const state = createEditorState(layoutDoc())
    expect(findBlock(state.doc, "f1")).toMatchObject({
      region: "footer",
      index: 0,
    })
    expect(findBlock(state.doc, "h1")).toMatchObject({
      region: "header",
      index: 0,
    })
    expect(findBlock(state.doc, "nope")).toBeNull()
  })
})
