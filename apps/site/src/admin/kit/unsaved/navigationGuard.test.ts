// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  currentHistoryIndex,
  proceedTo,
  registerNavigationGuard,
  retainNavigationRuntime,
} from "./navigationGuard"
import type { NavTarget } from "./guardMachine"

let dirty = false
const attempts: NavTarget[] = []
let unregister: () => void

/** Stands in for Next's own (bubbling) popstate listener. */
const nextPopstate = vi.fn()

function waitForPopstate() {
  return new Promise<void>((resolve) =>
    window.addEventListener("popstate", () => resolve(), { once: true })
  )
}

/** Pushes entries the way the app router does. */
function pushRoute(path: string) {
  window.history.pushState({ __NA: true }, "", path)
}

function link(href: string, attrs: Record<string, string> = {}) {
  const a = document.createElement("a")
  a.href = href
  for (const [k, v] of Object.entries(attrs)) a.setAttribute(k, v)
  a.textContent = "link"
  document.body.append(a)
  return a
}

function click(el: Element, init: MouseEventInit = {}) {
  const event = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    button: 0,
    ...init,
  })
  el.dispatchEvent(event)
  return event
}

beforeEach(() => {
  dirty = false
  attempts.length = 0
  nextPopstate.mockClear()
  // Next stamps its own state on every entry it creates.
  window.history.replaceState({ __NA: true }, "", "/admin/pages/1")
  unregister = registerNavigationGuard({
    isDirty: () => dirty,
    onAttempt: (target) => attempts.push(target),
  })
  // The router registers its listener after the Admin's host has mounted, and
  // browsers run window listeners in registration order.
  window.addEventListener("popstate", nextPopstate)
})

afterEach(() => {
  unregister()
  window.removeEventListener("popstate", nextPopstate)
  document.body.innerHTML = ""
})

describe("link clicks", () => {
  it("are stopped and reported while the editor is dirty", () => {
    dirty = true
    const bubbled = vi.fn()
    document.body.addEventListener("click", bubbled)
    const event = click(link("/admin/media"))
    expect(event.defaultPrevented).toBe(true)
    expect(bubbled).not.toHaveBeenCalled()
    expect(attempts).toEqual([{ kind: "href", href: "/admin/media" }])
  })

  it("go through untouched while the editor is clean", () => {
    const bubbled = vi.fn()
    document.body.addEventListener("click", bubbled)
    const event = click(link("/admin/media"))
    expect(event.defaultPrevented).toBe(false)
    expect(bubbled).toHaveBeenCalled()
    expect(attempts).toEqual([])
  })

  it("find the link from a child element", () => {
    dirty = true
    const a = link("/admin/media")
    const span = document.createElement("span")
    a.append(span)
    click(span)
    expect(attempts).toEqual([{ kind: "href", href: "/admin/media" }])
  })

  it("open-in-new-tab clicks are left alone", () => {
    dirty = true
    click(link("/admin/media"), { ctrlKey: true })
    click(link("/admin/media", { target: "_blank" }))
    expect(attempts).toEqual([])
  })

  it("stop being intercepted once the guard is unregistered", () => {
    dirty = true
    unregister()
    click(link("/admin/media"))
    expect(attempts).toEqual([])
    unregister = registerNavigationGuard({
      isDirty: () => dirty,
      onAttempt: (t) => attempts.push(t),
    })
  })
})

describe("closing or reloading the tab", () => {
  function beforeUnload() {
    const event = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(event)
    return event
  }

  it("asks the browser to warn while dirty", () => {
    dirty = true
    const event = beforeUnload()
    expect(event.defaultPrevented).toBe(true)
  })

  it("does not warn again once the user has chosen to leave", () => {
    dirty = true
    proceedTo({ kind: "href", href: "/admin/media" }, () => {})
    expect(beforeUnload().defaultPrevented).toBe(false)
  })

  it("does not warn while clean", () => {
    expect(beforeUnload().defaultPrevented).toBe(false)
  })

  it("does not warn after the guard is unregistered", () => {
    dirty = true
    unregister()
    expect(beforeUnload().defaultPrevented).toBe(false)
    unregister = registerNavigationGuard({
      isDirty: () => dirty,
      onAttempt: () => {},
    })
  })
})

describe("guards stack", () => {
  it("the most recently registered guard decides", () => {
    dirty = true
    const inner: NavTarget[] = []
    const off = registerNavigationGuard({
      isDirty: () => true,
      onAttempt: (t) => inner.push(t),
    })
    click(link("/admin/media"))
    expect(inner).toHaveLength(1)
    expect(attempts).toHaveLength(0)
    off()
    click(link("/admin/media"))
    expect(attempts).toHaveLength(1)
  })
})

describe("history tracking", () => {
  it("numbers entries as they are pushed", () => {
    const start = currentHistoryIndex()
    expect(start).toBeTypeOf("number")
    pushRoute("/admin/media")
    expect(currentHistoryIndex()).toBe(start! + 1)
    window.history.replaceState({ __NA: true }, "", "/admin/media?x=1")
    expect(currentHistoryIndex()).toBe(start! + 1)
    expect(window.history.state.__NA).toBe(true)
  })
})

describe("history entries that are not the router's", () => {
  it("are left as they are (no state object is invented for them)", () => {
    window.history.pushState(null, "", "/admin/external")
    expect(window.history.state).toBeNull()
    window.history.replaceState(null, "", "/admin/external?x=1")
    expect(window.history.state).toBeNull()
  })
})

describe("back and forward", () => {
  it("pass through to the router while clean", async () => {
    pushRoute("/admin/media")
    const popped = waitForPopstate()
    window.history.back()
    await popped
    expect(nextPopstate).toHaveBeenCalledTimes(1)
    expect(window.location.pathname).toBe("/admin/pages/1")
  })

  it("are held back, and the URL restored, while dirty", async () => {
    pushRoute("/admin/media")
    dirty = true
    window.history.back()
    // First the back itself, then our revert to where the user was.
    await vi.waitFor(() => expect(attempts).toHaveLength(1))
    await vi.waitFor(() =>
      expect(window.location.pathname).toBe("/admin/media")
    )
    expect(nextPopstate).not.toHaveBeenCalled()
    expect(attempts).toEqual([{ kind: "history", delta: -1 }])
  })

  it("carry on once the user has decided", async () => {
    pushRoute("/admin/media")
    dirty = true
    window.history.back()
    await vi.waitFor(() => expect(attempts).toHaveLength(1))
    await vi.waitFor(() =>
      expect(window.location.pathname).toBe("/admin/media")
    )
    proceedTo(attempts[0]!, () => {
      throw new Error("history targets do not use the router")
    })
    await vi.waitFor(() =>
      expect(window.location.pathname).toBe("/admin/pages/1")
    )
    expect(nextPopstate).toHaveBeenCalledTimes(1)
  })

  it("steps over several entries in one go", async () => {
    pushRoute("/admin/a")
    pushRoute("/admin/b")
    dirty = true
    window.history.go(-2)
    await vi.waitFor(() => expect(attempts).toHaveLength(1))
    expect(attempts[0]).toEqual({ kind: "history", delta: -2 })
    await vi.waitFor(() => expect(window.location.pathname).toBe("/admin/b"))
    expect(nextPopstate).not.toHaveBeenCalled()
  })
})

describe("proceedTo", () => {
  it("hands href targets to the router", () => {
    const navigate = vi.fn()
    proceedTo({ kind: "href", href: "/admin/media" }, navigate)
    proceedTo({ kind: "href", href: "/admin/x", replace: true }, navigate)
    expect(navigate).toHaveBeenNthCalledWith(1, "/admin/media", false)
    expect(navigate).toHaveBeenNthCalledWith(2, "/admin/x", true)
  })
})

describe("runtime without a guard", () => {
  it("keeps numbering entries when only the host is mounted", () => {
    unregister()
    const release = retainNavigationRuntime()
    const before = currentHistoryIndex()!
    pushRoute("/admin/media")
    expect(currentHistoryIndex()).toBe(before + 1)
    release()
    unregister = registerNavigationGuard({
      isDirty: () => dirty,
      onAttempt: (t) => attempts.push(t),
    })
  })
})
