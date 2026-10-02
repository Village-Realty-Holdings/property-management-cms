import { CardSkeleton, PageHeaderSkeleton } from "@/admin/kit"

export default function LoadingReplaceText() {
  return (
    <>
      <PageHeaderSkeleton label="Loading Replace Text…" />
      <div className="flex max-w-3xl flex-col gap-6">
        <CardSkeleton lines={3} label="Loading Text…" />
      </div>
    </>
  )
}
