"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ImagesIcon,
  XIcon,
} from "lucide-react"

import type { Image as ContentImage } from "@workspace/content"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { FeedImage } from "@workspace/site-views/site/feed-image"

export type PhotoGalleryProps = {
  photos: ContentImage[]
  /** The Property's name, for alt text fallbacks and the dialog label. */
  name: string
}

const altOf = (photo: ContentImage, name: string, i: number) =>
  photo.alt?.trim() || `${name}, photo ${i + 1}`

/**
 * The Property's photos: a hero-and-grid mosaic on larger screens, a
 * swipeable scroll-snap strip on phones. Any photo opens a lightbox (a modal
 * <dialog>: Esc closes, arrow keys step through, focus returns on close).
 */
export function PhotoGallery({ photos, name }: PhotoGalleryProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [index, setIndex] = useState<number | null>(null)
  const count = photos.length

  const open = useCallback((i: number) => {
    setIndex(i)
    dialogRef.current?.showModal()
  }, [])
  const close = useCallback(() => dialogRef.current?.close(), [])
  const step = useCallback(
    (delta: number) =>
      setIndex((i) => (i === null ? i : (i + delta + count) % count)),
    [count]
  )

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const onClose = () => setIndex(null)
    dialog.addEventListener("close", onClose)
    return () => dialog.removeEventListener("close", onClose)
  }, [])

  if (count === 0) {
    return (
      <FeedImage
        image={null}
        sizes="100vw"
        aspect="16/9"
        className="rounded-xl"
        placeholderLabel="Photos coming soon"
      />
    )
  }

  const hero = photos[0]!
  const rest = photos.slice(1, 5)
  const current = index === null ? null : photos[index]

  return (
    <>
      {/* Phones: a swipeable strip; the next photo peeks in. */}
      <ul
        aria-label={`Photos of ${name}`}
        className="relative -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:hidden"
      >
        {photos.map((photo, i) => (
          <li
            key={`${photo.url}-${i}`}
            className={cn(
              "shrink-0 snap-center",
              count === 1 ? "w-full" : "w-[86%]"
            )}
          >
            <button
              type="button"
              onClick={() => open(i)}
              className="block w-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
            >
              <span className="sr-only">
                Open photo {i + 1} of {count}
              </span>
              <FeedImage
                image={photo}
                alt={altOf(photo, name, i)}
                sizes="86vw"
                preload={i === 0}
                className="rounded-xl"
              />
            </button>
          </li>
        ))}
      </ul>

      {/* Tablets and up: the hero beside a grid of four. */}
      <div
        className={cn(
          "relative hidden h-[min(34rem,62vh)] gap-2 md:grid",
          rest.length === 0
            ? "grid-cols-1"
            : rest.length === 1
              ? "grid-cols-2"
              : "grid-cols-4 grid-rows-2"
        )}
      >
        <GalleryTile
          photo={hero}
          alt={altOf(hero, name, 0)}
          label={`Open photo 1 of ${count}`}
          onOpen={() => open(0)}
          sizes={
            rest.length === 0 ? "100vw" : "(min-width: 1280px) 640px, 50vw"
          }
          preload
          className={cn(
            "rounded-l-xl",
            rest.length === 0 && "rounded-xl",
            rest.length > 1 && "col-span-2 row-span-2"
          )}
        />
        {rest.map((photo, j) => {
          const i = j + 1
          const corner =
            rest.length === 1
              ? "rounded-r-xl"
              : rest.length === 2
                ? j === 0
                  ? "col-span-2 rounded-tr-xl"
                  : "col-span-2 rounded-br-xl"
                : rest.length === 3
                  ? j === 0
                    ? "col-span-2 rounded-tr-xl"
                    : j === 2
                      ? "rounded-br-xl"
                      : ""
                  : j === 1
                    ? "rounded-tr-xl"
                    : j === 3
                      ? "rounded-br-xl"
                      : ""
          return (
            <GalleryTile
              key={`${photo.url}-${i}`}
              photo={photo}
              alt={altOf(photo, name, i)}
              label={`Open photo ${i + 1} of ${count}`}
              onOpen={() => open(i)}
              sizes="(min-width: 1280px) 320px, 25vw"
              className={corner}
            />
          )
        })}
        {count > 1 && (
          <Button
            variant="outline"
            onClick={() => open(0)}
            className="absolute right-4 bottom-4 h-9 rounded-full bg-background/95 px-4 shadow-sm"
          >
            <ImagesIcon data-icon="inline-start" aria-hidden />
            Show all {count} photos
          </Button>
        )}
      </div>

      <dialog
        ref={dialogRef}
        aria-label={`Photos of ${name}`}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault()
            step(1)
          } else if (event.key === "ArrowLeft") {
            event.preventDefault()
            step(-1)
          }
        }}
        onClick={(event) => {
          // A click on the backdrop (the dialog itself, not its content) closes.
          if (event.target === event.currentTarget) close()
        }}
        className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
      >
        {current && index !== null && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
              <p aria-live="polite" className="text-sm tabular-nums opacity-80">
                {index + 1} / {count}
              </p>
              <button
                type="button"
                onClick={close}
                autoFocus
                className="inline-flex size-10 items-center justify-center rounded-full hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-white/60 focus-visible:outline-none"
              >
                <XIcon aria-hidden className="size-5" />
                <span className="sr-only">Close photos</span>
              </button>
            </div>
            <div
              className="relative min-h-0 flex-1"
              onClick={(event) => {
                if (event.target === event.currentTarget) close()
              }}
            >
              <Image
                key={current.url}
                src={current.url}
                alt={altOf(current, name, index)}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
              {count > 1 && (
                <LightboxStep direction="previous" onClick={() => step(-1)} />
              )}
              <p className="line-clamp-2 min-w-0 flex-1 text-center text-sm opacity-80">
                {current.alt}
              </p>
              {count > 1 && (
                <LightboxStep direction="next" onClick={() => step(1)} />
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  )
}

function GalleryTile({
  photo,
  alt,
  label,
  onOpen,
  sizes,
  preload,
  className,
}: {
  photo: ContentImage
  alt: string
  label: string
  onOpen: () => void
  sizes: string
  preload?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group relative overflow-hidden outline-none focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring/60",
        className
      )}
    >
      <span className="sr-only">{label}</span>
      <FeedImage
        image={photo}
        alt={alt}
        sizes={sizes}
        preload={preload}
        className="aspect-auto h-full transition-[filter] duration-300 group-hover:brightness-90"
      />
    </button>
  )
}

function LightboxStep({
  direction,
  onClick,
}: {
  direction: "previous" | "next"
  onClick: () => void
}) {
  const Icon = direction === "next" ? ChevronRightIcon : ChevronLeftIcon
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-white/25 hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-white/60 focus-visible:outline-none"
    >
      <Icon aria-hidden className="size-5" />
      <span className="sr-only">
        {direction === "next" ? "Next photo" : "Previous photo"}
      </span>
    </button>
  )
}
