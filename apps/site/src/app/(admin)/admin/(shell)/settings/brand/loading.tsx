import { CardSkeleton, PageHeaderSkeleton } from "@/admin/kit"

export default function LoadingBrand() {
  return (
    <>
      <PageHeaderSkeleton label="Loading Brand…" />
      <div className="flex max-w-3xl flex-col gap-6">
        <CardSkeleton lines={3} label="Loading Identity…" />
        <CardSkeleton lines={3} label="Loading Contact…" />
        <CardSkeleton lines={2} label="Loading Social…" />
      </div>
    </>
  )
}
