import { Fragment } from "react"

import type { ContainerBlock as ContainerBlockData } from "../../payload-types"
import { renderBlock } from "./registry"
import type { BlockContext } from "./types"

/**
 * Container: the Blocks it holds, in order. A Block inside one is the same
 * component as on the Page. The Visual Editor shows them and can't edit them
 * there yet, so they are drawn as the Site draws them.
 */
export function ContainerBlock({
  block,
  context,
}: {
  block: ContainerBlockData
  context: BlockContext
}) {
  const children = block.children ?? []
  if (children.length === 0) return null
  return (
    <div>
      {children.map((child, index) => (
        <Fragment key={child.id ?? index}>
          {renderBlock(child, { ...context, index, editing: false })}
        </Fragment>
      ))}
    </div>
  )
}
