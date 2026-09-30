import { CardSkeleton, PageHeaderSkeleton } from "@/admin/kit"

export default function LoadingFonts() {
  return (
    <>
      <PageHeaderSkeleton label="Loading Fonts…" />
      <div className="flex max-w-4xl flex-col gap-3">
        <CardSkeleton lines={3} label="Loading your fonts…" />
        <CardSkeleton lines={3} label="Loading built-in fonts…" />
      </div>
    </>
  )
}
