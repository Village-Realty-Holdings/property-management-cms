"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"

import { displayFont } from "../display"

/**
 * Dev-only demo (see app/(site)/dev/theme-sample): the ui components a Theme
 * restyles, including a dialog and a sheet, whose content is portalled out of
 * the Site's wrapper. The Theme acceptance tests open them to prove the
 * variables at :root reach portalled content.
 */
export function ThemeSampleTriggers() {
  return (
    <section
      aria-labelledby="theme-sample-heading"
      className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-(--section-y) sm:px-6 lg:px-8"
    >
      <h2
        id="theme-sample-heading"
        data-sample="heading"
        className={`${displayFont} text-3xl`}
      >
        Components on the Theme
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        <Button data-sample="button">Primary button</Button>
        <Button variant="accent" data-sample="button-accent">
          Accent button
        </Button>
        <Button variant="outline" data-sample="button-outline">
          Outline button
        </Button>
        <Input
          data-sample="input"
          aria-label="Sample input"
          placeholder="Sample input"
          className="max-w-56"
        />
      </div>
      <Card data-sample="card" className="max-w-md">
        <CardHeader>
          <CardTitle>Sample card</CardTitle>
          <CardDescription>
            Corners and shadow come from the Theme.
          </CardDescription>
        </CardHeader>
        <CardContent>Cards read the card tokens.</CardContent>
      </Card>
      <div className="flex flex-wrap items-center gap-3">
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="outline" />}>
            Open dialog
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sample dialog</AlertDialogTitle>
              <AlertDialogDescription>
                This dialog is portalled out of the Site, so it is themed by the
                variables at the document root.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>
            Open sheet
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Sample sheet</SheetTitle>
              <SheetDescription>
                This sheet is portalled out of the Site as well.
              </SheetDescription>
            </SheetHeader>
            <SheetFooter>
              <Button data-sample="sheet-button">Sheet button</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </section>
  )
}
