// type.ts
import type { DataNode } from 'antd/es/tree'
export type Key = React.Key
export interface ModulesProps {
  onChange?: (
    keys:
      | {
          checked: Key[]
          halfChecked: Key[]
        }
      | Key[],
  ) => void
  open?: boolean
  treeData: DataNode[]
  value?: Key[] // 添加这个属性
}
