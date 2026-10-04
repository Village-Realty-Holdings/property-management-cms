import { CardSkeleton, PageHeaderSkeleton } from "@/admin/kit"

export default function LoadingThemes() {
  return (
    <>
      <PageHeaderSkeleton label="Loading Themes…" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <CardSkeleton lines={3} label="Loading Theme…" />
        <CardSkeleton lines={3} label="Loading Theme…" />
        <CardSkeleton lines={3} label="Loading Theme…" />
      </div>
    </>
  )
}
