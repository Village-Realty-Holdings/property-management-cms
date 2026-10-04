import { CardSkeleton, PageHeaderSkeleton } from "@/admin/kit"

export default function LoadingStarterKits() {
  return (
    <>
      <PageHeaderSkeleton label="Loading Starter Kits…" />
      <div className="flex max-w-3xl flex-col gap-6">
        <CardSkeleton lines={4} label="Loading Starter Kits…" />
      </div>
    </>
  )
}
