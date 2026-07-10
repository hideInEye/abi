import type { FC } from 'react'
import React, { memo, useEffect, useMemo, useState } from 'react'
import type { DataNode } from 'antd/es/tree'

import type { ModulesProps } from './type'
export type Key = React.Key

function getExpandableKeys(treeData: DataNode[]): Key[] {
  return treeData.flatMap((node) => {
    const children = node.children || []
    if (!children.length) return []

    return [node.key, ...getExpandableKeys(children)]
  })
}

const RoleAuth: FC<ModulesProps> = memo(({ onChange, open, value, treeData }) => {
  const expandableKeys = useMemo(() => getExpandableKeys(treeData), [treeData])
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([])

  useEffect(() => {
    if (!open) return

    setExpandedKeys(expandableKeys)
  }, [expandableKeys, open])

  const handleChange = (
    keys:
      | {
          checked: Key[]
          halfChecked: Key[]
        }
      | Key[],
  ) => {
    onChange?.(keys)
  }
  return (
    <ATree
      checkable
      checkedKeys={value}
      className="h-280px"
      expandedKeys={expandedKeys}
      height={280}
      treeData={treeData}
      onCheck={handleChange}
      onExpand={(keys) => setExpandedKeys(keys)}
    />
  )
})

export default RoleAuth
