import React from 'react'

import { Card, CardPostData } from '@/components/Card'

export type Props = {
  posts: CardPostData[]
}

export const CollectionArchive: React.FC<Props> = ({ posts }) => {
  return (
    <div className="container">
      <div className="grid gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {posts?.map((post, index) => {
          if (typeof post !== 'object' || post === null) return null
          return <Card className="h-full" key={index} doc={post} relationTo="posts" showCategories />
        })}
      </div>
    </div>
  )
}
