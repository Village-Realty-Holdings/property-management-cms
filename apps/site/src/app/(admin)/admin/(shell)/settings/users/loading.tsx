import { PageHeaderSkeleton, TableSkeleton } from "@/admin/kit"

export default function LoadingUsers() {
  return (
    <>
      <PageHeaderSkeleton label="Loading Users…" />
      <TableSkeleton columns={3} label="Loading Users…" />
    </>
  )
}
