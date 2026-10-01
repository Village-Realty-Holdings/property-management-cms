import { CardSkeleton, PageHeaderSkeleton, TableSkeleton } from "@/admin/kit"

export default function LoadingSeo() {
  return (
    <>
      <PageHeaderSkeleton label="Loading SEO…" />
      <div className="flex max-w-3xl flex-col gap-6">
        <CardSkeleton lines={4} label="Loading defaults…" />
        <TableSkeleton
          rows={3}
          columns={3}
          label="Loading Pages needing attention…"
        />
      </div>
    </>
  )
}
