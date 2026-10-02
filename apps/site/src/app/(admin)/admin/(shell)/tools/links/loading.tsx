import { PageHeaderSkeleton, TableSkeleton } from "@/admin/kit"

export default function LoadingLinks() {
  return (
    <>
      <PageHeaderSkeleton label="Loading Links…" />
      <TableSkeleton columns={4} label="Loading Links" />
    </>
  )
}
