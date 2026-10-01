// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, describe, expect, it } from "vitest"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/carousel"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

// jsdom has none of these; Embla and cmdk read them.
beforeAll(() => {
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  Object.assign(globalThis, {
    ResizeObserver: Observer,
    IntersectionObserver: Observer,
  })
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
    onchange: null,
  })) as typeof window.matchMedia
  Element.prototype.scrollIntoView ??= () => {}
})

afterEach(cleanup)

describe("shared UI primitives", () => {
  it("opens and closes an accordion item", async () => {
    const user = userEvent.setup()
    render(
      <Accordion>
        <AccordionItem value="pets">
          <AccordionTrigger>Are pets allowed?</AccordionTrigger>
          <AccordionContent>Yes, with a small fee.</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    const trigger = screen.getByRole("button", { name: "Are pets allowed?" })
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    await user.click(trigger)
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    expect(screen.getByText("Yes, with a small fee.")).toBeTruthy()
  })

  it("mounts a carousel with its slides and controls", () => {
    render(
      <Carousel aria-label="Featured rentals">
        <CarouselContent>
          <CarouselItem>Beach house</CarouselItem>
          <CarouselItem>Loft</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    )
    expect(
      screen.getByRole("region", { name: "Featured rentals" })
    ).toBeTruthy()
    expect(screen.getAllByRole("group")).toHaveLength(2)
    expect(screen.getByRole("button", { name: /previous/i })).toBeTruthy()
    expect(screen.getByRole("button", { name: /next/i })).toBeTruthy()
  })

  it("opens a command dialog and filters its items", async () => {
    const user = userEvent.setup()
    render(
      <CommandDialog open title="Go to" description="Pick a Page">
        <Command>
          <CommandInput placeholder="Search Pages" />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup heading="Pages">
              <CommandItem>Home</CommandItem>
              <CommandItem>Stays</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    )
    expect(await screen.findByRole("dialog")).toBeTruthy()
    await user.type(screen.getByPlaceholderText("Search Pages"), "sta")
    await waitFor(() => expect(screen.queryByText("Home")).toBeNull())
    expect(screen.getByText("Stays")).toBeTruthy()
  })

  it("switches tabs", async () => {
    const user = userEvent.setup()
    render(
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="style">Style</TabsTrigger>
        </TabsList>
        <TabsContent value="content">Content panel</TabsContent>
        <TabsContent value="style">Style panel</TabsContent>
      </Tabs>
    )
    expect(screen.getByText("Content panel")).toBeTruthy()
    await user.click(screen.getByRole("tab", { name: "Style" }))
    expect(screen.getByText("Style panel")).toBeTruthy()
    expect(screen.queryByText("Content panel")).toBeNull()
  })
})
