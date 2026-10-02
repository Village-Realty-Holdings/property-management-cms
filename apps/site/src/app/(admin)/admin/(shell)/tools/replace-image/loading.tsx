import { CardSkeleton, PageHeaderSkeleton } from "@/admin/kit"

export default function LoadingReplaceImage() {
  return (
    <>
      <PageHeaderSkeleton label="Loading Replace Image…" />
      <div className="flex max-w-3xl flex-col gap-6">
        <CardSkeleton lines={2} label="Loading Images…" />
      </div>
    </>
  )
}
