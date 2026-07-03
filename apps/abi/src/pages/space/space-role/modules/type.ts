// type.ts
import type { DataNode } from 'antd/es/tree';

export interface ModulesProps {
  onChange?: (value: number[]) => void;
  treeData: DataNode[];
  value?: number[]; // 添加这个属性
}
