// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ConfirmDialog } from "./ConfirmDialog"
import { EmptyState } from "./EmptyState"
import { InlineError } from "./InlineError"
import { PageHeader } from "./PageHeader"
import { SkipLink } from "./SkipLink"
import { CardSkeleton, TableSkeleton } from "./skeletons"

afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
})

describe("<PageHeader>", () => {
  it("shows the title as the page's h1, a one-line description and the primary action", () => {
    render(
      <PageHeader
        title="Pages"
        description="Everything visitors can open on your Site."
        action={<button>New Page</button>}
      />
    )
    const heading = screen.getByRole("heading", { level: 1 })
    expect(heading.textContent).toBe("Pages")
    expect(
      screen.getByText("Everything visitors can open on your Site.")
    ).toBeTruthy()
    expect(screen.getByRole("button", { name: "New Page" })).toBeTruthy()
  })

  it("puts the action after the text, so it sits on the right", () => {
    const { container } = render(
      <PageHeader title="Pages" description="d" action={<button>Go</button>} />
    )
    const header = container.querySelector("header")!
    const order = [...header.querySelectorAll("h1, button")].map(
      (el) => el.tagName
    )
    expect(order).toEqual(["H1", "BUTTON"])
  })

  it("works without an action", () => {
    render(<PageHeader title="Brand" description="Who you are." />)
    expect(screen.queryByRole("button")).toBeNull()
  })
})

describe("<EmptyState>", () => {
  it("explains what is missing and offers the primary action", () => {
    render(
      <EmptyState
        title="No Pages yet"
        description="Create your first Page to get started."
        action={<button>New Page</button>}
      />
    )
    expect(screen.getByText("No Pages yet")).toBeTruthy()
    expect(
      screen.getByText("Create your first Page to get started.")
    ).toBeTruthy()
    expect(screen.getByRole("button", { name: "New Page" })).toBeTruthy()
  })
})

describe("<InlineError>", () => {
  it("is announced as an alert", () => {
    render(<InlineError>Path is already used</InlineError>)
    expect(screen.getByRole("alert").textContent).toContain(
      "Path is already used"
    )
  })
})

describe("skeletons", () => {
  it("announce loading once, and hide the placeholder blocks", () => {
    const { container } = render(<TableSkeleton rows={3} columns={4} />)
    const status = screen.getByRole("status")
    expect(status.getAttribute("aria-busy")).toBe("true")
    expect(within(status).getByText("Loading…")).toBeTruthy()
    const blocks = container.querySelectorAll('[data-slot="skeleton"]')
    // header row + 3 rows of 4 cells
    expect(blocks).toHaveLength(4 + 3 * 4)
    expect([...blocks].every((b) => b.closest('[aria-hidden="true"]'))).toBe(
      true
    )
  })

  it("has a card preset with a custom label", () => {
    render(<CardSkeleton label="Loading Dashboard" />)
    expect(screen.getByText("Loading Dashboard")).toBeTruthy()
  })
})

describe("<SkipLink>", () => {
  it("is the first thing keyboard users reach and moves focus to the main region", () => {
    render(
      <>
        <SkipLink />
        <nav>
          <a href="#dashboard">Dashboard</a>
        </nav>
        <main>
          <h1>Pages</h1>
        </main>
      </>
    )
    const link = screen.getByRole("link", { name: "Skip to content" })
    expect(document.body.querySelector("a")).toBe(link)
    fireEvent.click(link)
    expect(document.activeElement).toBe(document.querySelector("main"))
  })

  it("prefers #admin-main when the page provides it", () => {
    render(
      <>
        <SkipLink />
        <main>
          <div id="admin-main">x</div>
        </main>
      </>
    )
    fireEvent.click(screen.getByRole("link", { name: "Skip to content" }))
    expect(document.activeElement?.id).toBe("admin-main")
  })
})

describe("<ConfirmDialog>", () => {
  function Harness({
    onConfirm,
    dependents,
  }: {
    onConfirm: () => Promise<{ ok?: boolean; message?: string } | void>
    dependents?: { kind: string; name: string }[]
  }) {
    const [open, setOpen] = useState(true)
    return (
      <>
        <span data-testid="state">{open ? "open" : "closed"}</span>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Delete Layout “Listings”?"
          confirmLabel="Delete Layout"
          dependents={dependents}
          onConfirm={onConfirm}
        />
      </>
    )
  }

  it("names what depends on the item", async () => {
    render(
      <Harness
        onConfirm={vi.fn()}
        dependents={[
          { kind: "Page", name: "Stays" },
          { kind: "Page", name: "Rentals" },
        ]}
      />
    )
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("Used by 2 Pages.")).toBeTruthy()
    const items = within(dialog).getAllByRole("listitem")
    expect(items.map((i) => i.textContent)).toEqual([
      "Page: Stays",
      "Page: Rentals",
    ])
  })

  it("says so when nothing depends on it", async () => {
    render(<Harness onConfirm={vi.fn()} />)
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("Nothing else uses it.")).toBeTruthy()
    expect(within(dialog).queryByRole("list")).toBeNull()
  })

  it("confirms with a destructive button unless told otherwise", async () => {
    const { rerender } = render(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Delete?"
        confirmLabel="Delete"
        onConfirm={vi.fn()}
      />
    )
    const dialog = await screen.findByRole("alertdialog")
    expect(
      within(dialog).getByRole("button", { name: "Delete" }).className
    ).toContain("text-destructive-text")

    rerender(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Restore?"
        confirmLabel="Restore"
        confirmVariant="default"
        onConfirm={vi.fn()}
      />
    )
    expect(
      within(dialog).getByRole("button", { name: "Restore" }).className
    ).not.toContain("text-destructive-text")
  })

  it("leaves the dependents line out when it can't say who uses the item", async () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Delete this image?"
        description="Anything using it will lose it."
        showDependents={false}
        confirmLabel="Delete image"
        onConfirm={vi.fn()}
      />
    )
    const dialog = await screen.findByRole("alertdialog")
    expect(
      within(dialog).getByText("Anything using it will lose it.")
    ).toBeTruthy()
    expect(
      within(dialog).queryByText(/Nothing else uses it|Used by/)
    ).toBeNull()
  })

  it("caps a long list and says how many more there are", async () => {
    const many = Array.from({ length: 14 }, (_, i) => ({
      kind: "Page",
      name: `P${i}`,
    }))
    render(<Harness onConfirm={vi.fn()} dependents={many} />)
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getAllByRole("listitem")).toHaveLength(11)
    expect(within(dialog).getByText("and 4 more")).toBeTruthy()
  })

  it("cancels without confirming", async () => {
    const onConfirm = vi.fn()
    render(<Harness onConfirm={onConfirm} />)
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }))
    await waitFor(() =>
      expect(screen.getByTestId("state").textContent).toBe("closed")
    )
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("closes after the action succeeded", async () => {
    const onConfirm = vi.fn().mockResolvedValue({ ok: true })
    render(<Harness onConfirm={onConfirm} />)
    fireEvent.click(
      await screen.findByRole("button", { name: "Delete Layout" })
    )
    await waitFor(() =>
      expect(screen.getByTestId("state").textContent).toBe("closed")
    )
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("stays open and shows the error inline when the action failed", async () => {
    const onConfirm = vi
      .fn()
      .mockResolvedValue({ ok: false, message: "A Page still uses it" })
    render(<Harness onConfirm={onConfirm} />)
    fireEvent.click(
      await screen.findByRole("button", { name: "Delete Layout" })
    )
    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain("A Page still uses it")
    expect(screen.getByTestId("state").textContent).toBe("open")
  })

  it("treats a thrown action as a failure", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("Network down"))
    render(<Harness onConfirm={onConfirm} />)
    fireEvent.click(
      await screen.findByRole("button", { name: "Delete Layout" })
    )
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Network down"
    )
  })
})
