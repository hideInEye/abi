import type { FC } from 'react'
import React, { memo } from 'react'

import type { ModulesProps } from './type'
export type Key = React.Key
const RoleAuth: FC<ModulesProps> = memo(({ onChange, value, treeData }) => {
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
  return <ATree checkable checkedKeys={value} className="h-280px" height={280} treeData={treeData} onCheck={handleChange} />
})

export default RoleAuth
